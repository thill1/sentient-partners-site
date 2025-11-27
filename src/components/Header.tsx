import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { Logo } from './Logo';
import { Menu, X, Sun, Moon } from 'lucide-react';

const NAV_LINKS = [
  { href: '#services', label: 'Services' },
  { href: '#process', label: 'Process' },
  { href: '#demo', label: 'Demo' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#testimonials', label: 'Results' },
  { href: '#faq', label: 'FAQ' },
];

export const Header: React.FC = () => {
  const [isDark, setIsDark] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Bootstrap theme from localStorage / OS
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('theme');
    const prefersDark =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    const initial = stored === 'dark' || (!stored && prefersDark);
    setIsDark(initial);

    const root = document.documentElement;
    if (initial) root.classList.add('dark');
    else root.classList.remove('dark');
  }, []);

  // Keep <html class="dark"> in sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;

    if (isDark) {
      root.classList.add('dark');
      window.localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      window.localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Track scroll for header blur
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onScroll = (
