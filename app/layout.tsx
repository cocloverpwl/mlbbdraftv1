import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;
  const description =
    "A quiet, evidence-informed study instrument for retrieval practice, spaced review, interleaving, and self-explanation.";

  return {
    title: "Memory Field — anaDaBane",
    description,
    icons: {
      icon: "/logo-green.png",
      shortcut: "/logo-green.png",
    },
    openGraph: {
      title: "Memory Field — anaDaBane",
      description,
      type: "website",
      images: [{ url: `${baseUrl}/og.png`, width: 1536, height: 1024, alt: "anaDaBane Memory Field — Recall, then refine." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Memory Field — anaDaBane",
      description,
      images: [`${baseUrl}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;500&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@1&family=Italiana&family=Jura:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
