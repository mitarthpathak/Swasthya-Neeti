import express from 'express';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import GraphModel from '../models/Graph.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const GROQ_MODEL = 'llama-3.1-8b-instant';

function chunkText(text, size = 100000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

/**
 * Helper to call Groq with built-in retry logic
 */
async function callAIWithRetry(fn, retries = 3, delay = 5000) {
  try {
    return await fn();
  } catch (err) {
    const isRateLimit = err.status === 429 || (err.message && err.message.includes('429'));
    if (isRateLimit && retries > 0) {
      console.log(`Groq rate limit hit. Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callAIWithRetry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw error;
  }
}

async function callGroq(messages, { maxTokens = 4096, temperature = 0.2 } = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is missing from env.');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(errorText || `Groq request failed with ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function analyzeChunk(chunk, chunkIndex) {
  const prompt = `
    Analyze this text (part ${chunkIndex + 1}) and return ONLY raw JSON. Do not include any preamble or extra text.
    
    {
      "nodes": [{ 
        "id": "unique_string", 
        "label": "Short Concept Name", 
        "type": "core" | "major" | "minor",
        "category": "primary" | "secondary" | "tertiary",
        "desc": "One sentence explanation",
        "importance": 1-10,
        "parentId": "optional_id_of_parent_node"
      }],
      "edges": [{ 
        "from": "node_id", 
        "to": "node_id", 
        "label": "relation",
        "importance": 1-10
      }]
    }
    
    Rules:
    - Node labels must be 2-4 words max
    - Node IDs must be unique strings
    - EXTRACT 50-80 concepts per chunk. I want the graph to be EXTREMELY DENSE, HEAVY, AND LOADED.
    - Connect almost every node to at least one parent or related concept.
    - Ensure a deep hierarchy: core concepts lead to multiple major branches, each branching into many minor details.
    - Use 'importance' to distinguish foundational vs granular nodes.
    
    Text: ${chunk}
  `;

  const text = await callAIWithRetry(() =>
    callGroq(
      [
        {
          role: 'system',
          content:
            'You are a specialized Knowledge Graph Extractor. Your output MUST be valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      { maxTokens: 8192, temperature: 0.1 },
    ),
  );

  try {
    return extractJson(text);
  } catch (error) {
    console.error('Failed to parse Groq graph response as JSON:', text);
    throw error;
  }
}

async function generateSummary(text) {
  const prompt = `
    Analyze this academic text and return ONLY raw JSON for document metadata. Do not include any preamble.
    
    {
      "title": "Exact Title of the Book/PDF or Subject",
      "description": "Three sentence extremely detailed academic summary",
      "complexity": 1-10 number,
      "category": "Broad Scientific/Academic Field",
      "roadmap": [
        { "number": "01", "title": "Foundation chapter", "status": "completed", "desc": "Context from PDF" },
        { "number": "02", "title": "Intermediate chapter", "status": "completed", "desc": "Context from PDF" },
        { "number": "★", "title": "Core Advanced Topic", "status": "in-progress", "desc": "The main focus areas found in the text" },
        { "number": "04", "title": "Final specialization", "status": "locked", "desc": "Final conclusions or advanced chapters" },
        { "number": "05", "title": "Extended Mastery", "status": "locked", "desc": "Post-text applications" }
      ],
      "relatedModules": [
        { "icon": "auto_stories", "title": "Domain A", "desc": "Detailed connection" },
        { "icon": "psychology", "title": "Domain B", "desc": "Detailed connection" },
        { "icon": "hub", "title": "Domain C", "desc": "Detailed connection" },
        { "icon": "science", "title": "Domain D", "desc": "Detailed connection" }
      ]
    }
    
    Text: ${text.slice(0, 40000)}
  `;

  const content = await callAIWithRetry(() =>
    callGroq(
      [
        {
          role: 'system',
          content:
            'You are a specialized Knowledge Graph Extractor. Your output MUST be valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      { maxTokens: 4096, temperature: 0.2 },
    ),
  );

  return extractJson(content);
}

async function generateQuiz(text) {
  const prompt = `
    Analyze this text and generate a high-quality 5-question multiple choice quiz to test understanding.
    Return ONLY raw JSON. Do not include any preamble.
    
    {
      "questions": [
        {
          "question": "Clear, challenging question?",
          "options": ["Option 0", "Option 1", "Option 2", "Option 3"],
          "correct": 0,
          "explanation": "Detailed explanation of why the answer is correct."
        }
      ]
    }
    
    Text: ${text.slice(0, 50000)}
  `;

  const content = await callAIWithRetry(() =>
    callGroq(
      [
        {
          role: 'system',
          content: 'You are a specialized Educational Assistant. Your output MUST be valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      { maxTokens: 4096, temperature: 0.3 },
    ),
  );

  try {
    const data = extractJson(content);
    return data.questions || [];
  } catch (e) {
    return [];
  }
}

function mergeGraphData(chunks) {
  const nodeMap = new Map();
  const edges = [];
  let idCounter = 1;

  chunks.forEach((chunk) => {
    const idRemap = {};
    (chunk.nodes || []).forEach(node => {
      const key = node.label.toLowerCase().trim();
      if (!nodeMap.has(key)) {
        const newId = `c${idCounter++}`;
        idRemap[node.id] = newId;
        nodeMap.set(key, { ...node, id: newId });
      } else {
        const existingNode = nodeMap.get(key);
        idRemap[node.id] = existingNode.id;
        // Keep the higher importance and description if they exist
        if (node.importance > (existingNode.importance || 0)) {
            nodeMap.set(key, { ...existingNode, ...node, id: existingNode.id });
        }
      }
    });

    (chunk.edges || []).forEach(edge => {
      const fromId = idRemap[edge.from];
      const toId = idRemap[edge.to];
      if (fromId && toId && fromId !== toId) {
        const exists = edges.find(e => (e.source === fromId && e.target === toId) || (e.source === toId && e.target === fromId));
        if (!exists) {
          edges.push({ source: fromId, target: toId, label: edge.label, importance: edge.importance || 1 });
        } else {
            // Update importance if higher
            if (edge.importance > (exists.importance || 0)) {
                exists.importance = edge.importance;
            }
        }
      }
    });
  });

  return { nodes: Array.from(nodeMap.values()), edges };
}

router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const data = await pdfParse(req.file.buffer);
    const extractedText = data.text;
    if (!extractedText) return res.status(400).json({ success: false, error: 'Text extraction failed' });

    console.log(`Processing with Groq ${GROQ_MODEL}: ${extractedText.length} chars`);

    // 1. Summary
    const metadata = await generateSummary(extractedText);
    
    // 2. Quiz
    const quiz = await generateQuiz(extractedText);
    metadata.quiz = quiz;

    const chunks = chunkText(extractedText, 80000);
    const chunkResults = [];
    for (let i = 0; i < chunks.length; i++) {
        const result = await analyzeChunk(chunks[i], i);
        chunkResults.push(result);
    }

    const mergedGraph = mergeGraphData(chunkResults);

    await GraphModel.create({
      filename: req.file.originalname,
      graph: mergedGraph,
      metadata: metadata,
      userEmail: req.body.userEmail || null
    });

    res.json({ success: true, graph: mergedGraph, metadata: metadata, filename: req.file.originalname });

  } catch (err) {
    console.error('Groq Upload Error:', err);
    let errorMessage = 'Groq processing failed. Please try again.';
    
    if (err.message && err.message.includes('GROQ_API_KEY is missing')) {
      errorMessage = 'Groq API key is missing from env.';
    } else if (err.message && err.message.toLowerCase().includes('insufficient')) {
      errorMessage = 'Groq API credits or quota are exhausted.';
    } else if (err.status === 429) {
      errorMessage = 'Rate limit reached. Please wait a moment and try again.';
    }

    res.status(500).json({ success: false, error: errorMessage });
  }
});

export default router;
