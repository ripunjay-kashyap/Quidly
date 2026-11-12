import Link from "next/link";
import { Logo } from "@/lib/ui";

const columns = [
  {
    title: "Job seekers",
    links: [
      { href: "/jobs", label: "Find jobs" },
      { href: "/candidate", label: "My applications" },
      { href: "/#how-it-works", label: "How it works" },
    ],
  },
  {
    title: "Companies",
    links: [
      { href: "/company", label: "Start hiring" },
      { href: "/#pricing", label: "Pricing" },
      { href: "/#faq", label: "Questions" },
    ],
  },
];

const builtWith = [
  { name: "PayPal", role: "Login, holds and payouts" },
  { name: "Elastic", role: "AI feedback checks" },
  { name: "AG Grid", role: "Reply queue" },
  { name: "Render", role: "Backend" },
  { name: "Vercel", role: "Website" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-2">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.3fr]">
        <div className="flex max-w-xs flex-col gap-4">
          <Logo />
          <p className="text-sm leading-relaxed text-muted">
            The job board where every application gets an answer: feedback, an interview invite, or $5.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="text-sm font-semibold">{column.title}</h2>
            <ul className="mt-4 flex flex-col gap-3 text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link className="text-muted transition-colors hover:text-foreground" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="text-sm font-semibold">Built with</h2>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {builtWith.map((tool) => (
              <li key={tool.name} className="text-muted">
                <span className="font-medium text-foreground">{tool.name}</span> · {tool.role}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-6 text-[0.8125rem] text-muted sm:flex-row sm:justify-between">
          <p>© 2026 Quidly. Built for the PayPal AI Hackathon.</p>
          <p>PayPal is in test mode, so no real money moves.</p>
        </div>
      </div>
    </footer>
  );
}
