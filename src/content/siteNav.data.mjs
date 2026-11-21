// Single source of truth for the site's solutions and navigation.
//
// Plain ESM data (no imports, no JSX, no TypeScript) so the SAME file feeds:
//   - the React app, through the typed wrapper `src/content/siteNav.ts`
//   - plain Node build scripts: `insights/build.mjs`, `scripts/prerender.mjs`
// Types live next door in `siteNav.data.d.mts`. Keep the two in step.
//
// Copy rules (checked by `siteNav.test.ts`): reuse approved site copy only, no
// invented claims; Relay is always "in pilot"; the offer is the 20-minute
// intro call; hello@ is the only email address.
//
// Hrefs are root-relative. Homepage sections are written "/#section" so they
// work from every page; use `hrefOnPage()` to shorten them on the homepage.

export const SITE_ORIGIN = "https://sentientpartners.ai";

export const BOOKING_URL =
  "https://cal.com/sentient-partners-strategy/introductory-call";

export const CONTACT = {
  email: "hello@sentientpartners.ai",
  phone: "(415) 504-2757",
  phoneHref: "tel:+14155042757",
  linkedin: "https://www.linkedin.com/in/tghill/",
};

export const SOLUTIONS_HUB_PATH = "/solutions/";
export const RELAY_PATH = "/relay/";
export const TOOLS_HUB_PATH = "/tools/";
export const WEBSITE_CHECK_PATH = "/tools/website-check/";

/** Where one solution's page lives. */
export const solutionPath = (slug) => `${SOLUTIONS_HUB_PATH}${slug}/`;

/**
 * Homepage section links are stored as "/#section". On the homepage itself
 * they should be plain "#section" so the page scrolls instead of reloading.
 */
export const hrefOnPage = (href, isHomepage) =>
  isHomepage && href.startsWith("/#") ? href.slice(1) : href;

/** The four ways we help; a solution belongs to exactly one. */
export const SOLUTION_GROUPS = [
  {
    id: "advise",
    label: "Advise & Grow",
    summary:
      "A clear view of your business, a sensible roadmap and priorities, and hands-on implementation.",
  },
  {
    id: "attract",
    label: "Attract & Convert",
    summary:
      "Websites, search visibility and reputation that help the right customers find you, trust you and get in touch.",
  },
  {
    id: "automate",
    label: "Automate & Communicate",
    summary:
      "Chat and voice assistants, scheduling and follow-up, so inquiries are answered and nothing slips.",
  },
  {
    id: "operate",
    label: "Operate & Scale",
    summary:
      "Business applications and workflow automation for jobs, crews, estimates and invoices, with less retyping.",
  },
];

/** How we partner: the three steps shown on the homepage and the advisory page. */
export const PROCESS = {
  eyebrow: "How we partner",
  promise:
    "Direct access to your partner. No hand-offs. The person on your first call builds your system.",
  steps: [
    {
      title: "Discover",
      copy: "We learn your business, where it sticks, and what's worth fixing first.",
    },
    {
      title: "Design",
      copy: "A practical strategy, clear priorities, and a roadmap we agree on.",
    },
    {
      title: "Deliver",
      copy: "We build, test and launch with your team, then refine as you grow.",
    },
  ],
};

/**
 * Every solution, in menu order. `kind: "capability"` solutions are the eight
 * scenes of the homepage capabilities journey (same slugs, same copy) and each
 * has an interactive demo; the advisory solution has the process steps instead.
 *
 * Field OS, Office OS and Sentient OS are deliberately absent: there is no
 * approved public copy for them.
 */
