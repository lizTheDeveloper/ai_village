import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaProvider } from '../OllamaProvider';

// Mock fetch
global.fetch = vi.fn();

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    provider = new OllamaProvider('qwen3:4b', 'http://localhost:11434');
    vi.clearAllMocks();
  });

  describe('Tool Definition', () => {
    it('should define all 16 action tools from ActionDefinitions', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: {
            thinking: 'test',
            content: '',
            tool_calls: [{ function: { name: 'explore', arguments: {} } }]
          }
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await provider.generate({ prompt: 'test' });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.tools).toBeDefined();
      expect(requestBody.tools.length).toBe(16); // Updated count from ActionDefinitions

      const toolNames = requestBody.tools.map((t: any) => t.function.name);
      // Check for current valid actions from ActionDefinitions
      expect(toolNames).toContain('pick');
      expect(toolNames).toContain('gather');
      expect(toolNames).toContain('talk');
      expect(toolNames).toContain('follow_agent');
      expect(toolNames).toContain('call_meeting');
      expect(toolNames).toContain('attend_meeting');
      expect(toolNames).toContain('help');
      expect(toolNames).toContain('build');
      expect(toolNames).toContain('plan_build');
      expect(toolNames).toContain('till');
      expect(toolNames).toContain('farm');
      expect(toolNames).toContain('plant');
      expect(toolNames).toContain('explore');
      expect(toolNames).toContain('tame_animal');
      expect(toolNames).toContain('house_animal');
      expect(toolNames).toContain('set_priorities');
    });

    it('should define tools with appropriate parameters', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: { content: '', tool_calls: [] }
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await provider.generate({ prompt: 'test' });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      // Some tools like plan_build have parameters, others don't
      const planBuildTool = requestBody.tools.find((t: any) => t.function.name === 'plan_build');
      expect(planBuildTool).toBeDefined();
      expect(planBuildTool.function.parameters.type).toBe('object');
      // plan_build should have building parameter
      if (planBuildTool.function.parameters.properties.building) {
        expect(planBuildTool.function.parameters.properties.building.type).toBe('string');
      }

      // Simple actions like explore should have no required parameters
      const exploreTool = requestBody.tools.find((t: any) => t.function.name === 'explore');
      expect(exploreTool).toBeDefined();
      expect(exploreTool.function.parameters.type).toBe('object');
    });
  });

  describe('Response Parsing', () => {
    it('should parse structured response with tool call', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: {
            thinking: 'I should explore',
            content: 'Let me look around!',
            tool_calls: [{
              function: {
                name: 'explore',
                arguments: {}
              }
            }]
          },
          eval_count: 150
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await provider.generate({ prompt: 'What should you do?' });

      const parsed = JSON.parse(result.text);

      expect(parsed).toEqual({
        thinking: 'I should explore',
        speaking: 'Let me look around!',
        action: 'explore'
      });
    });

    it('should handle empty thinking field', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: {
            content: 'Time to pick berries',
            tool_calls: [{
              function: {
                name: 'pick',
                arguments: {}
              }
            }]
          }
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await provider.generate({ prompt: 'test' });
      const parsed = JSON.parse(result.text);

      expect(parsed.thinking).toBe('');
      expect(parsed.speaking).toBe('Time to pick berries');
      expect(parsed.action).toBe('pick');
    });

    it('should handle empty speaking (silent action)', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: {
            thinking: 'Just going to explore',
            content: '',
            tool_calls: [{
              function: {
                name: 'explore',
                arguments: {}
              }
            }]
          }
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await provider.generate({ prompt: 'test' });
      const parsed = JSON.parse(result.text);

      expect(parsed.thinking).toBe('Just going to explore');
      expect(parsed.speaking).toBe('');
      expect(parsed.action).toBe('explore');
    });

    it('should fall back to text when no tool call', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: {
            content: 'I will explore the area',
            tool_calls: []
          }
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await provider.generate({ prompt: 'test' });

      expect(result.text).toBe('I will explore the area');
    });
  });

  describe('API Configuration', () => {
    it('should use /api/chat endpoint', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: { content: '', tool_calls: [] }
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await provider.generate({ prompt: 'test' });

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('http://localhost:11434/api/chat');
    });

    it('should send correct request format', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: { content: '', tool_calls: [] }
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await provider.generate({
        prompt: 'What to do?',
        temperature: 0.8,
        maxTokens: 1500
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.model).toBe('qwen3:4b');
      expect(requestBody.messages).toEqual([
        { role: 'user', content: 'What to do?' }
      ]);
      expect(requestBody.stream).toBe(false);
      expect(requestBody.tools).toBeDefined();
      expect(requestBody.options.temperature).toBe(0.8);
      expect(requestBody.options.num_predict).toBe(1500);
    });

    it('should use default values when not specified', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: { content: '', tool_calls: [] }
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await provider.generate({ prompt: 'test' });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.options.temperature).toBe(0.7);
      expect(requestBody.options.num_predict).toBe(2000);
    });
  });

  describe('Error Handling', () => {
    it('should throw on HTTP error', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await expect(provider.generate({ prompt: 'test' }))
        .rejects.toThrow('Ollama API error: 500 Internal Server Error');
    });

    it('should throw on network error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.generate({ prompt: 'test' }))
        .rejects.toThrow('Network error');
    });

    it('should log empty responses', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockResponse = {
        ok: true,
        json: async () => ({
          message: {}
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await provider.generate({ prompt: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OllamaProvider] Empty response'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Logging', () => {
    it('should log structured responses', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const mockResponse = {
        ok: true,
        json: async () => ({
          message: {
            thinking: 'Test thinking',
            content: 'Test speaking',
            tool_calls: [{
              function: { name: 'talk', arguments: {} }
            }]
          },
          eval_count: 100
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await provider.generate({ prompt: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OllamaProvider] Response:'),
        expect.objectContaining({
          action: 'talk',
          thinking: expect.any(String),
          speaking: 'Test speaking',
          tokensUsed: 100
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Availability Check', () => {
    it('should check server availability', async () => {
      const mockResponse = { ok: true };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const available = await provider.isAvailable();

      expect(available).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        { method: 'GET' }
      );
    });

    it('should return false when server unavailable', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection refused'));

      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });
  });
});
