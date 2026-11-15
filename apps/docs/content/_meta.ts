type MetaRecord = Record<
  string,
  string | { type: "separator"; title: string } | { title: string; theme?: unknown }
>;

const meta: MetaRecord = {
  index: "Introduction",
  "quick-start": "Quick Start",
  installation: "Installation",
  profiles: "Profiles",
  separator1: { type: "separator", title: "API Reference" },
  runtime: "Runtime",
  hooks: "Hooks",
  components: "Components",
  separator2: { type: "separator", title: "Features" },
  speech: "Speech",
  localization: "Localization",
  assistance: "Assistance",
  "extension-bridge": "Extension Bridge",
  separator3: { type: "separator", title: "Project" },
  "accessibility-statement": "Accessibility Statement",
};

export default meta;
