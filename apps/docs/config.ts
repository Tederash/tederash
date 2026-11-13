const config = {
  metadata: {
    title: {
      default: "Tederash Adaptive Accessibility",
      template: "%s | Tederash Docs",
    },
    description:
      "Documentation for the Tederash Adaptive Accessibility Framework: runtime-adaptive accessibility preferences for React and TypeScript.",
    applicationName: "Tederash",
  },
  nextraLayout: {
    docsRepositoryBase: "https://github.com/tederash/tederash-ui-library/blob/main/apps/docs/content",
    sidebar: {
      toggleButton: true,
    },
    themeSwitch: {
      component: "auto",
    },
  } as const,
};

export default config;
