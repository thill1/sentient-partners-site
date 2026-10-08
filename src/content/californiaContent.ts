/**
 * Copy and data for the California Intelligence concept (/#/california).
 * Kept separate from siteContent.ts so the production homepage is untouched.
 *
 * Rule for this file: no invented clients, quotes, biographies, or outcome
 * numbers. Anything awaiting real material is marked `placeholder: true`.
 */

export const CA_IMAGES = {
  bridge: {
    name: 'bay-bridge-night',
    width: 2400,
    height: 1572,
    alt: 'The Bay Bridge at night, traffic streaming across its upper deck into downtown San Francisco, fog resting on the skyline.',
  },
  night: {
    name: 'golden-gate-night',
    width: 2400,
    height: 1600,
    alt: 'The Golden Gate Bridge lit at night across dark water.',
  },
  redwoods: {
    name: 'redwoods',
    width: 2400,
    height: 1599,
    alt: 'A road disappearing into a stand of redwoods in fog on Mount Tamalpais.',
  },
  firstLight: {
    name: 'big-sur-first-light',
    width: 2400,
    height: 1599,
    alt: 'Big Sur ridgelines in low golden light above a sea of fog.',
  },
  dawn: {
    name: 'sf-dawn',
    width: 2400,
    height: 1600,
    alt: 'San Francisco’s skyline rising out of morning fog as the sun comes up.',
  },
} as const;

/**
 * One night in the life of the business, dusk to dawn. Each photographic
 * scene is a stop on the night rail. Times are narrative markers for the page,
 * not capture times of the photographs.
 */
export const CA_NIGHT = [
  { id: 'top', place: 'San Francisco', time: '7:12 PM' },
  { id: 'demo', place: 'Golden Gate', time: '8:40 PM' },
  { id: 'system', place: 'Bay Bridge', time: '9:47 PM' },
  { id: 'redwoods', place: 'Mount Tamalpais', time: '3:40 AM' },
  { id: 'process', place: 'The next day', time: '6:05 AM' },
  { id: 'get-started', place: 'San Francisco', time: '6:40 AM' },
] as const;

const scene = (id: (typeof CA_NIGHT)[number]['id']) => {
  const s = CA_NIGHT.find((n) => n.id === id)!;
  return `${s.place}, ${s.time}`;
};

export const CA_SCENES = {
  bridge: scene('system'),
  night: scene('demo'),
  redwoods: scene('redwoods'),
  firstLight: scene('process'),
  dawn: scene('get-started'),
};

export type CaImageKey = keyof typeof CA_IMAGES;

export const CA_NAV = [
  { id: 'demo', label: 'Live demo' },
  { id: 'about', label: 'About' },
  { id: 'system', label: 'The system' },
  { id: 'process', label: 'Approach' },
  { id: 'pricing', label: 'Investment' },
] as const;

export const CA_META = {
  title: 'Sentient Partners | California Intelligence',
  description: 'Strategy and implementation for service businesses. Connect inquiries, bookings, follow-up, and operations with Sentient Partners.',
};

export const CA_CTA = {
  primary: 'Book an introductory call',
  seeDemo: 'See the system in action',
  callDescription: '20 minutes with Sentient Partners · Cal Video',
};

export const CA_HERO = {
  heading: ['Your day ends.', 'The work keeps moving.'],
  body:
    'We help service businesses connect inquiries, bookings, follow-up, and operations. Strategy first, then systems built around your team.',
  callNote: 'Start with a conversation. Decide the next step together.',
  caption: 'San Francisco, 7:12 PM',
  sceneLabel: 'Illustrated inquiry flow',
  chaosLabel: 'Disconnected',
  orderLabel: 'Connected',
  chaosLine: 'Calls and messages arrive separately. The next step depends on someone catching them.',
  orderLine: 'Inquiries connect to routing, booking, and follow-up, with your team in the loop.',
  /** The scene's running count, after a number. */
  answered: 'routed in scene',
  unanswered: 'waiting in scene',
  /** An invitation to try the scene, for mouse and for touch. */
  sendHint: 'Click the city to place a call',
  sendHintTouch: 'Tap the city to place a call',
};

/** Section 2: credibility we can prove today: the systems running on this page. */
export const CA_LIVE_SYSTEMS = {
  heading: 'Judge us by what already runs.',
  body:
    'Every system below is running on this page right now. Use them the way your customers would, then judge the work.',
  systems: [
    {
      id: 'front-desk',
      name: 'AI front desk',
      detail: 'Answers an after-hours call, triages it, handles pricing, and books the appointment in a generated voice.',
      action: 'Hear a call',
      target: 'demo',
    },
    {
      id: 'concierge',
      name: 'Sentient Concierge',
      detail: 'A live AI agent you can type or talk to. It remembers the conversation and knows what you looked at.',
      action: 'Talk to it',
      target: 'concierge',
    },
    {
      id: 'diagnostic',
      name: 'Opportunity diagnostic',
      detail: 'Turns an industry choice and three numbers into an illustrative estimate and preliminary plan.',
      action: 'Run yours',
      target: 'diagnosis',
    },
    {
      id: 'voice-nav',
      name: 'Voice navigation',
      detail: 'Hold the microphone and say where you want to go. Supported browsers only.',
      action: 'Show me where',
      target: 'voice',
    },
  ],
  voiceUnavailable: 'Not available in this browser',
  industriesLabel: 'Designed around',
  industries: 'home services, HVAC, dental, legal, fitness and wellness, and professional services.',
} as const;

