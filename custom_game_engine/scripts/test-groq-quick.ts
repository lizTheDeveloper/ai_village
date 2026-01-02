import * as dotenv from 'dotenv';
import { OpenAICompatProvider } from '../packages/llm/src/OpenAICompatProvider.js';

dotenv.config();

async function main() {
  console.log('GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);
  console.log('GROQ_MODEL:', process.env.GROQ_MODEL);
  
  const provider = new OpenAICompatProvider(
    process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    'https://api.groq.com/openai/v1',
    process.env.GROQ_API_KEY || ''
  );
  
  console.log('Testing Groq...');
  const result = await provider.generate({ prompt: 'Say hello in one word', maxTokens: 10 });
  console.log('Response:', result.text);
}

main().catch(console.error);
