import "../theme/global.css";

import { Layout } from "nextra-theme-docs";
import { Banner, Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import config from "../config";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--tederash-font-sans",
  preload: false,
});

export const metadata: Metadata = config.metadata;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pageMap = await getPageMap();

  return (
    <html
      lang="en"
      dir="ltr"
      className={inter.variable}
      suppressHydrationWarning
    >
      <Head
        backgroundColor={{
          light: "#fefdfb",
          dark: "#0d0f14",
        }}
        color={{
          hue: { light: 172, dark: 172 },
          saturation: { light: 85, dark: 80 },
          lightness: { light: 40, dark: 62 },
        }}
      >
        <link
          rel="shortcut icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230f766e'/%3E%3Ccircle cx='11' cy='12' r='4.5' fill='none' stroke='white' stroke-width='2.5'/%3E%3Ccircle cx='21' cy='20' r='4.5' fill='none' stroke='white' stroke-width='2.5'/%3E%3C/svg%3E"
        />
      </Head>
      <body>
        <Layout
          banner={
            <Banner storageKey="tederash-docs-banner" key="banner">
              ♿ Tederash Adaptive Accessibility Framework — runtime-adaptive
              accessibility for React
            </Banner>
          }
          navbar={
            <div className="tederash-navbar" aria-label="Site header" key="navbar">
              <span className="tederash-logo" aria-hidden="true" />
              <span className="tederash-brand">Tederash</span>
              <span className="tederash-brand-sub">Adaptive Accessibility</span>
            </div>
          }
          pageMap={pageMap}
          docsRepositoryBase={config.nextraLayout.docsRepositoryBase}
          sidebar={{ toggleButton: true }}
          footer={
            <div className="tederash-footer" key="footer">
              © {new Date().getFullYear()} Tederash Adaptive Accessibility
              Framework · Built with Nextra
            </div>
          }
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