export const SOLUTIONS = [
  {
    slug: "advisory",
    kind: "advisory",
    group: "advise",
    title: "Business strategy",
    summary:
      "A clear view of your business, a sensible roadmap and priorities, and hands-on implementation.",
    page: {
      headline: "Move forward with a practical plan.",
      lede: "A clear view of your business, a sensible roadmap, and hands-on implementation.",
      includes: [],
    },
  },
  {
    slug: "websites",
    kind: "capability",
    group: "attract",
    title: "Premium websites",
    summary:
      "Custom, mobile-first websites with clear messaging, hosting and care.",
    page: {
      headline: "Yours is the first site that looks like someone will pick up.",
      lede: "Thoughtful design, clear messaging, and fast pages that turn a first look into an inquiry.",
      includes: ["Custom design", "Mobile-first", "Analytics tied to inquiries"],
    },
  },
  {
    slug: "search",
    kind: "capability",
    group: "attract",
    title: "Search visibility",
    summary:
      "Business profile care, service pages and sound technical foundations.",
    page: {
      headline: "Her AC quits on the hottest night of the year. She searches.",
      lede: "Business profile care, local service pages, and sound technical foundations so you're the name she finds.",
      includes: ["Business profile", "Service pages", "Plain-language reporting"],
    },
  },
  {
    slug: "ai-chatbots",
    kind: "capability",
    group: "automate",
    title: "AI chat assistants",
    summary:
      "Website and messaging assistants that answer routine questions and hand off to a person.",
    page: {
      headline: "She asks a question instead of filling out a form.",
      lede: "Trained on your services and pricing. Qualifies the inquiry and hands your team the whole story.",
      includes: ["Website, text, social", "Lead qualification", "Human handoff"],
    },
  },
  {
    slug: "voice-agents",
    kind: "capability",
    group: "automate",
    title: "AI voice agents",
    summary:
      "After-hours and overflow call answering with summaries sent to the team.",
    page: {
      headline: "Still too hot to sleep. She calls. Someone answers.",
      lede: "After-hours and overflow calls handled in a natural voice, with urgent issues sent straight to a person.",
      includes: ["After hours", "Safety screening", "Summary by morning"],
    },
  },
  {
    slug: "scheduling",
    kind: "capability",
    group: "automate",
    title: "Calendar & scheduling",
    summary: "Online booking, team calendar sync and reminders.",
    page: {
      headline: "She books a visit before your office opens.",
      lede: "Availability, appointments, and reminders connected, so everyone knows what happens next.",
      includes: ["Online booking", "Team calendar sync", "Text reminders"],
    },
  },
  {
    slug: "reviews",
    kind: "capability",
    group: "attract",
    title: "Reputation & reviews",
    summary:
      "Review requests to every customer and drafted responses the owner approves.",
    page: {
      headline: "She tells the neighbors. You thank her in one tap.",
      lede: "Ask for honest feedback, answer it with drafts you approve, and see what customers keep saying.",
      includes: ["Review requests", "Drafted replies", "Monthly summary"],
    },
  },
  {
    slug: "business-apps",
    kind: "capability",
    group: "operate",
    title: "Business applications",
    summary: "Practical tools for jobs, customers, estimates and invoices.",
    page: {
      headline: "Your crew rolls out with the job, the notes, and the address.",
      lede: "Jobs, customers, scheduling, and billing in one practical system built around how you work.",
      includes: ["Dispatch", "Job notes and photos", "Invoices and payments"],
    },
  },
  {
    slug: "automation",
    kind: "capability",
    group: "operate",
    title: "Workflow automation",
    summary:
      "Connections between existing tools, with readable rules and human approval steps.",
    page: {
      headline: "The estimate goes out while the truck is still in her driveway.",
      lede: "Handoffs between your tools run on rules you can read, with your approval where it counts.",
      includes: ["Connects your tools", "Approval steps", "Alerts when stalled"],
    },
  },
];

/** Sentient Relay. Always shown with its "in pilot" status. */
export const RELAY = {
  path: RELAY_PATH,
  name: "Sentient Relay",
  status: "In pilot",
  /** The label for menus and link lists: the status is part of the name. */
  navLabel: "Sentient Relay (in pilot)",
  eyebrow: "Sentient Relay · In pilot",
  headline: "The service day, in one app.",
  summary:
    "Schedule the visit, write the estimate, get it signed and record the payment, from the field or the office.",
  points: [
    "Today, calendar and jobs in one place",
    "Customer records with call, text and directions",
    "Estimates and invoices tracked through to paid",
  ],
};

export const CAPABILITIES_PDF = {
  href: "/capabilities.pdf",
  label: "Capabilities overview (PDF)",
  downloadLabel: "Download the capabilities overview (PDF)",
};

/** Copy for the /solutions/ hub (from the capabilities overview). */
export const SOLUTIONS_HUB = {
  path: SOLUTIONS_HUB_PATH,
  label: "Solutions",
  allLabel: "All solutions",
  headline: "Systems that put the plan to work.",
  lede: "Each engagement is scoped to your business, budget and existing tools. We recommend a solution only after understanding how you work today.",
};

/** The free tools, in display order. The website check is always first. */
export const FREE_TOOLS = [
  {
    id: "website-check",
    href: WEBSITE_CHECK_PATH,
    eyebrow: "Website",
    title: "Website check",
    copy: "A plain-English check of phones, search, speed and booking, in about 20 seconds.",
  },
  {
    id: "missed-call-calculator",
    href: "/tools/missed-call-calculator/",
    eyebrow: "Calls",
    title: "Missed-call calculator",
    copy: "What unanswered calls may cost you a month, from your own numbers.",
  },
  {
    id: "ai-readiness",
    href: "/tools/ai-readiness/",
    eyebrow: "Operations",
    title: "AI readiness check",
    copy: "Nine quick questions, a score out of 100 and three next steps.",
  },
  {
    id: "time-back",
    href: "/tools/time-back/",
    eyebrow: "Time",
    title: "Time-back estimator",
    copy: "Hours a week you might get back from admin, from your own numbers.",
  },
  {
    id: "reputation",
    href: "/tools/reputation/",
    eyebrow: "Reviews",
    title: "Reputation snapshot",
    copy: "A quick self-check of your reviews, with three next steps.",
  },
];

