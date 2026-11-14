import React, { useState } from 'react';
import type { ToolCallItem } from '../../shared/messages';

interface ThoughtProcessProps {
  isInvestigating?: boolean;
  activeVerb?: string;
  toolCalls?: ToolCallItem[];
}

export const ThoughtProcess: React.FC<ThoughtProcessProps> = ({
  isInvestigating = false,
  activeVerb = 'Thinking...',
  toolCalls = [],
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(isInvestigating);

  const totalSteps = toolCalls.length;
  const hasThoughts = totalSteps > 0 || isInvestigating;

  if (!hasThoughts) {
    return null;
  }

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'tederash_get_tree':
      case 'tederash_detect':
        return (
          <svg className="w-3.5 h-3.5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'observe_page':
      case 'find_elements':
        return (
          <svg className="w-3.5 h-3.5 text-fg-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'tederash_explain_field':
      case 'read_text':
        return (
          <svg className="w-3.5 h-3.5 text-fg-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'click':
      case 'tederash_interact':
        return (
          <svg className="w-3.5 h-3.5 text-fg-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        );
      case 'fill_field':
        return (
          <svg className="w-3.5 h-3.5 text-fg-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      default:
        return (
          <svg className="w-3.5 h-3.5 text-fg-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
  };

  return (
    <div className="my-2 select-none w-full max-w-full">
      {/* Thinking Dropdown Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg transition-colors py-1 cursor-pointer font-sans"
        aria-expanded={isOpen}
      >
        <span className="text-fg-muted group-hover:text-fg transition-colors">
          {isOpen ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </span>

        {isInvestigating ? (
          <span className="flex items-center gap-1.5 font-medium text-fg animate-pulse">
            <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span>{activeVerb}</span>
            {totalSteps > 0 && (
              <span className="text-[10px] font-mono text-fg-muted font-normal">
                ({totalSteps} {totalSteps === 1 ? 'step' : 'steps'})
              </span>
            )}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-fg-muted font-medium">
            <span>Thinking Process</span>
            {totalSteps > 0 && (
              <span className="text-[10px] font-mono text-fg-muted">
                · {totalSteps} {totalSteps === 1 ? 'step' : 'steps'}
              </span>
            )}
          </span>
        )}
      </button>

      {/* Chained Thoughts Timeline - Just the things done */}
      {isOpen && (
        <div className="border-l border-border ml-2 pl-3 py-1 space-y-1.5 mt-1 mb-2 font-sans text-xs">
          {toolCalls.map((tc, idx) => {
            const stepId = tc.id || `step_${idx}`;
            const isPending = tc.status === 'PENDING' || !tc.status;
            const stepTitle = tc.rationale || `Executed ${tc.tool}`;

            return (
              <div
                key={stepId}
                className="flex items-center justify-between gap-2 p-1.5 -m-1 rounded-md bg-surface-elevated/40 border border-border/50"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {getToolIcon(tc.tool)}
                  <span className="text-xs text-fg font-medium truncate">
                    {stepTitle}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-surface text-fg-muted border border-border font-normal">
                    {tc.tool}
                  </span>

                  {tc.status === 'SUCCESS' && (
                    <span className="text-[10px] text-success flex items-center gap-0.5" title="Completed">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                  {tc.status === 'ERROR' && (
                    <span className="text-[10px] text-danger flex items-center gap-0.5" title="Issue encountered">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </span>
                  )}
                  {isPending && (
                    <span className="text-[10px] text-accent flex items-center gap-0.5" title="Running">
                      <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
