"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useAuthDialog } from "@/lib/auth-dialog";
import { Icon } from "@/lib/icons";
import { logOut, type Role } from "@/lib/login";
import { Logo, SlotPips } from "@/lib/ui";
import { useSession } from "@/lib/use-session";

const navLinks = [
  { href: "/jobs", label: "Find jobs" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "For companies" },
];

export function SiteHeader() {
  const { user } = useSession();
  const openAuth = useAuthDialog();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  function openFromMenu(role?: Role) {
    closeMenu();
    openAuth({ role });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-white/80 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-8">
        <Link href="/" onClick={closeMenu} aria-label="Quidly home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-[0.9375rem] font-medium text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {user === undefined && <div className="skeleton h-8 w-72" />}
          {user === null && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => openAuth({})}>
                Log in
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => openAuth({ role: "CANDIDATE" })}>
                Start applying
              </button>
              <button className="btn btn-dark btn-sm" onClick={() => openAuth({ role: "RECRUITER" })}>
                Start hiring
              </button>
            </>
          )}
          {user?.role === "CANDIDATE" && (
            <>
              <Link
                href="/candidate"
                className="mr-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
                title="Applications you can still send. A slot frees up when an application is answered."
              >
                <SlotPips open={user.availableSlots} />
                {user.availableSlots} of 5 slots open
              </Link>
              <Link className="btn btn-secondary btn-sm" href="/candidate">
                My applications
              </Link>
              <AccountMenu email={user.email} subtitle="Job seeker" />
            </>
          )}
          {user?.role === "RECRUITER" && (
            <>
              <Link className="btn btn-primary btn-sm" href="/company">
                Company dashboard
              </Link>
              <AccountMenu email={user.email} subtitle={user.companyName ?? "Company account"} />
            </>
          )}
        </div>

        <button
          className="btn btn-ghost btn-sm ml-auto px-2 lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? "x" : "menu"} size={20} />
          <span className="sr-only">Menu</span>
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-border bg-white lg:hidden">
          <nav className="container-page flex flex-col gap-1 py-4" aria-label="Mobile">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-lg px-3 py-2.5 font-medium hover:bg-surface-2"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-4">
              {user === null && (
                <>
                  <button className="btn btn-secondary" onClick={() => openFromMenu("CANDIDATE")}>
                    Start applying
                  </button>
                  <button className="btn btn-dark" onClick={() => openFromMenu("RECRUITER")}>
                    Start hiring
                  </button>
                  <button className="btn btn-ghost" onClick={() => openFromMenu()}>
                    Log in
                  </button>
                </>
              )}
              {user && (
                <>
                  <p className="px-3 text-sm text-muted">
                    {user.email}
                    {user.role === "CANDIDATE" && ` · ${user.availableSlots} of 5 slots open`}
                  </p>
                  <Link
                    className="btn btn-primary"
                    href={user.role === "RECRUITER" ? "/company" : "/candidate"}
                    onClick={closeMenu}
                  >
                    {user.role === "RECRUITER" ? "Company dashboard" : "My applications"}
                  </Link>
                  <button className="btn btn-secondary" onClick={logOut}>
                    Log out
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function AccountMenu({ email, subtitle }: { email: string; subtitle: string }) {
  return (
    <Dropdown
      label={
        <span className="grid size-7 place-items-center rounded-full bg-navy text-xs font-semibold text-white uppercase">
          {email.charAt(0)}
        </span>
      }
      ariaLabel="Account"
    >
      <div className="px-3 pt-2 pb-3">
        <p className="truncate text-sm font-semibold">{email}</p>
        <p className="truncate text-[0.8125rem] text-muted">{subtitle}</p>
      </div>
      <button
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        onClick={logOut}
      >
        <Icon name="log-out" />
        Log out
      </button>
    </Dropdown>
  );
}

function Dropdown({ label, ariaLabel, children }: { label: ReactNode; ariaLabel?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        className="btn btn-ghost btn-sm gap-1.5"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {label}
        <Icon name="chevron-down" size={14} />
      </button>
      {open && (
        <div
          className="pop card absolute top-full right-0 mt-2 w-72 origin-top-right p-1.5 shadow-float"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
