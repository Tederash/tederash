import type { ToolCall } from '../../../shared/tools';
import type { LlmMessage, LlmProvider, LlmResponse } from './types';

export class HeuristicLlmProvider implements LlmProvider {
  id = 'heuristic';
  name = 'Tederash Built-in Agent (Deterministic)';

  async generate(req: {
    systemPrompt: string;
    messages: LlmMessage[];
    signal?: AbortSignal;
  }): Promise<LlmResponse> {
    const lastUserMsg = [...req.messages].reverse().find((m) => m.role === 'user');
    const lastToolMsg = [...req.messages].reverse().find((m) => m.role === 'tool');
    const userText = (lastUserMsg?.content || '').toLowerCase().trim();

    // If we just got a tool response from observe_page or read_text, synthesize an answer:
    if (lastToolMsg) {
      try {
        const toolData = JSON.parse(lastToolMsg.content);

        // Snapshot observation summary
        if (toolData && toolData.elements) {
          const els = toolData.elements as Array<{ ref: string; tag: string; name?: string; role?: string }>;
          const headings = (toolData.headings as string[]) || [];
          const interactiveCount = els.length;

          // If user asked to "find X":
          if (userText.includes('find') || userText.includes('where is')) {
            const query = userText.replace(/find|where is|the/g, '').trim();
            const matched = els.filter((e) => e.name?.toLowerCase().includes(query));
            if (matched.length > 0) {
              const list = matched.map((m) => `• [${m.ref}] "${m.name}" (${m.role || m.tag})`).join('\n');
              return {
                content: `I found ${matched.length} element(s) matching "${query}":\n\n${list}\n\nWould you like me to click one?`,
              };
            }
          }

          // If user asked to "summarize" or "what is this page":
          if (userText.includes('summarize') || userText.includes('what is') || userText.includes('explain') || userText.includes('about')) {
            const headingList = headings.slice(0, 5).map((h) => `• ${h}`).join('\n');
            const sample = (toolData.textSample as string) || '';
            return {
              content: `**Page Summary: ${toolData.title}**\n\n**Key Sections:**\n${headingList || '• General content'}\n\n**Overview:**\n${sample ? `"${sample.slice(0, 250)}…"` : 'Interactive web application.'}\n\n*Interactive elements detected:* ${interactiveCount}. What would you like to do on this page?`,
            };
          }

          return {
            content: `I examined the page "${toolData.title}". It has ${interactiveCount} interactive elements and ${headings.length} headings. How can I help you interact with it?`,
          };
        }

        // Read text response
        if (typeof toolData === 'string' && toolData.length > 0) {
          return {
            content: `**Page Content:**\n\n${toolData.slice(0, 1000)}${toolData.length > 1000 ? '… [truncated]' : ''}\n\nWould you like me to read this aloud or simplify any part of it?`,
          };
        }
      } catch {
        // Fall through to standard heuristics
      }
    }

    // 1. Text scaling / font size
    if (userText.includes('increase text') || userText.includes('larger text') || userText.includes('bigger font') || userText.includes('zoom text')) {
      return {
        toolCalls: [
          {
            name: 'set_adaptation',
            args: { textScale: 1.3 },
          },
          {
            name: 'say',
            args: { text: 'Increased text size to 130% for improved readability.' },
          },
        ],
        content: 'I have scaled up the text size to 130%. Let me know if you would like it even larger or smaller.',
      };
    }

    if (userText.includes('decrease text') || userText.includes('smaller text') || userText.includes('reset text')) {
      return {
        toolCalls: [
          {
            name: 'set_adaptation',
            args: { textScale: 1.0 },
          },
        ],
        content: 'Reset text scale to standard 100%.',
      };
    }

    // 2. High contrast & themes
    if (userText.includes('high contrast') || userText.includes('contrast mode')) {
      return {
        toolCalls: [
          {
            name: 'set_adaptation',
            args: { contrastTheme: 'high-contrast' },
          },
        ],
        content: 'Applied high-contrast theme across the page.',
      };
    }

    if (userText.includes('dark mode') || userText.includes('dark theme')) {
      return {
        toolCalls: [
          {
            name: 'set_adaptation',
            args: { contrastTheme: 'dark' },
          },
        ],
        content: 'Switched page presentation to dark theme.',
      };
    }

    // 3. Reading ruler
    if (userText.includes('reading ruler') || userText.includes('ruler')) {
      return {
        toolCalls: [
          {
            name: 'set_adaptation',
            args: { readingRuler: true },
          },
        ],
        content: 'Enabled the reading ruler guide to assist visual tracking.',
      };
    }

    // 4. Large targets / touch assist
    if (userText.includes('large targets') || userText.includes('bigger buttons') || userText.includes('target size')) {
      return {
        toolCalls: [
          {
            name: 'set_adaptation',
            args: { largeTargets: true },
          },
        ],
        content: 'Enlarged all interactive buttons and click targets to ≥44px for easier interaction.',
      };
    }

    // 5. Read page aloud / extract readable text
    if (userText.includes('read') || userText.includes('read page') || userText.includes('listen')) {
      return {
        toolCalls: [
          {
            name: 'read_text',
            args: { scope: 'main', maxChars: 2500 },
          },
        ],
      };
    }

    // 6. Scrolling
    if (userText.includes('scroll down') || userText === 'down') {
      return {
        toolCalls: [
          {
            name: 'scroll',
            args: { direction: 'down', amount: 'half' },
          },
        ],
        content: 'Scrolled down half a page.',
      };
    }

    if (userText.includes('scroll up') || userText === 'up') {
      return {
        toolCalls: [
          {
            name: 'scroll',
            args: { direction: 'up', amount: 'half' },
          },
        ],
        content: 'Scrolled up.',
      };
    }

    if (userText.includes('scroll to top') || userText.includes('go to top')) {
      return {
        toolCalls: [
          {
            name: 'scroll',
            args: { direction: 'top' },
          },
        ],
        content: 'Scrolled to the top of the page.',
      };
    }

    if (userText.includes('scroll to bottom') || userText.includes('go to bottom')) {
      return {
        toolCalls: [
          {
            name: 'scroll',
            args: { direction: 'bottom' },
          },
        ],
        content: 'Scrolled to the bottom of the page.',
      };
    }

    // 7. Click action: "click [ref]" or "click [name]"
    const clickRefMatch = userText.match(/click\s+(e\d+)/i);
    const matchedRef = clickRefMatch?.[1];
    if (matchedRef) {
      return {
        toolCalls: [
          {
            name: 'click',
            args: { ref: matchedRef },
          },
        ],
        content: `Clicked element [${matchedRef}].`,
      };
    }

    // 8. General search or observation
    if (userText.includes('find') || userText.includes('where is')) {
      const query = userText.replace(/find|where is|the/g, '').trim();
      return {
        toolCalls: [
          {
            name: 'find_elements',
            args: { query },
          },
        ],
      };
    }

    // 9. Default: Observe the page to inspect structure
    return {
      toolCalls: [
        {
          name: 'observe_page',
          args: { mode: 'interactive' },
        },
      ],
    };
  }
}
