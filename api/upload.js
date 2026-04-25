import Busboy from 'busboy';
import { connectToDatabase } from './_shared/db.js';
import { Graph } from './_shared/models.js';
import { callAIWithRetry, callGroqRaw } from './_shared/groq.js';

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60, // PDF analysis can take a while
};

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    let fileBuffer = null;
    let fileOriginalName = '';
    const bb = Busboy({ headers: req.headers });
    bb.on('file', (_fieldname, stream, info) => {
      fileOriginalName = info.filename || 'document.pdf';
      const chunks = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });
    bb.on('field', (name, val) => { fields[name] = val; });
    bb.on('finish', () => resolve({ fields, fileBuffer, fileOriginalName }));
    bb.on('error', reject);
    req.pipe(bb);
  });
}

function extractJson(text) {
  try { return JSON.parse(text); } catch (e) {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw e;
  }
}

function chunkText(text, size = 80000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks;
}

async function analyzeChunk(chunk, idx) {
  const prompt = `Analyze this text (part ${idx+1}) and return ONLY raw JSON.\n{\n"nodes": [{ "id": "unique_string", "label": "Short Concept Name", "type": "core" | "major" | "minor", "category": "primary" | "secondary" | "tertiary", "desc": "One sentence explanation", "importance": 1-10, "parentId": "optional_id_of_parent_node" }],\n"edges": [{ "from": "node_id", "to": "node_id", "label": "relation", "importance": 1-10 }]\n}\nRules:\n- Node labels must be 2-4 words max\n- Node IDs must be unique strings\n- EXTRACT 50-80 concepts per chunk.\n- Connect almost every node to at least one parent.\n- Use importance to distinguish foundational vs granular nodes.\nText: ${chunk}`;
  const text = await callAIWithRetry(() => callGroqRaw([
    { role: 'system', content: 'You are a specialized Knowledge Graph Extractor. Your output MUST be valid JSON only.' },
    { role: 'user', content: prompt },
  ], { maxTokens: 8192, temperature: 0.1 }));
  return extractJson(text);
}

async function generateSummary(text) {
  const prompt = `Analyze this academic text and return ONLY raw JSON for document metadata.\n{\n"title": "Exact Title of the Book/PDF or Subject",\n"description": "Three sentence extremely detailed academic summary",\n"complexity": 1-10,\n"category": "Broad Scientific/Academic Field",\n"roadmap": [\n{ "number": "01", "title": "Foundation chapter", "status": "completed", "desc": "Context from PDF" },\n{ "number": "02", "title": "Intermediate chapter", "status": "completed", "desc": "Context from PDF" },\n{ "number": "★", "title": "Core Advanced Topic", "status": "in-progress", "desc": "Main focus" },\n{ "number": "04", "title": "Final specialization", "status": "locked", "desc": "Final conclusions" },\n{ "number": "05", "title": "Extended Mastery", "status": "locked", "desc": "Post-text applications" }\n],\n"relatedModules": [\n{ "icon": "auto_stories", "title": "Domain A", "desc": "Detailed connection" },\n{ "icon": "psychology", "title": "Domain B", "desc": "Detailed connection" },\n{ "icon": "hub", "title": "Domain C", "desc": "Detailed connection" },\n{ "icon": "science", "title": "Domain D", "desc": "Detailed connection" }\n]\n}\nText: ${text.slice(0, 40000)}`;
  const content = await callAIWithRetry(() => callGroqRaw([
    { role: 'system', content: 'You are a specialized Knowledge Graph Extractor. Your output MUST be valid JSON only.' },
    { role: 'user', content: prompt },
  ], { maxTokens: 4096, temperature: 0.2 }));
  return extractJson(content);
}

async function generateQuiz(text) {
  const prompt = `Analyze this text and generate a 5-question multiple choice quiz. Return ONLY raw JSON.\n{\n"questions": [{ "question": "Clear question?", "options": ["A","B","C","D"], "correct": 0, "explanation": "Why." }]\n}\nText: ${text.slice(0, 50000)}`;
  const content = await callAIWithRetry(() => callGroqRaw([
    { role: 'system', content: 'You are a specialized Educational Assistant. Your output MUST be valid JSON only.' },
    { role: 'user', content: prompt },
  ], { maxTokens: 4096, temperature: 0.3 }));
  try { return extractJson(content).questions || []; } catch { return []; }
}

function mergeGraphData(chunks) {
  const nodeMap = new Map();
  const edges = [];
  let idCounter = 1;
  chunks.forEach(chunk => {
    const idRemap = {};
    (chunk.nodes || []).forEach(node => {
      const key = node.label.toLowerCase().trim();
      if (!nodeMap.has(key)) {
        const newId = `c${idCounter++}`;
        idRemap[node.id] = newId;
        nodeMap.set(key, { ...node, id: newId });
      } else {
        const existing = nodeMap.get(key);
        idRemap[node.id] = existing.id;
        if (node.importance > (existing.importance || 0)) nodeMap.set(key, { ...existing, ...node, id: existing.id });
      }
    });
    (chunk.edges || []).forEach(edge => {
      const fromId = idRemap[edge.from], toId = idRemap[edge.to];
      if (fromId && toId && fromId !== toId) {
        const exists = edges.find(e => (e.source===fromId && e.target===toId) || (e.source===toId && e.target===fromId));
        if (!exists) edges.push({ source: fromId, target: toId, label: edge.label, importance: edge.importance || 1 });
        else if (edge.importance > (exists.importance || 0)) exists.importance = edge.importance;
      }
    });
  });
  return { nodes: Array.from(nodeMap.values()), edges };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  await connectToDatabase();

  let parsed;
  try { parsed = await parseMultipart(req); } catch { return res.status(400).json({ success: false, error: 'Failed to parse upload' }); }
  const { fields, fileBuffer, fileOriginalName } = parsed;
  if (!fileBuffer) return res.status(400).json({ success: false, error: 'No file uploaded' });

  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const pdfParse = require('pdf-parse');

    const data = await pdfParse(fileBuffer);
    const extractedText = data.text;
    if (!extractedText) return res.status(400).json({ success: false, error: 'Text extraction failed' });

    const metadata = await generateSummary(extractedText);
    const quiz = await generateQuiz(extractedText);
    metadata.quiz = quiz;

    const chunks = chunkText(extractedText);
    const chunkResults = [];
    for (let i = 0; i < chunks.length; i++) {
      chunkResults.push(await analyzeChunk(chunks[i], i));
    }
    const mergedGraph = mergeGraphData(chunkResults);

    await Graph.create({ filename: fileOriginalName, graph: mergedGraph, metadata, userEmail: fields.userEmail || null });
    return res.json({ success: true, graph: mergedGraph, metadata, filename: fileOriginalName });
  } catch (err) {
    console.error('Upload Error:', err);
    let msg = 'Processing failed. Please try again.';
    if (err.message?.includes('GROQ_API_KEY is missing')) msg = 'Groq API key is missing.';
    else if (err.message?.toLowerCase().includes('insufficient')) msg = 'Groq API quota exhausted.';
    else if (err.status === 429) msg = 'Rate limit reached. Please wait.';
    return res.status(500).json({ success: false, error: msg });
  }
}
