import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    // Anthropic SDK doesn't have a direct 'list models' in the same way, 
    // but we can test a simple message to verify the key and connection.
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Connection test. Reply with "pong".' }],
    });
    console.log('Anthropic Connection Success:', response.content[0].text);
  } catch (error) {
    console.error('Error connecting to Anthropic:', error);
  }
}

listModels();
