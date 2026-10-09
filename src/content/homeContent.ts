/**
 * Copy and data for the homepage (Global Experience. Local Impact.).
 *
 * Source: design-foundation/brand/Sentient_Partners_Brand_GTM_Foundation.pdf.
 * Rules for this file: no invented clients, quotes, or outcome numbers, and no
 * employer names (those belong in a full bio). Everything in HOME_DEMO is
 * sample data for the capability cards and is presented as such on the page.
 */

export const HOME_META = {
  title: 'Sentient Partners | Global Experience. Local Impact.',
  description:
    'Sentient Partners is a founder-led business advisory and technology implementation partner in Auburn, California, bringing global enterprise experience to local businesses.',
};

export const HOME_CONTACT = {
  phone: '(415) 504-2757',
  phoneHref: 'tel:+14155042757',
  email: 'hello@sentientpartners.ai',
  location: 'Auburn, California',
  signature: ['Strategy', 'Intelligence', 'Results'],
};

export const HOME_NAV = [
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'services', label: 'Services' },
  { id: 'founder', label: 'Founder' },
  { id: 'approach', label: 'Approach' },
  { id: 'contact', label: 'Contact' },
] as const;

export const HOME_CTA = {
  book: 'Book an introductory call',
  explore: 'Explore what we do',
};

export const HOME_HERO = {
  heading: ['Global Experience.', 'Local Impact.'],
  body: 'Enterprise-caliber strategy, technology, and operational expertise for growing businesses.',
  imageAlt:
    'The south tower of the Golden Gate Bridge rising out of a sea of fog at dusk, seen from the Marin Headlands.',
};

export const HOME_INTRO = {
  heading: 'Enterprise-caliber thinking. Small business practicality.',
  body: [
    'From your first customer inquiry to the systems behind daily operations, Sentient Partners helps you build a business that runs smarter.',
    'We bring the strategic perspective of global enterprise leadership and the hands-on commitment of a local partner.',
  ],
};

export const HOME_CAPABILITIES = {
  heading: 'Smarter systems. Stronger businesses.',
  body: 'We start with the business problem, then choose the right tools. Here are eight of them, small enough to try.',
  note: 'Every card is a working miniature. The businesses, customers, and numbers in them are sample data.',
};

export type CapabilityId =
  | 'chat'
  | 'voice'
  | 'web'
  | 'apps'
  | 'crm'
  | 'workflow'
  | 'analytics'
  | 'reputation';

export const HOME_CAPABILITY_CARDS: { id: CapabilityId; title: string; outcome: string }[] = [
  { id: 'chat', title: 'AI Chat Assistants', outcome: 'Answer questions and qualify inquiries while your team is on the job.' },
  { id: 'voice', title: 'AI Voice Agents', outcome: 'Pick up after hours, take the details, and book the visit.' },
  { id: 'web', title: 'Websites & SEO', outcome: 'Make it easy for the right customers to find you and take the next step.' },
  { id: 'apps', title: 'Custom Business Apps', outcome: 'Keep customers, estimates, invoices, and the schedule in one place.' },
  { id: 'crm', title: 'CRM & Lead Management', outcome: 'See every inquiry from first conversation to paid invoice.' },
  { id: 'workflow', title: 'Workflow Automation', outcome: 'Follow up, schedule, and notify without someone remembering to.' },
  { id: 'analytics', title: 'Marketing & Analytics', outcome: 'Know which campaigns bring calls, and which only bring clicks.' },
  { id: 'reputation', title: 'Reputation Management', outcome: 'Ask for reviews consistently and reply with care.' },
];

export const HOME_PILLARS = {
  heading: 'One partner. Four ways to build a stronger business.',
  pillars: [
    {
      id: 'attract',
      name: 'Attract & Convert',
      outcome: 'Make it easier for the right customers to find you, trust you, and take the next step.',
      scope: 'Websites, local search, Google Ads, reviews, and outreach',
    },
    {
      id: 'automate',
      name: 'Automate & Communicate',
      outcome: 'Stay responsive without asking the owner to be available every minute.',
      scope: 'CRM, AI-assisted phone and chat, booking, reminders, and follow-up',
    },
    {
      id: 'operate',
      name: 'Operate & Scale',
      outcome: 'Reduce duplicate work and keep teams aligned around reliable information.',
      scope: 'Custom apps, field and office workflows, estimates, invoices, and scheduling',
    },
    {
      id: 'advise',
      name: 'Advise & Grow',
      outcome: 'Establish priorities, remove bottlenecks, and build the next stage on a stronger foundation.',
      scope: 'Business planning, operational improvement, launch support, and financial readiness',
    },
  ],
} as const;

