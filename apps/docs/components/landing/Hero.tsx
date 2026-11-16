import React from "react";
import { CodeBlock } from "./CodeBlock";
import { HeroContent } from "./HeroContent";

const INSTALL_COMMAND = "pnpm add @tederash/core @tederash/react @tederash/components";

export function Hero() {
  return (
    <HeroContent
      codeBlock={
        <CodeBlock
          code={INSTALL_COMMAND}
          lang="bash"
          label="Copy install command"
        />
      }
    />
  );
}
