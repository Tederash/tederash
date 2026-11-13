import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ClientProviders } from "@/components/ClientProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tederash Adaptive Accessibility Playground",
  description: "Dynamic adaptive accessibility framework demonstration and component showcase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="font-sans antialiased bg-background text-foreground min-h-screen flex flex-col justify-between"
      >
        <ClientProviders>
          <Navbar />
          <div className="flex-1">
            {children}
          </div>
          <Footer />
        </ClientProviders>
      </body>
    </html>
  );
}
