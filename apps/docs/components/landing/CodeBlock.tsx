import React from "react";
import { codeToHtml, type BundledLanguage } from "shiki";
import { CopyButton } from "./CopyButton";

/**
 * Server-rendered, syntax-highlighted code with a copy button in the top-right
 * corner. Both light and dark theme colours are emitted as CSS variables, and
 * `.landing-code` in theme/global.css picks the right one.
 */
export async function CodeBlock({
  code,
  lang,
  label,
  className = "",
}: {
  code: string;
  lang: BundledLanguage;
  label?: string;
  className?: string;
}) {
  const html = await codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });

  return (
    <div className={`landing-code relative rounded-md border border-border bg-muted/40 ${className}`}>
      <div
        className="overflow-x-auto p-4 pr-14 font-mono text-sm leading-relaxed"
        // Highlighted HTML comes from Shiki, from code strings defined in this repo.
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <CopyButton text={code} label={label} />
    </div>
  );
}