/** Section 3: diagnosis. Analytical, not alarmist. */
export const CA_DIAGNOSIS = {
  heading: 'An inquiry is only the start.',
  headingSecond: 'What happens next matters.',
  body:
    'Missed calls, scattered records, and manual follow-up create gaps between the first inquiry and the booked job. These are the places we look first.',
  /** The ends of the path drawn above the table. */
  pathStart: 'First inquiry',
  pathEnd: 'Booked job',
  columns: ['Symptom', 'What it looks like', 'Where it costs you'],
  rows: [
    ['Unanswered inquiries', 'Calls go to voicemail and web inquiries wait in an inbox.', 'Customers move on before the conversation starts.'],
    ['Disconnected software', 'Phone, forms, calendar, and CRM each hold part of the story.', 'Staff re-key data and still miss steps.'],
    ['Manual follow-up', 'Quotes, reminders, and reviews depend on memory.', 'Follow-up happens when someone has time.'],
  ],
} as const;

/** Section 4: one connected operating architecture. */
export const CA_ARCHITECTURE = {
  heading: 'One connected path through your business.',
  body:
    'We map how work moves between your customers, team, and tools. Then we connect the steps that need attention, using automation where it helps and human handoffs where judgment matters.',
  stages: [
    { name: 'Capture', detail: 'Receive inquiries across phone, web, chat, and text.', scope: 'Voice receptionist, website, chat, and SMS' },
    { name: 'Understand', detail: 'Capture the need, urgency, and context, then route the right next step.', scope: 'Qualification, routing, and human handoffs' },
    { name: 'Convert', detail: 'Connect conversations to bookings and follow-up.', scope: 'Calendar, reminders, quotes, and reviews' },
    { name: 'Operate', detail: 'Keep customer records, workflows, and reporting connected.', scope: 'CRM, operations, and reporting' },
  ],
} as const;

/** Section 5: the live demo, framed as the move into the technology layer. */
export const CA_DEMO = {
  heading: 'See what happens when the office is closed.',
  body:
    'Choose a business and hear an AI front desk handle an after-hours inquiry, from first ring to a simulated booking.',
  statusLabel: 'After-hours line',
  footnote:
    'Scenarios are scripted demonstrations with voices generated live. “Try it yourself” connects you to a live AI agent you can ask anything.',
};

/** Section 6: system architecture, replacing six equal service cards. */
export const CA_PILLARS = {
  heading: 'Four layers. One operating system.',
  body:
    'Every engagement is designed across the same four layers, in the order your business needs them.',
  pillars: [
    {
      name: 'Capture',
      detail: 'Meet demand wherever it arrives.',
      scope: ['AI voice receptionist', 'Website and landing pages', 'Chat and SMS agents'],
    },
    {
      name: 'Understand',
      detail: 'Know who is asking and what they need.',
      scope: ['Qualification logic', 'Intent and urgency', 'Context carried between channels'],
    },
    {
      name: 'Convert',
      detail: 'Turn a conversation into committed work.',
      scope: ['Routing and booking', 'Follow-up and reactivation', 'Review requests'],
    },
    {
      name: 'Operate',
      detail: 'Keep the business running on accurate information.',
      scope: ['CRM and calendar integration', 'Workflow automation', 'Reporting and roadmap'],
    },
  ],
  catalogToggle: 'View the full service catalog',
} as const;

export const CA_REDWOODS = {
  line: 'Your business is already a system.',
  lineSecond: 'We make the system intelligent.',
};

/** Section 8: the signature consulting offer. */
export const CA_OPPORTUNITY_MAP = {
  heading: 'A clear plan before you build.',
  body:
    'The next step may be a Sentient AI Opportunity Map: a strategic review of where work gets stuck and what to build first. We agree on scope and investment before the work begins.',
  coversLabel: 'The full map covers',
  documentTitle: 'Opportunity Map',
  documentSubtitle: 'Example structure',
  covers: [
    'Missed demand and response delays',
    'Disconnected systems and manual work',
    'Automation priorities and potential value',
    'A practical implementation sequence',
  ],
  previewEyebrow: 'Preliminary read',
  previewHeading: 'Explore a preliminary estimate',
  previewBody: 'Choose your industry and adjust three numbers. This optional illustration gives you a starting point for our conversation.',
  estimateLabel: 'Estimated monthly revenue in missed inquiries',
  generateLabel: 'Draft my preliminary map',
  generatingLabel: 'Drafting your preliminary map…',
  readyEyebrow: 'Preliminary Opportunity Map',
  disclaimer:
    'This is an illustrative scenario from your inputs, not a forecast or guarantee. An agreed Opportunity Map engagement examines your real workflows and data.',
};

