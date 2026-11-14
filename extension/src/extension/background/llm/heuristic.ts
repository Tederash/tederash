import type { ToolCall } from '../../../shared/tools';
import type { LlmMessage, LlmProvider, LlmResponse } from './types';

export class HeuristicLlmProvider implements LlmProvider {
  id = 'heuristic';
  name = 'Tederash Built-in Agent (Deterministic)';

  async generate(req: {
    systemPrompt: string;
    messages: LlmMessage[];
    tools?: any;
    signal?: AbortSignal;
  }): Promise<LlmResponse> {
    const lastUserMsg = [...req.messages].reverse().find((m) => m.role === 'user');
    const lastToolMsg = [...req.messages].reverse().find((m) => m.role === 'tool');
    const userText = (lastUserMsg?.content || '').toLowerCase().trim();

    // If we just got a tool response from observe_page or read_text, synthesize an answer:
    if (lastToolMsg) {
      try {
        const toolData = JSON.parse(lastToolMsg.content);

        // Tederash component tree inspection response
        if (Array.isArray(toolData)) {
          const formControls = toolData.filter(
            (c: any) =>
              c.component === 'input' ||
              c.component === 'select' ||
              c.component === 'textarea' ||
              c.component === 'checkbox'
          );
          if (
            formControls.length > 0 &&
            (userText.includes('field') ||
              userText.includes('form') ||
              userText.includes('need') ||
              userText.includes('require') ||
              userText.includes('what'))
          ) {
            const requiredFields = formControls.filter((c: any) => c.required);
            const optionalFields = formControls.filter((c: any) => !c.required);

            let md = `The form on this page has **${formControls.length} interactive fields** (${requiredFields.length} required):\n\n`;
            md += `| Field | Type | Required? | Component ID |\n`;
            md += `|---|---|---|---|\n`;
            for (const f of formControls) {
              md += `| **${f.label || f.id}** | \`${f.component}\` | ${f.required ? '✅ **Required**' : 'Optional'} | \`${f.id}\` |\n`;
            }

            md += `\n### Required Fields:\n`;
            requiredFields.forEach((f: any, idx: number) => {
              md += `${idx + 1}. **${f.label || f.id}** (${f.component})\n`;
            });

            if (optionalFields.length > 0) {
              md += `\n### Optional Fields:\n`;
              optionalFields.forEach((f: any, idx: number) => {
                md += `${idx + 1}. **${f.label || f.id}** (${f.component})\n`;
              });
            }

            return { content: md.trim() };
          }

          return {
            content: `I retrieved the Tederash accessible component tree with ${toolData.length} components. How would you like me to assist you with them?`,
          };
        }

        // Snapshot observation summary
        if (toolData && toolData.elements) {
          const els = toolData.elements as Array<{
            ref: string;
            tag: string;
            name?: string;
            role?: string;
            type?: string;
          }>;
          const headings = (toolData.headings as string[]) || [];
          const interactiveCount = els.length;

          // Form fields inspection via snapshot
          const inputs = els.filter(
            (e) =>
              e.tag === 'input' ||
              e.tag === 'select' ||
              e.tag === 'textarea' ||
              e.role === 'textbox' ||
              e.role === 'combobox' ||
              e.role === 'checkbox'
          );
          if (
            inputs.length > 0 &&
            (userText.includes('field') ||
              userText.includes('form') ||
              userText.includes('need') ||
              userText.includes('require'))
          ) {
            let md = `The form contains **${inputs.length} input field(s)**:\n\n`;
            md += `| Field Name | Type | Ref |\n`;
            md += `|---|---|---|\n`;
            for (const inp of inputs) {
              md += `| **${inp.name || 'Unnamed input'}** | \`${inp.type || inp.role || inp.tag}\` | \`[${inp.ref}]\` |\n`;
            }
            return { content: md.trim() };
          }

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

    // 1. Accessibility font scale preferences
    if (userText.includes('increase text') || userText.includes('larger text') || userText.includes('bigger font') || userText.includes('zoom text')) {
      return {
        toolCalls: [
          {
            name: 'tederash_update_pref',
            args: { fontScale: 1.35 },
          },
          {
            name: 'say',
            args: { text: 'Adapted font scale to 135% via Tederash runtime.' },
          },
        ],
        content: 'I have updated the accessibility profile font scale to 135%.',
      };
    }

    if (userText.includes('decrease text') || userText.includes('smaller text') || userText.includes('reset text')) {
      return {
        toolCalls: [
          {
            name: 'tederash_update_pref',
            args: { fontScale: 1.0 },
          },
        ],
        content: 'Reset accessibility font scale to standard 100%.',
      };
    }

    // 2. High contrast & themes
    if (userText.includes('high contrast') || userText.includes('contrast mode')) {
      return {
        toolCalls: [
          {
            name: 'tederash_update_pref',
            args: { highContrast: true },
          },
        ],
        content: 'Activated high-contrast mode in the Tederash accessibility runtime.',
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

    // 9. Form fields inspection: "what fields does this form need?"
    if (
      userText.includes('field') ||
      userText.includes('form') ||
      userText.includes('need') ||
      userText.includes('input') ||
      userText.includes('register')
    ) {
      return {
        toolCalls: [
          {
            name: 'tederash_get_tree',
            args: {},
          },
        ],
      };
    }

    // 10. Default: Observe the page to inspect structure
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