export const HOME_FOUNDER = {
  heading: 'Experience That Makes a Difference.',
  body: [
    'Founder and Principal Consultant Troy Hill brings decades of senior executive leadership across global enterprises, diverse industries, and mission-critical operations.',
    'Today, he brings that experience home to Auburn, working directly with local business owners to connect strategy with execution, simplify complexity, and build stronger businesses.',
  ],
  closing: 'Global perspective. Personal commitment. Practical results.',
  points: [
    {
      name: 'Executive perspective, without the bureaucracy',
      detail: 'Decisions informed by large-scale operations, translated into right-sized plans for real budgets and teams.',
    },
    {
      name: 'Strategy connected to execution',
      detail: 'We help design, implement, and improve the workflows and systems that make a business run.',
    },
    {
      name: 'One accountable relationship',
      detail: 'A local partner who coordinates the moving pieces and stays involved after launch.',
    },
  ],
  imageAlt: 'Morning light and mist between the trunks of old-growth redwoods.',
};

export const HOME_FOUNDER_NAME = {
  name: 'Troy Hill',
  title: 'Founder and Principal Consultant',
};

export const HOME_AUBURN = {
  heading: 'Local, reachable, and invested.',
  body: [
    'Sentient Partners is based in Auburn. Clients work directly with an accountable partner, not a distant ticket queue.',
    'We serve Placer County, Greater Sacramento, and businesses looking for an experienced, accessible partner.',
  ],
  imageAlt:
    'Old Town Auburn at dusk: brick storefronts under string lights, with the Placer County Courthouse dome on the hill behind.',
};

export const HOME_PROCESS = {
  heading: 'Start with one valuable improvement. Prove it works. Expand deliberately.',
  steps: [
    { name: 'Discover', detail: 'A focused conversation about goals, friction, current systems, and the cost of doing nothing.' },
    { name: 'Strategize', detail: 'Define the first measurable improvement, with scope, ownership, timing, and investment.' },
    { name: 'Implement', detail: 'Build, integrate, test, and train, with your approval before launch.' },
    { name: 'Optimize', detail: 'Support the solution, review what changes, and identify the next worthwhile improvement.' },
  ],
} as const;

export const HOME_CLOSE = {
  heading: 'Let’s identify one meaningful improvement and build from there.',
  body: 'You do not need a large corporate budget to benefit from enterprise-level thinking. Start with a 20‑minute introduction.',
};

/* ------------------------------------------------------------------ */
/* Sample data for the capability cards. All fictional.                */
/* ------------------------------------------------------------------ */

