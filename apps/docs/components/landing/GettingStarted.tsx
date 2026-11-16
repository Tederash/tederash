import React from "react";
import { CodeBlock } from "./CodeBlock";
import { GettingStartedContent } from "./GettingStartedContent";

const STEP_CODES = [
  `import { AccessibilityProvider } from "@tederash/react";

export default function App({ children }) {
  return <AccessibilityProvider>{children}</AccessibilityProvider>;
}`,
  `import { TederashInput, TederashButton } from "@tederash/components";

<TederashInput
  label="Email"
  type="email"
  description="We only use this to reach you about your application."
  simplifiedDescription="Type your email address."
  required
/>
<TederashButton type="submit">Send</TederashButton>`,
  `import { useTederash, PRESET_PROFILES } from "@tederash/react";

const { setProfile } = useTederash();
setProfile(PRESET_PROFILES.find((p) => p.id === "low-vision"));`,
];

export function GettingStarted() {
  return (
    <GettingStartedContent
      stepCodeBlocks={STEP_CODES.map((code, i) => (
        <CodeBlock
          key={i}
          code={code}
          lang="tsx"
          label={`Copy code for step ${i + 1}`}
        />
      ))}
    />
  );
}
