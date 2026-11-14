import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`prose-clean text-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-fg mt-3 mb-1.5 first:mt-0 tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold text-fg mt-2.5 mb-1 first:mt-0 tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-fg mt-2 mb-1 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 text-sm leading-relaxed text-fg">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 space-y-1 my-1.5 text-sm marker:text-fg-muted">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 space-y-1 my-1.5 text-sm marker:text-fg-muted">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed text-fg">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-fg">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ inline, className: codeClass, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="font-mono text-[12px] px-1.5 py-0.5 rounded bg-surface-elevated text-fg border border-border"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="rounded-md bg-surface-elevated border border-border p-2.5 overflow-x-auto my-2 text-xs font-mono text-fg leading-snug">
                <code {...props}>{children}</code>
              </pre>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-3 my-2 text-fg-muted italic text-xs">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 border border-border rounded-md">
              <table className="w-full text-xs text-left border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-surface-elevated border-b border-border text-fg font-semibold">
              {children}
            </thead>
          ),
          th: ({ children }) => <th className="p-2 border-r border-border last:border-0">{children}</th>,
          td: ({ children }) => (
            <td className="p-2 border-t border-border border-r last:border-r-0 text-fg">
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-2.5 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
