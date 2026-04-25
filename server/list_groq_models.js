import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function listAnthropicModels() {
  try {
    // Anthropic doesn't have a direct model list API in the SDK, so we'll just check health
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'health check' }],
    });
    console.log('Anthropic operational:', response.id);
  } catch (error) {
    console.error('Error connecting to Anthropic:', error);
  }
}

listAnthropicModels();
