#!/usr/bin/env node

/**
 * Test script to figure out how llama-3.3-70b-versatile handles tool calling on Groq
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.argv[2] || '';
const MODEL = 'llama-3.3-70b-versatile';
const BASE_URL = 'https://api.groq.com/openai/v1';

async function testToolCalling() {
  console.log('Testing tool calling with:', MODEL);
  console.log('API:', BASE_URL);
  console.log('---\n');

  // Test 1: Simple tool calling request
  const tools = [
    {
      type: 'function',
      function: {
        name: 'wander',
        description: 'Explore the area, move around randomly',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    },
    {
      type: 'function',
      function: {
        name: 'talk',
        description: 'Start a conversation with a nearby agent',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    },
    {
      type: 'function',
      function: {
        name: 'gather',
        description: 'Gather resources from the environment',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    }
  ];

  const systemMessage = {
    role: 'system',
    content: `You are a helpful assistant. When responding:
1. Think about what to do
2. Say something brief
3. Call one of the action tools

Your response should include both what you say and which action to take.`
  };

  const userMessage = {
    role: 'user',
    content: 'You see Alice nearby and some trees with wood. What do you do?'
  };

  try {
    console.log('Making request with tool_choice: auto...\n');

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [systemMessage, userMessage],
        temperature: 0.7,
        max_tokens: 150,
        tools: tools,
        tool_choice: 'auto'
      })
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('ERROR Response:', response.status, response.statusText);
      console.error('Body:', responseText);
      console.log('\n---\n');

      // Try without tool_choice
      console.log('Retrying without tool_choice parameter...\n');
      const response2 = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [systemMessage, userMessage],
          temperature: 0.7,
          max_tokens: 150,
          tools: tools
        })
      });

      const responseText2 = await response2.text();

      if (!response2.ok) {
        console.error('ERROR Response 2:', response2.status, response2.statusText);
        console.error('Body:', responseText2);
        return;
      }

      const data2 = JSON.parse(responseText2);
      console.log('SUCCESS (without tool_choice)!');
      console.log(JSON.stringify(data2, null, 2));
      return;
    }

    const data = JSON.parse(responseText);
    console.log('SUCCESS!');
    console.log('Full response:');
    console.log(JSON.stringify(data, null, 2));

    console.log('\n---\n');
    console.log('Extracted data:');
    const message = data.choices?.[0]?.message;
    console.log('- Content:', message?.content);
    console.log('- Tool calls:', message?.tool_calls);
    console.log('- Finish reason:', data.choices?.[0]?.finish_reason);

  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Test 2: Without tools (text-based)
async function testWithoutTools() {
  console.log('\n\n=== TEST 2: Without Tools (text-based) ===\n');

  const systemMessage = {
    role: 'system',
    content: `You are a village character. Respond with:
1. Your thought process
2. What you say out loud
3. Your action (choose one: wander, talk, gather, idle)

Format:
Thought: [your thinking]
Speech: [what you say]
Action: [action name]`
  };

  const userMessage = {
    role: 'user',
    content: 'You see Alice nearby and some trees with wood. What do you do?'
  };

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [systemMessage, userMessage],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    const data = await response.json();
    console.log('Response:');
    console.log(data.choices?.[0]?.message?.content);

  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Run tests
(async () => {
  if (!GROQ_API_KEY) {
    console.error('ERROR: GROQ_API_KEY not provided');
    console.error('Usage: node test-tool-calling.js YOUR_API_KEY');
    console.error('   or: GROQ_API_KEY=your-key node test-tool-calling.js');
    process.exit(1);
  }

  await testToolCalling();
  await testWithoutTools();
})();
