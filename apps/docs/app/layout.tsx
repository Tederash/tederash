import "../theme/global.css";

import { Layout, Navbar } from "nextra-theme-docs";
import { Banner, Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import type { Metadata } from "next";

import config from "../config";
import { ClientProviders } from "../components/ClientProviders";
import { Footer } from "../components/Footer";
import { NpmIcon } from "../components/NpmIcon";
import { ThemeSwitcher } from "../components/ThemeSwitcher";

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
                projectLink="https://github.com/Tederash/tederash"
                chatLink="https://www.npmjs.com/package/@tederash/core"
                chatIcon={<NpmIcon className="w-5 h-5" />}
              >
                <div className="flex items-center gap-4 text-xs font-semibold mr-2 max-md:hidden">
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
                <ThemeSwitcher />
              </Navbar>
            }
            pageMap={pageMap}
            docsRepositoryBase={config.nextraLayout.docsRepositoryBase}
            sidebar={{ toggleButton: true }}
            toc={{
              float: true,
              title: "On this page",
              backToTop: "Back to top",
            }}
            editLink="Edit this page"
            feedback={{
              content: "Questions? Give feedback",
              labels: "feedback",
            }}
            footer={<Footer key="footer" />}
          >
            {children}
          </Layout>
        </ClientProviders>
      </body>
    </html>
  );
}
