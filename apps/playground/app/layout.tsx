import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
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
        className="font-sans antialiased bg-background text-foreground min-h-screen"
      >
        <ClientProviders>
          <Navbar />
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
