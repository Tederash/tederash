const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const config = {
  metadata: {
    metadataBase: new URL(siteUrl),
    title: {
      default: "Tederash Adaptive Accessibility",
      template: "%s | Tederash Docs",
    },
    description:
      "Documentation for the Tederash Adaptive Accessibility Framework: runtime-adaptive accessibility preferences for React and TypeScript.",
    applicationName: "Tederash",
  },
  nextraLayout: {
    docsRepositoryBase: "https://github.com/Tederash/tederash/blob/main/apps/docs/content",
    sidebar: {
      toggleButton: true,
    },
    themeSwitch: {
      component: "auto",
    },
  } as const,
};

export default config;
