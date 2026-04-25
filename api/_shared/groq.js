/**
 * Groq AI helper functions — shared by serverless API routes.
 * Copied from server/lib/groq.js with no changes to logic.
 */
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GOOGLE_TRANSLATE_API_URL = 'https://translate.googleapis.com/translate_a/single';

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}

export function getGroqModel() {
  return process.env.GROQ_MODEL || DEFAULT_MODEL;
}

export async function getGroqHealth() {
  return {
    configured: isGroqConfigured(),
    model: getGroqModel(),
  };
}

function extractJson(content) {
  try {
    return JSON.parse(content);
  } catch (error) {
    const match = content.match(/\{[\s\S]*\}$/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw error;
  }
}

function normalizeLanguage(language = 'English') {
  const value = String(language).trim().toLowerCase();
  if (value === 'hindi') {
    return 'hindi';
  }
  return 'english';
}

function buildDurationSuggestions(language = 'English') {
  if (normalizeLanguage(language) === 'hindi') {
    return ['Aaj se', 'Pichhle 2 din se', 'Pichhle 1 hafte se'];
  }
  return ['Since today', 'Since last 2 days', 'Since last week'];
}

function buildGenericSuggestions(language = 'English') {
  if (normalizeLanguage(language) === 'hindi') {
    return ['Haan, yeh lakshan hai', 'Thoda aur bataiye', 'Mujhe kya karna chahiye?'];
  }
  return ['Yes, I have this symptom', 'Tell me a bit more', 'What should I do next?'];
}

function containsDurationQuestion(text = '') {
  const sample = text.toLowerCase();
  return /(how long|since when|from when|duration|kab se|kitne din|kitni der|since)/i.test(sample);
}

function fallbackSuggestedReplies({ language = 'English', assistantReply = '' }) {
  if (containsDurationQuestion(assistantReply)) {
    return buildDurationSuggestions(language);
  }

  return buildGenericSuggestions(language);
}

function resolveGoogleLanguageCode(language = 'English') {
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

  return map[normalized] || 'en';
}

function protectPlaceholders(text = '') {
  const placeholders = [];
  const protectedText = text.replace(/\{[^}]+\}/g, (match) => {
    const token = `__PH_${placeholders.length}__`;
    placeholders.push(match);
    return token;
  });

  return { protectedText, placeholders };
}

function restorePlaceholders(text = '', placeholders = []) {
  return placeholders.reduce(
    (current, placeholder, index) => current.replaceAll(`__PH_${index}__`, placeholder),
    text,
  );
}

async function translateTextWithGoogle(text = '', targetLanguage = 'English') {
  const trimmed = text.trim();
  if (!trimmed) {
    return text;
  }

  const { protectedText, placeholders } = protectPlaceholders(text);
  const languageCode = resolveGoogleLanguageCode(targetLanguage);
  const url = new URL(GOOGLE_TRANSLATE_API_URL);
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'auto');
  url.searchParams.set('tl', languageCode);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', protectedText);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Google translate failed with status ${response.status}`);
  }

  const payload = await response.json().catch(() => null);
  const translated = Array.isArray(payload?.[0])
    ? payload[0].map((item) => (Array.isArray(item) ? item[0] : '')).join('')
    : '';

  if (!translated) {
    throw new Error('Google translate did not return translated text');
  }

  return restorePlaceholders(translated, placeholders);
}

async function translateCopyWithGoogle(value, targetLanguage = 'English') {
  if (typeof value === 'string') {
    return translateTextWithGoogle(value, targetLanguage);
  }

  if (Array.isArray(value)) {
    const translatedItems = await Promise.all(
      value.map((item) => translateCopyWithGoogle(item, targetLanguage)),
    );
    return translatedItems;
  }

  if (value && typeof value === 'object') {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, entryValue]) => {
        const translatedValue = await translateCopyWithGoogle(entryValue, targetLanguage);
        return [key, translatedValue];
      }),
    );
    return Object.fromEntries(entries);
  }

  return value;
}

