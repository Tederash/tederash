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

    // If we just got a tool response, synthesize a clear, helpful answer:
    if (lastToolMsg) {
      try {
        const toolData = JSON.parse(lastToolMsg.content);

        // 1. inspect_form tool response
        if (toolData && toolData.forms) {
          const forms = toolData.forms as Array<{
            name: string;
            fieldCount: number;
            fields: Array<{
              id: string;
              label: string;
              type: string;
              required: boolean;
              value?: string;
              error?: string;
              options?: Array<{ value: string; label: string }>;
            }>;
            submitButtons: Array<{ id: string; label: string }>;
          }>;

          if (forms.length > 0) {
            let md = '';
            for (const f of forms) {
              const reqFields = f.fields.filter((field) => field.required);
              const optFields = f.fields.filter((field) => !field.required);

              md += `### ${f.name}\n\n`;
              md += `This form contains **${f.fieldCount} fields** (${reqFields.length} required, ${optFields.length} optional):\n\n`;
              md += `| Field Label | Input Type | Requirement | ID / Ref |\n`;
              md += `|---|---|---|---|\n`;
              for (const field of f.fields) {
                const reqBadge = field.required ? '🔴 **Required**' : '⚪ Optional';
                md += `| **${field.label}** | \`${field.type}\` | ${reqBadge} | \`${field.id}\` |\n`;
              }

              if (reqFields.length > 0) {
                md += `\n**Required Fields:**\n`;
                reqFields.forEach((rf, i) => {
                  md += `${i + 1}. **${rf.label}** (\`${rf.type}\`)\n`;
                });
              }

              if (optFields.length > 0) {
                md += `\n**Optional Fields:**\n`;
                optFields.forEach((of, i) => {
                  md += `${i + 1}. **${of.label}** (\`${of.type}\`)\n`;
                });
              }

              if (f.submitButtons.length > 0) {
                md += `\n**Form Actions:** ${f.submitButtons.map((b) => `\`[${b.label}]\``).join(', ')}\n`;
              }
            }
            return { content: md.trim() };
          }
        }

        // 2. inspect_page tool response
        if (toolData && (toolData.headings || toolData.landmarks || toolData.mainText)) {
          const headings = (toolData.headings as Array<{ level: string; text: string }>) || [];
          const landmarks = (toolData.landmarks as string[]) || [];
          const mainText = (toolData.mainText as string) || '';
          const title = toolData.title || 'Page Content';

          let md = `## ${title}\n\n`;
          if (mainText) {
            md += `${mainText.slice(0, 800)}\n\n`;
          }
          if (headings.length > 0) {
            md += `### Key Sections\n`;
            headings.slice(0, 8).forEach((h) => {
              md += `- **${h.text}** (${h.level.toUpperCase()})\n`;
            });
          }
          if (landmarks.length > 0) {
            md += `\n*Landmarks detected:* ${landmarks.join(', ')}\n`;
          }
          md += `\nHow would you like to proceed? I can read specific sections, assist with form inputs, or adjust accessibility preferences.`;
          return { content: md.trim() };
        }

        // 3. Tederash component tree inspection response
        if (Array.isArray(toolData)) {
          const formControls = toolData.filter(
            (c: any) =>
              c.component === 'input' ||
              c.component === 'select' ||
              c.component === 'textarea' ||
              c.component === 'checkbox'
          );
          if (formControls.length > 0) {
            const requiredFields = formControls.filter((c: any) => c.required);
            const optionalFields = formControls.filter((c: any) => !c.required);

            let md = `The form on this page has **${formControls.length} interactive fields** (${requiredFields.length} required):\n\n`;
            md += `| Field | Type | Required? | Component ID |\n`;
            md += `|---|---|---|---|\n`;
            for (const f of formControls) {
              md += `| **${f.label || f.id}** | \`${f.component}\` | ${f.required ? '🔴 **Required**' : '⚪ Optional'} | \`${f.id}\` |\n`;
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
            content: `I retrieved the Tederash accessible component hierarchy with ${toolData.length} components. How would you like me to assist you with them?`,
          };
        }

        // 4. Snapshot observation summary (observe_page)
        if (toolData && toolData.elements) {
          const els = toolData.elements as Array<{
            ref: string;
            tag: string;
            name?: string;
            role?: string;
            type?: string;
          }>;
          const headings = (toolData.headings as string[]) || [];

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
              userText.includes('require') ||
              userText.includes('input'))
          ) {
            let md = `The form contains **${inputs.length} input field(s)**:\n\n`;
            md += `| Field Name | Type | Ref |\n`;
            md += `|---|---|---|\n`;
            for (const inp of inputs) {
              md += `| **${inp.name || 'Input'}** | \`${inp.type || inp.role || inp.tag}\` | \`[${inp.ref}]\` |\n`;
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
                content: `I found ${matched.length} element(s) matching "${query}":\n\n${list}\n\nWould you like me to interact with one of them?`,
              };
            }
          }

          // Clear overview from headings and text sample
          const headingList = headings.slice(0, 6).map((h) => `• **${h}**`).join('\n');
          const sample = (toolData.textSample as string) || '';
          return {
            content: `### ${toolData.title || 'Page Overview'}\n\n${sample ? `"${sample.slice(0, 300)}…"\n\n` : ''}${headingList ? `**Key Page Sections:**\n${headingList}\n\n` : ''}I can help you navigate this page, inspect and fill form inputs, read content aloud, or adjust accessibility preferences. What would you like to do?`,
          };
        }

        // 5. Read text response
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
    if (
      userText.includes('increase text') ||
      userText.includes('larger text') ||
      userText.includes('bigger font') ||
      userText.includes('zoom text')
    ) {
      return {
        toolCalls: [
          {
            name: 'tederash_update_pref',
            args: { fontScale: 1.25 },
          },
        ],
        content: 'Increased text font scale to 125% for better readability.',
      };
    }

    if (
      userText.includes('decrease text') ||
      userText.includes('smaller text') ||
      userText.includes('reset font')
    ) {
      return {
        toolCalls: [
          {
            name: 'tederash_update_pref',
            args: { fontScale: 1.0 },
          },
        ],
        content: 'Reset text font scale to 100%.',
      };
    }

    // 2. High contrast mode
    if (
      userText.includes('high contrast') ||
      userText.includes('contrast mode') ||
      userText.includes('contrast theme')
    ) {
      return {
        toolCalls: [
          {
            name: 'tederash_update_pref',
            args: { highContrast: true },
          },
        ],
        content: 'Enabled high contrast mode with prominent borders and clear focus rings.',
      };
    }

    // 3. Simplified language / cognitive assist
    if (
      userText.includes('simplify') ||
      userText.includes('easier') ||
      userText.includes('plain language')
    ) {
      return {
        toolCalls: [
          {
            name: 'tederash_update_pref',
            args: { simplifiedLanguage: true, showInstructions: true },
          },
        ],
        content: 'Enabled simplified plain language and helpful instruction guides.',
      };
    }

    // 4. Large targets / touch assist
    if (
      userText.includes('large targets') ||
      userText.includes('bigger buttons') ||
      userText.includes('target size')
    ) {
      return {
        toolCalls: [
          {
            name: 'tederash_update_pref',
            args: { targetSize: 'large' },
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

    // 7. Click action: "click [ref]"
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

    // 9. Form fields inspection: "what fields does this form need?" or "explain form"
    if (
      userText.includes('field') ||
      userText.includes('form') ||
      userText.includes('need') ||
      userText.includes('input') ||
      userText.includes('register') ||
      userText.includes('require')
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

    // 10. Default: Inspect page structure and content
    return {
      toolCalls: [
        {
          name: 'inspect_page',
          args: { detail: 'summary' },
        },
      ],
    };
  }
}
