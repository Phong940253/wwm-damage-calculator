import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/theme-provider"; // Adjust path if needed
import "katex/dist/katex.min.css";
import { GearProvider } from "./gear/GearContext";

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
    default: "Where Winds Meet DMG Optimizer | Damage Calculator",
    template: "%s | Where Winds Meet",
  },

  description:
    "Advanced damage optimizer and formula calculator for Where Winds Meet. Calculate minimum, average, critical, and affinity damage with full math formulas.",

  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },

  keywords: [
    "Where Winds Meet",
    "Where Winds Meet damage calculator",
    "WWM DMG optimizer",
    "Where Winds Meet build",
    "Where Winds Meet formula",
    "WWM theorycraft",
    "MMO damage calculator",
    "RPG damage formula",
  ],

  authors: [{ name: "Where Winds Meet Community" }],

  creator: "WWM Theorycraft Tool",

  metadataBase: new URL("https://wwm-damage-calculator.vercel.app"), // 🔴 CHANGE THIS

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "Where Winds Meet DMG Optimizer",
    description:
      "Calculate and optimize damage in Where Winds Meet with full math formulas, precision, critical, and affinity mechanics.",
    url: "https://wwm-damage-calculator.vercel.app", // 🔴 CHANGE THIS
    siteName: "Where Winds Meet DMG Optimizer",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png", // 🔴 add later (1200x630)
        width: 1200,
        height: 630,
        alt: "Where Winds Meet Damage Optimizer",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Where Winds Meet DMG Optimizer",
    description:
      "Advanced damage calculator for Where Winds Meet with full formulas and theorycraft support.",
    images: ["/og-image.png"], // same image
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  category: "Game Tools",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GearProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </GearProvider>
      </body>
    </html>
  );
}