async function createGroqCompletion({
  messages,
  temperature = 0.4,
  maxTokens = 700,
  responseFormat,
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getGroqModel(),
      temperature,
      max_tokens: maxTokens,
      messages,
      ...(responseFormat ? { response_format: responseFormat } : {}),
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const messageText =
      payload?.error?.message ||
      payload?.message ||
      `Groq request failed with status ${response.status}`;
    throw new Error(messageText);
  }

  if (payload?.usage) {
    console.log(`[Groq Usage] Model: ${payload.model} | Prompt: ${payload.usage.prompt_tokens} | Completion: ${payload.usage.completion_tokens} | Total: ${payload.usage.total_tokens}`);
  }

  return {
    model: payload?.model || getGroqModel(),
    content:
      payload?.choices?.[0]?.message?.content?.trim() ||
      'I am sorry, but I could not generate a response right now.',
  };
}

export async function generateHealthReply({
  message,
  language = 'English',
  history = [],
}) {
  const safeHistory = history
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && item.content)
    .slice(-8);

  const expertInstruction = history.length >= 5
    ? `Since the conversation is getting deeper, you may gracefully offer the user the option to talk to an expert using this number: +1 (581) 701-9840.`
    : `Only provide the expert helpline number (+1 (581) 701-9840) if the user EXPLICITLY asks to talk to an expert, doctor, or helpline. Do not offer it randomly early in the chat.`;

  return createGroqCompletion({
    maxTokens: 500,
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content:
          `You are Swasthya-Neeti, a helpful and conversational AI healthcare assistant. ` +
          `Respond in ${language} unless the user clearly uses another language. ` +
          `CRITICAL RULE: Never write long, large paragraphs. Speak concisely like a human, packing more meaning into very few words. Keep responses short and to the point. ` +
          `Format your responses cleanly using Markdown (use # or ## for headings only if strictly necessary). ` +
          `Use a few relevant emojis to make the response warm and engaging. ` +
          `Provide practical next steps or hydration/rest guidance if relevant, but clearly urge seeking medical attention for danger signs (trouble breathing, chest pain, confusion, etc). ` +
          `Do not claim to be a doctor, and do not prescribe medicine dosages. ` +
          expertInstruction,
      },
      ...safeHistory.map((item) => ({
        role: item.role,
        content: item.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ],
  });
}

export async function translateUiCopy({
  targetLanguage,
  copy,
}) {
  if (!targetLanguage || targetLanguage === 'English') {
    return copy;
  }

  if (isGroqConfigured()) {
    try {
      const response = await createGroqCompletion({
        maxTokens: 2400,
        temperature: 0.2,
        responseFormat: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              `Translate the provided JSON values into ${targetLanguage}. ` +
              `Return valid JSON only. Keep the same keys and structure exactly. ` +
              `Preserve placeholders like {name}. Preserve phone numbers, brand names, and ids. ` +
              `Do not add or remove keys. Translate arrays item-by-item.`,
          },
          {
            role: 'user',
            content: JSON.stringify(copy),
          },
        ],
      });

      return extractJson(response.content);
    } catch (error) {
      console.error('Groq translation failed. Falling back to Google translate:', error);
    }
  }

  return translateCopyWithGoogle(copy, targetLanguage);
}

export async function generateSuggestedReplies({
  language = 'English',
  userMessage,
  assistantReply,
}) {
  try {
    const response = await createGroqCompletion({
      maxTokens: 500,
      temperature: 0.25,
      responseFormat: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            `You generate exactly 3 short suggested user replies for a healthcare chat UI. ` +
            `Return valid JSON only in the shape {"suggestions":["...","...","..."]}. ` +
            `Write them in ${language}. ` +
            `Each suggestion must be short, tappable, and natural, usually 2 to 8 words. ` +
            `Base them on what the assistant just asked or what information is missing. ` +
            `If the assistant asks about duration, options should look like quick answers such as today, 2 days, 1 week. ` +
            `Do not repeat the full question. Do not add numbering.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            userMessage,
            assistantReply,
          }),
        },
      ],
    });

    const parsed = extractJson(response.content);
    const suggestions = Array.isArray(parsed?.suggestions)
      ? parsed.suggestions
          .filter((item) => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 3)
      : [];

    if (suggestions.length === 3) {
      return suggestions;
    }
  } catch (error) {
    console.error('Suggested reply generation fallback:', error);
  }

  return fallbackSuggestedReplies({
    language,
    assistantReply,
  });
}

/**
 * Helper to call Groq with built-in retry logic (used by upload route)
 */
export async function callAIWithRetry(fn, retries = 3, delay = 5000) {
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

/**
 * Raw Groq completion for upload analysis
 */
export async function callGroqRaw(messages, { maxTokens = 4096, temperature = 0.2 } = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is missing from env.');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
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