export const FREE_TOOLS_HUB = {
  href: TOOLS_HUB_PATH,
  label: "Free tools",
  allLabel: "All free tools",
};
export const TEMPLATES_LINK = { href: "/tools/#templates", label: "Templates" };

/**
 * Header items, left to right. The header CTA (`HEADER_CTA`) follows them.
 * `panel: "solutions"` means the item also opens the flat Solutions panel
 * (`SOLUTIONS_PANEL`). `requiresInsights` items are hidden when a build has no
 * published Insights.
 */
export const HEADER_ITEMS = [
  { id: "solutions", label: "Solutions", href: SOLUTIONS_HUB_PATH, panel: "solutions" },
  // TODO(demos): add after PR #55
  { id: "work", label: "Our work", href: "/#work" },
  { id: "about", label: "About", href: "/#founder" },
  { id: "insights", label: "Insights", href: "/insights/", requiresInsights: true },
  { id: "tools", label: "Free tools", href: TOOLS_HUB_PATH },
];

/** The header's call to action: the 20-minute intro call. */
export const HEADER_CTA = {
  id: "book",
  label: "Book a 20-min intro call",
  href: BOOKING_URL,
  kind: "book",
};

const solutionLinks = SOLUTIONS.map((solution) => ({
  id: `solution-${solution.slug}`,
  label: solution.title,
  href: solutionPath(solution.slug),
}));
const relayLink = { id: "relay", label: RELAY.navLabel, href: RELAY.path };
const capabilitiesPdfLink = {
  id: "capabilities-pdf",
  label: CAPABILITIES_PDF.label,
  href: CAPABILITIES_PDF.href,
  kind: "download",
};

/**
 * The Solutions panel: one flat list (never nested). Every solution, then
 * Relay, then the hub and the capabilities overview. The mobile menu shows the
 * same links as an always-open list.
 */
export const SOLUTIONS_PANEL = {
  heading: SOLUTIONS_HUB.label,
  links: [...solutionLinks, relayLink],
  footerLinks: [
    { id: "all-solutions", label: SOLUTIONS_HUB.allLabel, href: SOLUTIONS_HUB_PATH },
    capabilitiesPdfLink,
  ],
};

/**
 * Footer columns, left to right. Link `kind`:
 *   (none)     an ordinary link
 *   "download" a file (the capabilities overview)
 *   "book"     opens the booking modal in the app; plain link to `href` elsewhere
 *   "chat"     opens Ask Sentient in the app; has no `href`, so static pages
 *              (Insights) leave it out
 *   "external" opens in a new tab
 */
export const FOOTER_COLUMNS = [
  {
    id: "solutions",
    heading: "Solutions",
    links: [
      ...solutionLinks,
      relayLink,
      { id: "all-solutions", label: SOLUTIONS_HUB.allLabel, href: SOLUTIONS_HUB_PATH },
    ],
  },
  {
    id: "company",
    heading: "Company",
    links: [
      { id: "help", label: "How we help", href: "/#services" },
      { id: "work", label: "Our work", href: "/#work" },
      { id: "about", label: "About", href: "/#founder" },
      { id: "approach", label: "Our approach", href: "/#process" },
      { id: "insights", label: "Insights", href: "/insights/", requiresInsights: true },
    ],
  },
  {
    id: "tools",
    heading: "Free tools",
    links: [
      ...FREE_TOOLS.map((tool) => ({ id: `tool-${tool.id}`, label: tool.title, href: tool.href })),
      { id: "all-tools", label: FREE_TOOLS_HUB.allLabel, href: TOOLS_HUB_PATH },
      { id: "templates", label: TEMPLATES_LINK.label, href: TEMPLATES_LINK.href },
      // TODO(demos): the Demos link also goes here after PR #55.
      capabilitiesPdfLink,
    ],
  },
  {
    id: "contact",
    heading: "Let's connect",
    links: [
      { id: "book", label: "Book a 20-minute intro call", href: BOOKING_URL, kind: "book" },
      { id: "chat", label: "Ask Sentient (chat or voice)", kind: "chat" },
      { id: "phone", label: CONTACT.phone, href: CONTACT.phoneHref },
      { id: "email", label: CONTACT.email, href: `mailto:${CONTACT.email}` },
      { id: "linkedin", label: "LinkedIn", href: CONTACT.linkedin, kind: "external" },
    ],
  },
];

/** The legal line under the footer columns. */
export const FOOTER_LEGAL_LINKS = [
  { id: "privacy", label: "Privacy", href: "/privacy" },
  { id: "terms", label: "Terms", href: "/terms" },
];
