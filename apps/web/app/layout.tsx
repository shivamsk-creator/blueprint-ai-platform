import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Blueprint AI — Software Specification & Architecture Studio",
    template: "%s | Blueprint AI",
  },
  description:
    "End-to-end AI-assisted product discovery, requirements engineering, BRD/PRD authoring, architecture modeling, database/API design, traceability, and governance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#f6f8fb] text-[#0f172a]">{children}</body>
    </html>
  );
}
