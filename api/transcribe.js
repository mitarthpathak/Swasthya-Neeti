/**
 * Vercel serverless function for POST /api/transcribe
 *
 * Vercel does NOT run Express/multer, so we must parse multipart form data
 * ourselves. We use the built-in Request/FormData API available in the
 * Vercel Node.js 18+ runtime by opting into the Edge-compatible body parsing.
 *
 * However, the default Vercel Node runtime still gives us (req, res) with
 * a raw body, so we use the `busboy` package for parsing.
 * As a simpler alternative, we forward the raw body to Groq directly.
 *
 * Strategy: read the raw multipart body, extract the audio file manually
 * using the `busboy` library (added to dependencies).
 */
import Busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false, // We need the raw body for multipart parsing
  },
};

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    let fileBuffer = null;
    let fileMimeType = 'audio/webm';
    let fileOriginalName = 'recording.webm';

    const bb = Busboy({ headers: req.headers });

    bb.on('file', (_fieldname, stream, info) => {
      const { filename, mimeType } = info;
      fileOriginalName = filename || fileOriginalName;
      fileMimeType = mimeType || fileMimeType;
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('finish', () => {
      resolve({ fields, fileBuffer, fileMimeType, fileOriginalName });
    });

    bb.on('error', reject);
    req.pipe(bb);
  });
}

function resolveLanguageCode(language = '') {
  const normalized = String(language).trim().toLowerCase();
  const map = { english:'en', hindi:'hi', bengali:'bn', marathi:'mr', tamil:'ta', telugu:'te', gujarati:'gu', kannada:'kn', punjabi:'pa', malayalam:'ml' };
  return map[normalized] || undefined;
}

function resolveExtension(mimeType = '', originalName = '') {
  const ext = originalName.split('.').pop()?.toLowerCase();
  if (ext && ['webm','mp4','ogg','wav','mp3','flac','m4a'].includes(ext)) return ext;
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'mp4';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'mp3';
  if (mimeType.includes('flac')) return 'flac';
  return 'webm';
}

const HALLUCINATION_PHRASES = new Set([
  'thank you','thank you.','thanks.','thanks','thank you for watching','thank you for watching.',
  'thanks for watching.','thanks for watching','bye.','bye','goodbye.','goodbye','you',
  'the end.','the end','subscribe','like and subscribe','please subscribe','please subscribe.',
  'subtitles by','subtitles by the amara.org community','amara.org','music','...','.',''
]);

function normalizeTranscriptText(value = '') {
  return String(value).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
}

function isLikelyHallucination(transcription, rawText = '') {
  const segments = transcription?.segments;
  if (!Array.isArray(segments) || segments.length === 0) return false;
  const normalizedText = normalizeTranscriptText(rawText);
  const wordCount = normalizedText ? normalizedText.split(/\s+/).filter(Boolean).length : 0;
  if (normalizedText.length >= 20 || wordCount >= 4) return false;
  const probs = segments.map(s => typeof s.no_speech_prob === 'number' ? s.no_speech_prob : null).filter(p => p !== null);
  if (probs.length === 0) return false;
  const avg = probs.reduce((a, b) => a + b, 0) / probs.length;
  return avg > 0.85 && wordCount <= 3;
}

async function requestGroqTranscription({ apiKey, buffer, mimeType, filename, language, prompt }) {
  const formData = new FormData();
  const audioBlob = new Blob([buffer], { type: mimeType || 'audio/webm' });
  formData.append('file', audioBlob, filename);
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'verbose_json');
  formData.append('temperature', '0');
  if (language) formData.append('language', language);
  if (prompt) formData.append('prompt', prompt);

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });
  const rawResponse = await response.text();
  if (!rawResponse) throw new Error('Groq transcription API returned an empty response');
  let parsed;
  try { parsed = JSON.parse(rawResponse); } catch { throw new Error(`Groq transcription API returned an invalid response (${response.status})`); }
  if (!response.ok) throw new Error(parsed?.error?.message || 'Failed to transcribe audio');
  return parsed;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  let parsed;
  try {
    parsed = await parseMultipart(req);
  } catch (e) {
    return res.status(400).json({ success: false, error: 'Failed to parse multipart data' });
  }

  const { fields, fileBuffer, fileMimeType, fileOriginalName } = parsed;
  if (!fileBuffer || fileBuffer.length === 0) return res.status(400).json({ success: false, error: 'Audio file is required' });
  if (fileBuffer.length < 1000) return res.status(400).json({ success: false, error: 'Audio recording is too short. Please speak for at least 2 seconds.' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, error: 'GROQ_API_KEY is not configured on the server' });

  try {
    const extension = resolveExtension(fileMimeType, fileOriginalName);
    const filename = `recording.${extension}`;
    const language = resolveLanguageCode(fields.language);

    const attempts = language
      ? [
          { label: `language hint ${language}`, language, prompt: undefined },
          { label: 'auto-detect anti-hallucination fallback', language: undefined, prompt: 'Transcribe only the exact spoken words. Do not invent polite closings like thank you, thanks, goodbye, or subscribe. If speech is unclear, return only what is actually audible.' },
        ]
      : [
          { label: 'auto-detect', language: undefined, prompt: undefined },
          { label: 'auto-detect anti-hallucination fallback', language: undefined, prompt: 'Transcribe only the exact spoken words. Do not invent polite closings like thank you, thanks, goodbye, or subscribe. If speech is unclear, return only what is actually audible.' },
        ];

    let lastRawText = '';
    let filteredCount = 0;

    for (const attempt of attempts) {
      const transcription = await requestGroqTranscription({ apiKey, buffer: fileBuffer, mimeType: fileMimeType, filename, language: attempt.language, prompt: attempt.prompt });
      const rawText = (transcription.text || '').trim();
      const normalized = normalizeTranscriptText(rawText);
      lastRawText = rawText;

      if (HALLUCINATION_PHRASES.has(rawText.toLowerCase()) || HALLUCINATION_PHRASES.has(normalized)) { filteredCount++; continue; }
      if (isLikelyHallucination(transcription, rawText)) { filteredCount++; continue; }
      if (rawText) return res.json({ success: true, text: rawText });
    }

    if (filteredCount > 0) return res.json({ success: true, text: '' });
    return res.json({ success: true, text: lastRawText || '' });
  } catch (error) {
    console.error('[Transcribe] Error:', error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to transcribe audio' });
  }
}
