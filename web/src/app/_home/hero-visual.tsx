"use client";

import { formatClock } from "@/lib/api";
import { useNow } from "@/lib/use-now";
import { bigClock, payoutReceipt } from "./ascii";

const WINDOW_SECONDS = 72 * 3600;

// A live reply clock for a sample application, and the receipt you get if it runs out.
export function HeroVisual() {
  const now = useNow();
  // Loops through the first hour of the window, so the clock always looks freshly started.
  const secondsLeft = WINDOW_SECONDS - 1 - (now ? Math.floor(now / 1000) % 3600 : 0);

  return (
    <div
      role="img"
      aria-label="A clock counting down the 72 hours a company has to reply, and a receipt for the $5 paid when a company didn't reply in time"
      className="rise relative mx-auto w-full max-w-[33rem] lg:mr-0"
      style={{ animationDelay: "100ms" }}
    >
      <div className="relative z-10 overflow-hidden rounded-2xl bg-navy text-white shadow-float">
        <p className="flex items-center gap-2.5 border-b border-white/10 px-5 py-3.5 text-sm text-white/80">
          <span className="pulse-dot size-2 shrink-0 rounded-full bg-[#7d95ff] text-[#7d95ff]" />
          Time left for Quillfern Health to reply
        </p>
        <pre className="ascii px-5 pt-6 pb-5 text-[8.5px] text-white sm:text-[11px]">
          {bigClock(formatClock(secondsLeft * 1000))}
        </pre>
        <p className="border-t border-white/10 px-5 py-3.5 text-sm text-white/80">
          If it reaches zero, you get <span className="font-semibold text-white">$5</span>.
        </p>
      </div>

      {/* Slides out from under the clock, like a printer, once on load. */}
      <div className="receipt-shadow relative -mt-3 mr-10 ml-auto hidden w-fit sm:block">
        <pre className="receipt print-out ascii bg-white px-4 pt-6 pb-6 text-[10.5px] text-foreground">
          {payoutReceipt}
        </pre>
      </div>
    </div>
  );
}
