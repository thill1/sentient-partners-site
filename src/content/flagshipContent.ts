/**
 * Copy for the flagship homepage. Positioning and claims come from
 * design-foundation/brand/Sentient_Partners_Brand_GTM_Foundation.pdf; the
 * business in FLAGSHIP_DAY is fictional and is presented as such on the page.
 */
import type { CapabilityId } from './homeContent';

export const FLAGSHIP_NAV = [
  { id: 'founder', label: 'Founder' },
  { id: 'services', label: 'Services' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'approach', label: 'Approach' },
  { id: 'contact', label: 'Contact' },
] as const;

export const FLAGSHIP_RINGS = {
  heading: 'One partner. Four ways to build a stronger business.',
  body: 'A redwood grows outward from its heartwood. So does the work: strategy at the center, and everything customers see growing around it.',
  /** From the heartwood out to the bark. */
  rings: [
    {
      id: 'advise',
      name: 'Advise & Grow',
      place: 'The heartwood',
      outcome: 'Establish priorities, remove bottlenecks, and build the next stage on a stronger foundation.',
      scope: 'Business planning, operational improvement, launch support, and financial readiness',
    },
    {
      id: 'operate',
      name: 'Operate & Scale',
      place: 'The second ring',
      outcome: 'Reduce duplicate work and keep teams aligned around reliable information.',
      scope: 'Custom apps, field and office workflows, estimates, invoices, and scheduling',
    },
    {
      id: 'automate',
      name: 'Automate & Communicate',
      place: 'The third ring',
      outcome: 'Stay responsive without asking the owner to be available every minute.',
      scope: 'CRM, AI-assisted phone and chat, booking, reminders, and follow-up',
    },
    {
      id: 'attract',
      name: 'Attract & Convert',
      place: 'The outer ring',
      outcome: 'Make it easier for the right customers to find you, trust you, and take the next step.',
      scope: 'Websites, local search, Google Ads, reviews, and outreach',
    },
  ],
} as const;

export const FLAGSHIP_DAY = {
  heading: 'One Tuesday on Main Street.',
  body: 'Summit Air & Heat is a business we made up. Its Tuesday is the kind our clients have. Eight moments, each one you can try.',
  note: 'Summit Air & Heat, its customers, and its numbers are fictional.',
  previous: 'Earlier',
  next: 'Later',
};

export interface DayMoment {
  id: CapabilityId;
  time: string;
  meridiem: 'AM' | 'PM';
  title: string;
  story: string;
  /** Sky from zenith to horizon at this hour. */
  sky: [string, string, string];
  /** Whether the copy on that sky is light or dark. */
  ink: 'light' | 'dark';
}

export const FLAGSHIP_MOMENTS: DayMoment[] = [
  {
    id: 'web',
    time: '6:40',
    meridiem: 'AM',
    title: 'Websites & SEO',
    story: 'Before the office opens, a homeowner searches for heating repair near Auburn. Summit is what she finds.',
    sky: ['#1E2760', '#7A6CA8', '#F1B7A2'],
    ink: 'light',
  },
  {
    id: 'chat',
    time: '7:15',
    meridiem: 'AM',
    title: 'AI Chat Assistants',
    story: 'She has a question. The site answers it, takes her details, and offers a time.',
    sky: ['#8FA6D6', '#DCCFE2', '#FCE3CE'],
    ink: 'dark',
  },
  {
    id: 'crm',
    time: '9:30',
    meridiem: 'AM',
    title: 'CRM & Lead Management',
    story: 'When the office opens, her inquiry is already in the pipeline with everything she said.',
    sky: ['#B4CBEA', '#E4ECF6', '#F7F5F0'],
    ink: 'dark',
  },
  {
    id: 'workflow',
    time: '10:05',
    meridiem: 'AM',
    title: 'Workflow Automation',
    story: 'The follow-up, the booking, and the technician’s notice go out without anyone remembering to send them.',
    sky: ['#A5C3E8', '#DBE8F5', '#F7F5F0'],
    ink: 'dark',
  },
  {
    id: 'apps',
    time: '1:20',
    meridiem: 'PM',
    title: 'Custom Business Apps',
    story: 'Office and field look at the same customers, estimates, invoices, and schedule.',
    sky: ['#C6DAF0', '#EFF3F4', '#FBF6EA'],
    ink: 'dark',
  },
  {
    id: 'reputation',
    time: '4:45',
    meridiem: 'PM',
    title: 'Reputation Management',
    story: 'The job is done. A review request goes out, and a reply is drafted for the owner to approve.',
    sky: ['#AEBBDD', '#F0D9C0', '#F5C48C'],
    ink: 'dark',
  },
  {
    id: 'voice',
    time: '7:12',
    meridiem: 'PM',
    title: 'AI Voice Agents',
    story: 'The office is closed and an air conditioner has failed. The phone is answered anyway.',
    sky: ['#171F58', '#65498F', '#E38D7B'],
    ink: 'light',
  },
  {
    id: 'analytics',
    time: '9:00',
    meridiem: 'PM',
    title: 'Marketing & Analytics',
    story: 'At the end of the day, the owner can see what brought the calls in.',
    sky: ['#050A20', '#0D1F4E', '#1D2D66'],
    ink: 'light',
  },
];

export const FLAGSHIP_SPAN = {
  heading: 'A clear span from where you are to what comes next.',
  body: 'Start with one valuable improvement. Prove it works. Expand deliberately.',
};
