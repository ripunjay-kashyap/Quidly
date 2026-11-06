import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "./site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quidly",
  description: "Job listings with a guaranteed response, backed by PayPal.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        {children}
        <footer className="mx-auto w-full max-w-3xl px-4 py-6 text-sm">
          Built with PayPal (payments, holds and payouts), Elastic (feedback checks), Render (backend) and Vercel.
          Payments run in PayPal&apos;s sandbox.
        </footer>
      </body>
    </html>
  );
}
