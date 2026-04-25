import express from 'express';
import multer from 'multer';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

function resolveLanguageCode(language = '') {
  const normalized = String(language).trim().toLowerCase();
  const map = {
    english: 'en',
    hindi: 'hi',
    bengali: 'bn',
    marathi: 'mr',
    tamil: 'ta',
    telugu: 'te',
    gujarati: 'gu',
    kannada: 'kn',
    punjabi: 'pa',
    malayalam: 'ml',
  };

  return map[normalized] || undefined;
}

function resolveExtension(mimeType = '', originalName = '') {
  const ext = originalName.split('.').pop()?.toLowerCase();
  if (ext && ['webm', 'mp4', 'ogg', 'wav', 'mp3', 'flac', 'm4a'].includes(ext)) {
    return ext;
  }

  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'mp4';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'mp3';
  if (mimeType.includes('flac')) return 'flac';
  return 'webm';
}

const HALLUCINATION_PHRASES = new Set([
  'thank you',
  'thank you.',
  'thanks.',
  'thanks',
  'thank you for watching',
  'thank you for watching.',
  'thanks for watching.',
  'thanks for watching',
  'bye.',
  'bye',
  'goodbye.',
  'goodbye',
  'you',
  'the end.',
  'the end',
  'subscribe',
  'like and subscribe',
  'please subscribe',
  'please subscribe.',
  'subtitles by',
  'subtitles by the amara.org community',
  'amara.org',
  'music',
  '...',
  '.',
  '',
]);

function normalizeTranscriptText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyHallucination(transcription, rawText = '') {
  const segments = transcription?.segments;
  if (!Array.isArray(segments) || segments.length === 0) {
    return false;
  }

  const normalizedText = normalizeTranscriptText(rawText);
  const wordCount = normalizedText ? normalizedText.split(/\s+/).filter(Boolean).length : 0;

  if (normalizedText.length >= 20 || wordCount >= 4) {
    return false;
  }

  const probabilities = segments
    .map((segment) => (typeof segment.no_speech_prob === 'number' ? segment.no_speech_prob : null))
    .filter((probability) => probability !== null);

  if (probabilities.length === 0) {
    return false;
  }

  const avgNoSpeechProb =
    probabilities.reduce((sum, probability) => sum + probability, 0) / probabilities.length;

  return avgNoSpeechProb > 0.85 && wordCount <= 3;
}

async function requestGroqTranscription({ apiKey, buffer, mimeType, filename, language, prompt }) {
  const formData = new FormData();
  const audioBlob = new Blob([buffer], {
    type: mimeType || 'audio/webm',
  });

  formData.append('file', audioBlob, filename);
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'verbose_json');
  formData.append('temperature', '0');

  if (language) {
    formData.append('language', language);
  }

  if (prompt) {
    formData.append('prompt', prompt);
  }

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  const rawResponse = await response.text();

  if (!rawResponse) {
    throw new Error('Groq transcription API returned an empty response');
  }

  let parsedResponse;

  try {
    parsedResponse = JSON.parse(rawResponse);
  } catch {
    throw new Error(`Groq transcription API returned an invalid response (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(parsedResponse?.error?.message || 'Failed to transcribe audio');
  }

  return parsedResponse;
}

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Audio file is required',
    });
  }

  const fileSizeKB = (req.file.size / 1024).toFixed(1);
  const mimeType = req.file.mimetype || 'audio/webm';
  const originalName = req.file.originalname || 'recording.webm';

  console.log(
    `[Transcribe] Received ${fileSizeKB}KB audio (${mimeType}, name: ${originalName})`,
  );

  if (req.file.size < 1000) {
    return res.status(400).json({
      success: false,
      error: 'Audio recording is too short. Please speak for at least 2 seconds.',
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'GROQ_API_KEY is not configured on the server',
    });
  }

  try {
    const extension = resolveExtension(mimeType, originalName);
    const filename = `recording.${extension}`;
    const language = resolveLanguageCode(req.body?.language);

    console.log(`[Transcribe] Sending ${fileSizeKB}KB as "${filename}" to Groq Whisper API`);

    const attempts = language
      ? [
          { label: `language hint ${language}`, language, prompt: undefined },
          {
            label: 'auto-detect anti-hallucination fallback',
            language: undefined,
            prompt:
              'Transcribe only the exact spoken words. Do not invent polite closings like thank you, thanks, goodbye, or subscribe. If speech is unclear, return only what is actually audible.',
          },
        ]
      : [
          { label: 'auto-detect', language: undefined, prompt: undefined },
          {
            label: 'auto-detect anti-hallucination fallback',
            language: undefined,
            prompt:
              'Transcribe only the exact spoken words. Do not invent polite closings like thank you, thanks, goodbye, or subscribe. If speech is unclear, return only what is actually audible.',
          },
        ];

    let lastRawText = '';
    let filteredHallucinationCount = 0;

    for (const attempt of attempts) {
      console.log(`[Transcribe] Attempting transcription with ${attempt.label}`);

      const transcription = await requestGroqTranscription({
        apiKey,
        buffer: req.file.buffer,
        mimeType,
        filename,
        language: attempt.language,
        prompt: attempt.prompt,
      });

      const rawText = (transcription.text || '').trim();
      const normalizedRawText = normalizeTranscriptText(rawText);
      lastRawText = rawText;
      console.log(
        `[Transcribe] Raw result (${attempt.label}): "${rawText}" (${rawText.length} chars)`,
      );

      if (Array.isArray(transcription.segments)) {
        const probabilities = transcription.segments.map((segment) =>
          typeof segment.no_speech_prob === 'number' ? segment.no_speech_prob.toFixed(3) : '?',
        );
        console.log(
          `[Transcribe] Segment no_speech_probs (${attempt.label}): [${probabilities.join(', ')}]`,
        );
      }

      if (HALLUCINATION_PHRASES.has(rawText.toLowerCase()) || HALLUCINATION_PHRASES.has(normalizedRawText)) {
        console.log(`[Transcribe] Filtered phrase match on ${attempt.label}:`, rawText);
        filteredHallucinationCount += 1;
        continue;
      }

      if (isLikelyHallucination(transcription, rawText)) {
        console.log(`[Transcribe] Filtered high no_speech_prob on ${attempt.label}:`, rawText);
        filteredHallucinationCount += 1;
        continue;
      }

      if (rawText) {
        console.log(`[Transcribe] SUCCESS - returning text (${rawText.length} chars)`);
        return res.json({
          success: true,
          text: rawText,
        });
      }
    }

    if (filteredHallucinationCount > 0) {
      console.log(
        `[Transcribe] All candidate transcripts were filtered as likely hallucinations (${filteredHallucinationCount} filtered attempts)`,
      );
      return res.json({
        success: true,
        text: '',
      });
    }

    console.log('[Transcribe] No usable transcript returned after all attempts');
    return res.json({
      success: true,
      text: lastRawText || '',
    });
  } catch (error) {
    console.error('[Transcribe] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transcribe audio',
    });
  }
});

export default router;
