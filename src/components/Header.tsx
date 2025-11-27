import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "./Button";

type Theme = "light" | "dark";

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "Services", href: "#services" },
  { label: "Process", href: "#process" },
  { label: "Demo", href: "#demo" },
  { label: "Pricing", href: "#pricing" },
  { label: "Results", href: "#results" },
  { label: "FAQ", href: "#faq" },
];

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";

  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") {
    return stored as Theme;
  }

  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
};

const applyThemeToDocument = (theme: Theme) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

export const Header: React.FC = () => {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyThemeToDocument(initial);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyThemeToDocument(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", next);
    }
  };

  const handleNavClick = (href: string) => {
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const openBooking = () => {
    window.dispatchEvent(new CustomEvent("open-booking-modal"));
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      {/* Top promo banner – transparent, floating over hero background */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-2 text-[11px] sm:text-xs md:text-sm font-semibold tracking-wide text-sky-100 drop-shadow-md">
            <span className="uppercase">
              LIMITED TIME OFFER · FREE 2ND MONTH · ENDS 12/31/25
            </span>
          </div>
        </div>
      </div>

      {/* Main navigation – glassmorphism pill over hero background */}
      <div c
