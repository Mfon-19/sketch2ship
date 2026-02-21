import type { Metadata } from "next";
import {
  Inter,
  Lora,
  Merriweather,
  JetBrains_Mono,
} from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { WorkspaceProvider } from "@/components/providers/WorkspaceProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sketch2Ship",
  description: "Notebook-first workspace for project planning and specification",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${lora.variable} ${merriweather.variable} ${jetbrainsMono.variable} min-h-screen antialiased`}
      >
        <WorkspaceProvider>
          <AppShell>{children}</AppShell>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
