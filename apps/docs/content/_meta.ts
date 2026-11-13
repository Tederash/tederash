type MetaRecord = Record<
  string,
  string | { type: "separator"; title: string } | { title: string; theme?: unknown }
>;

const meta: MetaRecord = {
  index: "Introduction",
  "quick-start": "Quick Start",
  profiles: "Profiles",
  separator1: { type: "separator", title: "API Reference" },
  runtime: "Runtime",
  hooks: "Hooks",
  components: "Components",
  separator2: { type: "separator", title: "Architecture" },
  decisions: "Architecture Decisions",
};

export default meta;
