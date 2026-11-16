import "../theme/global.css";

import { Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import type { Metadata } from "next";
import Image from "next/image";
import brandIcon from "./icon.png";

import config from "../config";
import { ClientProviders } from "../components/ClientProviders";
import { Footer } from "../components/Footer";
import { NpmIcon } from "../components/NpmIcon";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { NavbarLinks } from "../components/NavbarLinks";

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
            navbar={
              <Navbar
                key="navbar"
                logo={
                  <div className="tederash-navbar flex items-center gap-2.5" aria-label="Tederash Home">
                    <Image
                      src={brandIcon}
                      alt="Tederash"
                      width={26}
                      height={26}
                      className="w-6 h-6 rounded-md object-contain shrink-0"
                      priority
                    />
                    <span className="tederash-brand font-semibold text-base tracking-tight">Tederash</span>
                  </div>
                }
                projectLink="https://github.com/Tederash/tederash"
                chatLink="https://www.npmjs.com/package/@tederash/core"
                chatIcon={<NpmIcon className="w-5 h-5" />}
              >
                <NavbarLinks />
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