export const HOME_DEMO = {
  /** The fictional business most cards are set in. */
  business: 'Summit Air & Heat',
  trade: 'Heating & cooling',

  chat: {
    greeting: 'Hi, this is the Summit Air & Heat assistant. How can I help?',
    prompts: [
      {
        label: 'Do you service Auburn?',
        reply: 'Yes. We cover Auburn, Newcastle, and Loomis. Is this for a repair or a new system?',
      },
      {
        label: 'My AC stopped cooling',
        reply: 'Sorry to hear that. I can hold a technician visit for tomorrow, 9 to 11 AM. What is the best number to confirm?',
      },
      {
        label: 'How much is a tune-up?',
        reply: 'A seasonal tune-up is a flat fee, and I can send the current rate by text. Would you like to pick a time as well?',
      },
    ],
    liveLabel: 'Ask our own assistant',
    livePlaceholder: 'Ask about Sentient Partners',
    liveSend: 'Send to our assistant',
  },

  voice: {
    scenarioId: 'hvac',
    idle: 'A homeowner calls after hours. Press play to hear the call.',
    note: 'Scripted call, generated voices. Nothing plays until you press play.',
  },

  web: {
    heading: 'Comfort you can count on.',
    body: 'Heating and air service across the foothills.',
    action: 'Request service',
    points: ['Same-week visits', 'Licensed and insured', 'Upfront pricing'],
    search: {
      query: 'heating repair near Auburn',
      title: 'Summit Air & Heat | Auburn, CA',
      url: 'summitairheat.example',
      description: 'Furnace and AC repair, tune-ups, and new systems. Request service online.',
    },
  },

  apps: {
    tabs: [
      {
        id: 'customers',
        label: 'Customers',
        rows: [
          { primary: 'Dana Whitfield', secondary: 'Newcastle', status: 'Active' },
          { primary: 'Marcus Oyelaran', secondary: 'Auburn', status: 'Active' },
          { primary: 'Priya Raman', secondary: 'Loomis', status: 'New' },
          { primary: 'Elena Sorvino', secondary: 'Auburn', status: 'Active' },
        ],
      },
      {
        id: 'estimates',
        label: 'Estimates',
        rows: [
          { primary: 'Heat pump replacement', secondary: 'Whitfield', status: 'Sent' },
          { primary: 'Duct sealing', secondary: 'Raman', status: 'Draft' },
          { primary: 'Furnace tune-up', secondary: 'Oyelaran', status: 'Approved' },
          { primary: 'AC repair', secondary: 'Sorvino', status: 'Approved' },
        ],
      },
      {
        id: 'invoices',
        label: 'Invoices',
        rows: [
          { primary: 'INV-1042', secondary: 'Oyelaran', status: 'Paid' },
          { primary: 'INV-1043', secondary: 'Whitfield', status: 'Due' },
          { primary: 'INV-1044', secondary: 'Raman', status: 'Draft' },
          { primary: 'INV-1045', secondary: 'Sorvino', status: 'Paid' },
        ],
      },
      {
        id: 'schedule',
        label: 'Schedule',
        rows: [
          { primary: 'Tue 9:00 AM', secondary: 'Tune-up, Oyelaran', status: 'Booked' },
          { primary: 'Wed 1:30 PM', secondary: 'Estimate visit, Raman', status: 'Booked' },
          { primary: 'Thu 10:00 AM', secondary: 'Install, Whitfield', status: 'Held' },
          { primary: 'Fri 8:30 AM', secondary: 'AC repair, Sorvino', status: 'Booked' },
        ],
      },
    ],
  },

  crm: {
    stages: ['New', 'Quoted', 'Booked'],
    leads: [
      { id: 'l1', name: 'Dana Whitfield', need: 'Heat pump quote', stage: 0 },
      { id: 'l2', name: 'Priya Raman', need: 'Duct sealing', stage: 0 },
      { id: 'l5', name: 'Tomás Reyes', need: 'Thermostat install', stage: 0 },
      { id: 'l3', name: 'Marcus Oyelaran', need: 'Furnace tune-up', stage: 1 },
      { id: 'l4', name: 'Elena Sorvino', need: 'AC repair', stage: 2 },
    ],
  },

  workflow: {
    steps: [
      { name: 'Lead captured', detail: 'Web form: AC repair, Auburn' },
      { name: 'Follow-up sent', detail: 'Text reply with next available times' },
      { name: 'Visit scheduled', detail: 'Tomorrow, 9 to 11 AM' },
      { name: 'Team notified', detail: 'Job added to the technician’s day' },
    ],
  },

  analytics: {
    label: 'Illustrative demo',
    campaigns: [
      { id: 'search', name: 'Local search', leads: 38, calls: 21, costPerLead: 24, weeks: [5, 7, 6, 9, 11] },
      { id: 'mailer', name: 'Spring mailer', leads: 14, calls: 9, costPerLead: 41, weeks: [2, 4, 3, 3, 2] },
      { id: 'reviews', name: 'Review requests', leads: 22, calls: 12, costPerLead: 9, weeks: [3, 3, 5, 5, 6] },
    ],
  },

  reputation: {
    reviewer: 'Sample customer',
    stars: 5,
    review: 'Technician arrived on time, explained the repair, and left everything clean.',
    draft: 'Thank you for the kind words. We are glad the repair went smoothly, and we will pass this along to your technician.',
    request: 'Hi Dana, thanks for choosing Summit Air & Heat. Would you share a quick review of today’s visit?',
  },
} as const;
