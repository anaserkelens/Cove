import type { Metadata, Viewport } from "next";
import { Nunito, Quicksand } from "next/font/google";
import "./globals.css";

// Rounded type system that extends the Cove logo's wordmark:
// Quicksand (display + brand) paired with Nunito (soft humanist body).
const quicksand = Quicksand({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-quicksand",
});

const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
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
      className={`${nunito.variable} ${quicksand.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
