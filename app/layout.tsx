import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import LiveKitConciergeEmbed from "@/app/components/LiveKitConciergeEmbed";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Aurum Atelier | Boutique Hotel",
  description:
    "Aurum Atelier is a boutique hotel experience with artful suites, private courtyards, and a modern coastal sensibility.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${sourceSans.variable} antialiased`}>
        {children}
        <LiveKitConciergeEmbed />
      </body>
    </html>
  );
}
