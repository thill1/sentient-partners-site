import type { LucideIcon } from 'lucide-react';
import type { SiteSettings } from './lib/siteSettingsSchema';

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  features: string[];
  icon: LucideIcon;
  details: {
    heading: string;
    useCase: string;
    benefits: string[];
  };
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isTyping?: boolean;
  timestamp: Date;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

export type AppRoute = 'home' | 'admin';

export interface BannerDisplayState {
  visible: boolean;
  message: string;
  ctaText: string;
  ctaUrl: string;
  variant: 'info' | 'success' | 'warning';
}

export interface SiteSettingsState {
  settings: SiteSettings;
  bannerState: BannerDisplayState;
  error: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  applySettings: (settings: SiteSettings) => void;
}