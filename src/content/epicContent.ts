/**
 * Copy for the homepage film and the street below it. Positioning and claims
 * follow design-foundation/brand/Sentient_Partners_Brand_GTM_Foundation.pdf.
 * Nothing here names an employer or a client, or states a result.
 */
import type { CapabilityId } from './homeContent';

export const EPIC_NAV = [
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'services', label: 'Services' },
  { id: 'founder', label: 'Founder' },
  { id: 'approach', label: 'Approach' },
  { id: 'contact', label: 'Contact' },
] as const;

/** Cruising altitude, and Auburn's elevation, in feet. */
export const EPIC_ALTITUDE = { from: 38000, to: 1227 };

export const EPIC_BEATS = [
  {
    id: 'title',
    range: [-1, 0.13],
    heading: 'Global Experience. Local Impact.',
    body: 'Enterprise-caliber strategy, technology, and operational expertise for growing businesses.',
  },
  {
    id: 'founder',
    range: [0.2, 0.36],
    heading: 'Decades of leadership at global scale.',
    body: 'Our founder led organizations of thousands and mission-critical operations across banking, brokerage, airlines, and healthcare.',
  },
  {
    id: 'fog',
    range: [0.44, 0.59],
    heading: 'Perspective is the view from above. Impact happens on the ground.',
    body: '',
  },
  {
    id: 'thesis',
    range: [0.66, 0.82],
    heading: 'Enterprise-caliber thinking. Small business practicality.',
    body: 'We bring the strategic perspective of global enterprise leadership and the hands-on commitment of a local partner.',
  },
  {
    id: 'home',
    range: [0.89, 2],
    heading: 'Auburn, California.',
    body: 'Local, reachable, and invested. Clients work directly with an accountable partner, not a distant ticket queue.',
  },
] as const;

/** Where each chapter of the film sits, for the rail at the side. */
export const EPIC_CHAPTERS = [
  { at: 0, label: 'Cruising altitude' },
  { at: 0.28, label: 'The Golden Gate' },
  { at: 0.52, label: 'Through the fog' },
  { at: 0.74, label: 'The foothills' },
  { at: 0.97, label: 'Auburn' },
] as const;

export const EPIC_SCROLL_CUE = 'Scroll to descend';

export const EPIC_STREET = {
  heading: 'Eight windows on Main Street.',
  previous: 'Previous window',
  next: 'Next window',
  note: 'Summit Air & Heat, its customers, and its numbers are fictional.',
};

/** The sign over each storefront. The full capability name is the card title. */
export const EPIC_SIGNS: Record<CapabilityId, string> = {
  web: 'Web & Search',
  chat: 'Chat',
  voice: 'Voice',
  apps: 'Apps',
  crm: 'Pipeline',
  workflow: 'Workflow',
  analytics: 'Analytics',
  reputation: 'Reviews',
};

export const EPIC_STREET_ORDER: CapabilityId[] = ['web', 'chat', 'voice', 'apps', 'crm', 'workflow', 'analytics', 'reputation'];
