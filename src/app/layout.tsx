import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar        from "@/components/Navbar";
import GlobalEffects from "@/components/GlobalEffects";
import CustomCursor  from "@/components/CustomCursor";
import AmbientAudio  from "@/components/AmbientAudio";
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
  title: "Convergence",
  description: "A cinematic scroll animation experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#040408] overflow-x-hidden">
        {/* Global ambient effects: hex membrane + particles — position: fixed, pointer-events: none */}
        <GlobalEffects />
        {/* Lime orb cursor — fine-pointer devices only */}
        <CustomCursor />
        {/* Ambient cinematic audio — starts on first interaction */}
        <AmbientAudio />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
