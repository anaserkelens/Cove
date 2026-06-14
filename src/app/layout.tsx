import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans, Quicksand } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
  variable: "--font-fraunces",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
  variable: "--font-quicksand",
});

export const metadata: Metadata = {
  title: {
    default: "Cove — a calmer home, together",
    template: "%s · Cove",
  },
  description:
    "Cove keeps your household in sync — events, tasks, shopping, and the boring admin — so everyone knows what's happening without the group-chat chaos.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/cove-mark.svg", type: "image/svg+xml" },
    ],
    apple: "/cove-mark.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#dcefe7" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1513" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${fraunces.variable} ${quicksand.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
