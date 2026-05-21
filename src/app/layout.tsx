import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "College Info Chatbot — AI-Powered Admissions Assistant",
  description:
    "Get instant answers about college fees, courses, eligibility, cutoffs, and deadlines. Powered by AI with real college data.",
  keywords: [
    "college admissions",
    "college fees",
    "course eligibility",
    "cutoff marks",
    "AI chatbot",
    "college information",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "College Chat",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a1a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="mesh-gradient" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