/**
 * Section 9: evidence. The existing homepage testimonials have no
 * provenance in the repository, so they are not used here. Each slot is
 * built for a real, approved implementation.
 */
export const CA_EVIDENCE = {
  heading: 'Every case study, held to the same standard.',
  body:
    'Every case study here will name the operational problem, the system we designed, and an outcome the client has verified. No borrowed logos, no rounded-up percentages.',
  note: 'Case studies are published here once each client has reviewed and approved them.',
  status: 'Format shown. No case studies published yet.',
  /** What each field of a case study will hold, in the order of `fields`. */
  standards: [
    'Named, with the client’s permission.',
    'What was breaking, in the client’s own words.',
    'What we built, and why that came first.',
    'Every phone line, calendar, and tool it touches.',
    'How long it took, and who did what.',
    'A number the client has checked and signed off.',
  ],
  fields: [
    'Client / project',
    'Operational problem',
    'System designed',
    'Systems connected',
    'Implementation',
    'Verified outcome',
  ],
  cases: [
    {
      placeholder: true,
      label: 'Case study 01',
      industry: 'Home services',
      values: [
        'Pending client approval',
        'To be written from the engagement record',
        'Pending',
        'Pending',
        'Pending',
        'Published only once verified by the client',
      ],
    },
    {
      placeholder: true,
      label: 'Case study 02',
      industry: 'Professional services',
      values: [
        'Pending client approval',
        'To be written from the engagement record',
        'Pending',
        'Pending',
        'Pending',
        'Published only once verified by the client',
      ],
    },
  ],
} as const;

export const CA_FOUNDER = {
  heading: 'Built by operators. Designed for operators.',
  body: [
    'Sentient Partners is a small, senior consultancy. The person who diagnoses your business is the person who designs the system.',
    'We work with a limited number of businesses at a time, so every engagement gets the judgment it needs.',
  ],
  name: 'Troy Hill',
  title: 'Founder & Principal Consultant',
  portraitNote: 'Portrait to come',
};

export const CA_ENGAGEMENT = {
  heading: 'From first conversation to connected work.',
  stages: [
    {
      name: 'Introductory call',
      detail:
        'We discuss how your business runs, where work gets stuck, and whether we are a fit. Together we decide the next step.',
      receive: 'A clear next step',
    },
    {
      name: 'Discovery and roadmap',
      detail:
        'If we agree to proceed, we scope an Opportunity Map and a sequenced implementation plan around your calls, tools, and team.',
      receive: 'An agreed diagnostic and roadmap',
    },
    {
      name: 'Implementation',
      detail:
        'We build, connect, and test the systems inside your phones, calendar, website, and CRM, then hand them to your team.',
      receive: 'Working systems',
    },
    {
      name: 'Optimization',
      detail:
        'We monitor, refine, and extend the systems as your offers, volume, and team change.',
      receive: 'Review and refinement',
    },
  ],
};

export const CA_INVESTMENT = {
  heading: 'Scoped to the business, not a rate card.',
  body:
    'Every engagement is priced around your workflows, systems, and goals. The introductory call helps us understand the work; scope and investment are agreed before an engagement begins.',
  factorsLabel: 'What determines scope',
  factors: [
    'Call and inquiry volume',
    'Workflows to redesign',
    'Systems to integrate',
    'Implementation complexity',
    'Operating requirements',
    'Goals and timeline',
  ],
  engagementsLabel: 'Engagements typically begin as',
  engagements: [
    { name: 'Opportunity Map', detail: 'A focused diagnostic and prioritized plan.' },
    { name: 'Implementation', detail: 'One or more systems designed, built, and launched.' },
    { name: 'Partnership', detail: 'Ongoing refinement and expansion after launch.' },
  ],
};

export const CA_REFINE = {
  heading: 'Systems should get better after launch.',
  body:
    'Launch is the first version, not the finished one. We review what the systems handled, where they hesitated, and what the business needs next.',
  points: [
    'Call and chat review against agreed measures',
    'Scripts and qualification tuned to real conversations',
    'New workflows added as the business changes',
  ],
};

export const CA_CLOSE = {
  heading: 'Let’s connect the work.',
  body: 'Tell us where inquiries, follow-up, or operations get stuck. We’ll discuss what needs attention and whether Sentient Partners is the right fit.',
};

export const CA_FOOTER = {
  line: 'Strategic technology consultancy in California',
  conceptNote: 'Concept preview: California Intelligence',
  homeLink: 'View current homepage',
};
