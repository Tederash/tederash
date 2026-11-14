import "../theme/global.css";

import { Layout, Navbar } from "nextra-theme-docs";
import { Banner, Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import type { Metadata } from "next";

import config from "../config";
import { ClientProviders } from "../components/ClientProviders";
import { Footer } from "../components/Footer";

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
      data-tederash-root="true"
      data-tederash-version="0.1.0"
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
        <ClientProviders>
          <Layout
            banner={
              <Banner storageKey="tederash-docs-banner" key="banner">
                ♿ Tederash Adaptive Accessibility Framework: runtime-adaptive
                accessibility for React
              </Banner>
            }
            navbar={
              <Navbar
                logo={
                  <div className="tederash-navbar" aria-label="Tederash Home">
                    <span className="tederash-logo" aria-hidden="true" />
                    <span className="tederash-brand">Tederash</span>
                    <span className="tederash-brand-sub">Adaptive Accessibility</span>
                  </div>
                }
                projectLink="https://github.com/tederash/tederash-ui-library"
              >
                <div className="flex items-center gap-4 text-xs font-semibold mr-2">
                  <a href="/docs" className="hover:opacity-80 transition-opacity">
                    Documentation
                  </a>
                  <a href="/jobs" className="hover:opacity-80 transition-opacity">
                    Careers & Demo
                  </a>
                  <a href="/subscription" className="hover:opacity-80 transition-opacity">
                    Pricing
                  </a>
                </div>
              </Navbar>
            }
            pageMap={pageMap}
            docsRepositoryBase={config.nextraLayout.docsRepositoryBase}
            sidebar={{ toggleButton: true }}
            footer={<Footer key="footer" />}
          >
            {children}
          </Layout>
        </ClientProviders>
      </body>
    </html>
  );
}
