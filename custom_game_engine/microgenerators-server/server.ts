/**
 * Microgenerators API Server
 *
 * Standalone server for microgenerator tools.
 * Each microgenerator is a separate HTML page that can be embedded.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProxyLLMProvider } from '@ai-village/llm';
import { SpellLabMicrogenerator } from '../packages/core/src/microgenerators/SpellLabMicrogenerator.js';
import { CulinaryMicrogenerator } from '../packages/core/src/microgenerators/CulinaryMicrogenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize LLM provider (connects to metrics server at localhost:8766)
const llmProvider = new ProxyLLMProvider('http://localhost:8766');

// Initialize microgenerators
const spellLabMicrogenerator = new SpellLabMicrogenerator(llmProvider);
const culinaryMicrogenerator = new CulinaryMicrogenerator(llmProvider);

const app = express();
const PORT = process.env.MICROGEN_PORT || 3100;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// API Routes
// ============================================================================

/**
 * POST /api/riddle/generate
 * Test and forge a riddle
 */
app.post('/api/riddle/generate', async (req, res) => {
  try {
    const { creator, tags, data } = req.body;

    // Create the riddle content
    const riddle = {
      id: `riddle:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
      type: 'riddle',
      creator,
      tags,
      lore: `A riddle crafted by ${creator.name}, God of ${creator.godOf}. "${data.question.substring(0, 50)}..."`,
      data: {
        question: data.question,
        correctAnswer: data.correctAnswer,
        alternativeAnswers: data.alternativeAnswers || [],
        difficulty: data.difficulty,
        context: {
          targetName: data.targetName,
        },
        allowLLMJudgment: data.allowLLMJudgment,
      },
      validated: true,
      discoveries: [],
      createdAt: Date.now(),
    };

    // Run LLM tests if requested
    let testResults = null;
    if (data.runTests) {
      testResults = await testRiddleWithLLMs(riddle.data);
    }

    // TODO: Submit to godCraftedQueue when integrated with main game

    res.json({ success: true, riddle, testResults });
  } catch (error) {
    console.error('Error forging riddle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Test a riddle with multiple LLMs
 */
async function testRiddleWithLLMs(riddleData: any) {
  // Models to test with (using Cerebras/Groq via proxy)
  const testModels = [
    { name: 'Qwen 2.5 32B', model: 'qwen-3-32b' },
    { name: 'Llama 3.3 70B', model: 'llama-3.3-70b-versatile' },
    { name: 'Qwen 2.5 72B', model: 'qwen/qwen-2.5-72b-instruct' },
  ];

  const results = [];

  for (const { name, model } of testModels) {
    try {
      console.log(`[RiddleTest] Testing with ${name}...`);

      // Ask the LLM to solve the riddle
      const prompt = `You are solving a riddle. Answer with ONLY your answer, no explanation.

Riddle: ${riddleData.question}

Your answer:`;

      const response = await llmProvider.generate({
        prompt,
        maxTokens: 50,
        temperature: 0.7,
        ...(model && { model } as any), // Add model to request
      });

      const answer = response.text.trim();

      // Check if answer is correct
      const correctAnswers = [
        riddleData.correctAnswer.toLowerCase(),
        ...(riddleData.alternativeAnswers || []).map((a: string) => a.toLowerCase()),
      ];

      const passed = correctAnswers.some(correct =>
        answer.toLowerCase().includes(correct) || correct.includes(answer.toLowerCase())
      );

      results.push({
        model: name,
        answer,
        passed,
        reasoning: passed ? 'Correct answer' : 'Incorrect answer',
      });

      console.log(`[RiddleTest] ${name}: ${passed ? '✅' : '❌'} "${answer}"`);
    } catch (error) {
      console.error(`[RiddleTest] Error testing with ${name}:`, error);
      results.push({
        model: name,
        answer: 'Error: ' + (error as Error).message,
        passed: false,
        reasoning: 'LLM request failed',
      });
    }
  }

  return results;
}

/**
 * POST /api/spell/generate
 * Create a spell through magical experimentation
 */
app.post('/api/spell/generate', async (req, res) => {
  try {
    const { creator, tags, data } = req.body;

    console.log('[SpellLab] Generating spell with techniques:', data.techniques, 'forms:', data.forms);

    // Generate spell using microgenerator
    const spell = await spellLabMicrogenerator.generate({
      creator,
      tags,
      data,
    });

    res.json({ success: true, spell });
  } catch (error) {
    console.error('Error forging spell:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/recipe/generate
 * Create a recipe from ingredient combinations
 */
app.post('/api/recipe/generate', async (req, res) => {
  try {
    const { creator, tags, data } = req.body;

    console.log('[Culinary] Creating recipe with ingredients:', data.ingredients);

    // Validate ingredients
    const validation = culinaryMicrogenerator.validate(data);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.errors.join(', '),
        warnings: validation.warnings,
      });
    }

    // Generate recipe using microgenerator
    const recipe = await culinaryMicrogenerator.generate({
      creator,
      tags,
      data,
    });

    res.json({ success: true, recipe });
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/queue/stats
 * Get god-crafted queue stats
 */
app.get('/api/queue/stats', async (req, res) => {
  try {
    // TODO: Integrate with godCraftedQueue
    const stats = {
      totalEntries: 0,
      byType: {},
      totalCreators: 0,
      totalDiscoveries: 0,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Microgenerator Routes (serve HTML pages)
// ============================================================================

app.get('/riddle-book', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'riddle-book.html'));
});

app.get('/spell-lab', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'spell-lab.html'));
});

app.get('/culinary', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'culinary.html'));
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`🎨 Microgenerators server running on http://localhost:${PORT}`);
  console.log(`📖 Death's Riddle Book: http://localhost:${PORT}/riddle-book`);
  console.log(`✨ Spell Laboratory: http://localhost:${PORT}/spell-lab`);
  console.log(`🍳 Culinary Experiments: http://localhost:${PORT}/culinary`);
});
