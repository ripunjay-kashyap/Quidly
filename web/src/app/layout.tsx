import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthDialogProvider } from "@/lib/auth-dialog";
import { SessionProvider } from "@/lib/use-session";
import { SiteFooter } from "./site-footer";
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
  title: {
    default: "Quidly: every job application gets an answer",
    template: "%s · Quidly",
  },
  description:
    "Companies on Quidly reply within 72 hours with real feedback or an interview invite. If they don't, you get $5 through PayPal.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased motion-safe:scroll-smooth`}
    >
      <body className="flex min-h-full flex-col">
        <SessionProvider>
          <AuthDialogProvider>
            <SiteHeader />
            <div className="flex flex-1 flex-col">{children}</div>
            <SiteFooter />
          </AuthDialogProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
