import nextra from "nextra";

const withNextra = nextra({
  search: {
    codeblocks: false,
  },
  contentDirBasePath: "/docs",
  // Render the copy button on every code block (still opt-out per fence with `copy=false`).
  defaultShowCopyCode: true,
});

export default withNextra({
  reactStrictMode: true,
  transpilePackages: [
    "@tederash/core",
    "@tederash/react",
    "@tederash/components",
    "@tederash/assistance",
  ],
});
