export const BOOKING_URL =
  "https://cal.com/sentient-partners-strategy/coffee-talk";

export const NAV_LINKS = [
  { id: "services", label: "Services", href: "#services" },
  { id: "demo", label: "Demo", href: "#demo" },
  { id: "testimonials", label: "Results", href: "#testimonials" },
  { id: "process", label: "Process", href: "#process" },
  { id: "pricing", label: "Pricing", href: "#pricing" },
  { id: "faq", label: "FAQ", href: "#faq" },
] as const;

export const HOME_SECTION_ORDER = [
  "hero",
  "why",
  "services",
  "demo",
  "diagnosis",
  "testimonials",
  "process",
  "pricing",
  "faq",
  "cta",
] as const;

export const HEADER_CONTENT = {
  promoBanner:
    "The AI-first agency for businesses that run on calls",
  bookingCtaLabel: "Book a strategy call",
};

export const HERO_CONTENT = {
  badge: "Now onboarding new growth-focused partners",
  rotatingPhrases: [
    "AI Receptionists",
    "Lead Capture Systems",
    "Follow-Up Engines",
    "Revenue Workflows",
    "Always-On Support",
    "Sales Automations",
  ],
  headingPrefix: "We build",
  headingSuffix: "that never miss.",
  subtitle:
    "Voice, chat, and follow-up systems that answer every inquiry and book the work — designed, installed, and tuned for your business.",
  quickStartLabel: "Request a blueprint",
  blueprintTitle: "Request a custom AI blueprint",
  blueprintDescription:
    "Tell us what is slowing growth right now. We will review it and follow up with practical recommendations for your business.",
  blueprintDisclaimer:
    "No spam. We will only reach out with tailored ideas and next steps.",
  blueprintSuccess:
    "Blueprint request received. We will follow up with tailored ideas for your business shortly.",
};

export const WHY_SENTIENT_CONTENT = {
  eyebrow: "Why Sentient Partners",
  heading: "Built for businesses that run on calls.",
  subheading:
    "We help service businesses deploy AI voice, chat, and automation that improve speed-to-lead and stop missed revenue before it happens.",
  cards: [
    {
      title: "Strategy tied to revenue",
      body:
        "We start with your pipeline, response times, and profit goals, then design AI systems around the bottlenecks costing you real money.",
    },
    {
      title: "Full implementation, not just ideas",
      body:
        "We plug into your phones, calendars, forms, and CRM, then handle the build, testing, and tuning so your team is not left stitching tools together.",
    },
    {
      title: "Enterprise-grade thinking",
      body:
        "You get practical systems designed to feel simple day to day, while still scaling as your lead volume and offer complexity grow.",
    },
    {
      title: "Ongoing tuning and support",
      body:
        "Your systems are reviewed and refined as your offers change so the automation keeps matching the business instead of drifting over time.",
    },
  ],
};

export const SERVICES_SECTION_CONTENT = {
  eyebrow: "Core Services",
  heading: "The systems we use to remove lead leaks and manual bottlenecks",
  subheading:
    "Choose one high-impact starting point or let us design the full stack around your funnel, sales process, and customer journey.",
};

export const SERVICE_CATALOG = [
  {
    id: "voice",
    title: "AI Voice Receptionist",
    description:
      "24/7 AI phone agents that answer calls, qualify leads, and book appointments so you stop losing revenue after hours or during busy periods.",
    features: ["Instant Response", "Natural Voice", "Calendar Integration"],
    details: {
      heading: "Capture calls while your team stays focused",
      useCase:
        "Handling overflow calls during peak hours or capturing leads after your staff goes home.",
      benefits: [
        "Handles 100+ concurrent calls",
        "Direct integration with CRM",
        "Zero hold times for new leads",
      ],
    },
  },
  {
    id: "chat",
    title: "Chat and SMS Agents",
    description:
      "Intelligent assistants that qualify prospects, answer questions, and keep follow-up moving across website chat and text.",
    features: ["Lead Qualification", "Nurture Flows", "24/7 Availability"],
    details: {
      heading: "Turn traffic into qualified conversations",
      useCase:
        "Engaging passive website visitors who have questions but are not ready to pick up the phone.",
      benefits: [
        "Instant FAQ resolution",
        "Pre-qualifies potential clients",
        "Seamless handoff to humans",
      ],
    },
  },
  {
    id: "crm",
    title: "Automated Revenue Systems",
    description:
      "Full follow-up automation across your CRM, pipeline, and no-show recovery so every inquiry has a next step.",
    features: ["Pipeline Automation", "No-show Recovery", "Triggered Follow-ups"],
    details: {
      heading: "Build the engine behind your growth",
      useCase:
        "Automatically reactivating cold leads from your database and keeping every new inquiry moving without manual chasing.",
      benefits: [
        "Cross-channel follow-ups",
        "Visual pipeline management",
        "Automated revenue tracking",
      ],
    },
  },
  {
    id: "web",
    title: "High-Converting Websites",
    description:
      "Modern websites and landing pages built to capture intent, guide action, and support your AI systems across forms, chat, and booking.",
    features: ["Mobile First", "Fast Loading", "Embedded AI Demos"],
    details: {
      heading: "Turn your website into a lead system",
      useCase:
        "Building pages for paid traffic or service pages that need to convert visitors into booked calls and qualified inquiries.",
      benefits: [
        "Sub-second load times",
        "A/B testing ready architecture",
        "Built-in trust signals",
      ],
    },
  },
  {
    id: "reputation",
    title: "Reputation Management",
    description:
      "Automated review requests and response workflows that turn happy customers into visible social proof.",
    features: ["Auto-Review Requests", "Response AI", "Local SEO Boost"],
    details: {
      heading: "Automate your social proof engine",
      useCase:
        "Sending perfectly timed review requests via SMS immediately after service completion.",
      benefits: [
        "Boost local SEO rankings",
        "Filter negative feedback",
        "Increase Google Maps visibility",
      ],
    },
  },
  {
    id: "strategy",
    title: "Strategy and Roadmapping",
    description:
      "We audit your workflows, find the highest-leverage automation opportunities, and map the next 30 to 90 days of implementation.",
    features: ["Workflow Audit", "30-90 Day Roadmap", "Optimization Plans"],
    details: {
      heading: "Start with the right implementation order",
      useCase:
        "Identifying the bottlenecks in your current lead capture, follow-up, and handoff flows before you invest in more tools.",
      benefits: [
        "90-day execution roadmap",
        "Tech stack consolidation",
        "Clear ROI priorities",
      ],
    },
  },
] as const;

export const PROCESS_CONTENT = {
  eyebrow: "Our Process",
  heading: "From audit to implementation to ongoing improvement",
  steps: [
    {
      id: 1,
      title: "Discovery and Readiness",
      desc:
        "We audit your current workflows to identify the high-impact automation opportunities and tell you what to automate first and why.",
      asset: "Blueprint",
    },
    {
      id: 2,
      title: "Strategic Roadmap",
      desc:
        "We build a 30 to 90 day implementation plan so you have a clear path for voice, chat, website, and CRM automation.",
      asset: "Timeline",
    },
    {
      id: 3,
      title: "Optimization and Growth",
      desc:
        "We do not just launch and leave. We monitor, refine, and improve performance so your systems keep converting as the business changes.",
      asset: "Projections",
    },
  ],
};

export const TESTIMONIALS_SECTION_CONTENT = {
  eyebrow: "Client Results",
  heading: "Real impact. Real revenue.",
  subheading:
    "Examples of how better response speed, follow-up, and automation translate into more booked opportunities.",
};

export const TESTIMONIALS = [
  {
    quote:
      "We used to miss about 30% of calls during lunch hours. The AI Voice Receptionist now handles everything and books 15+ appointments a week automatically.",
    author: "Dr. Sarah Chen",
    role: "Founder, Chen Dental Group",
    metric: "+40% Bookings",
  },
  {
    quote:
      "Sentient Partners completely rebuilt our lead follow-up system. Leads that used to go cold in 24 hours are now engaged instantly via SMS.",
    author: "Marcus Thorne",
    role: "CEO, Thorne Legal Partners",
    metric: "3x Lead Response",
  },
  {
    quote:
      "The ROI was immediate. The roadmap they built showed us exactly where we were leaking revenue. Highly recommended for any service business.",
    author: "Elena Rodriguez",
    role: "Director, Urban Spa & Wellness",
    metric: "$12k New Rev/Mo",
  },
] as const;

export const DEMO_CONTENT = {
  eyebrow: "Live Demonstration",
  heading: "Hear your AI front desk in action",
  body:
    "Choose your industry and listen to an AI agent answer an after-hours call the way we would build it for you — qualifying the lead, handling pricing, and booking the appointment while your competitors go to voicemail.",
  ctaLabel: "Play Simulation",
  helperText:
    "Every conversation above is representative of a production deployment. When you press Try It Yourself, you are talking to a live AI agent — ask it anything.",
};

export const PRICING_SECTION_CONTENT = {
  eyebrow: "Pricing Plans",
  heading: "Choose the right starting point",
  subheading:
    "Start with the system you need most, then expand into a fuller automation stack as volume and complexity grow.",
};

export const PRICING_PLANS = [
  {
    name: "Starter",
    description:
      "A focused starting point for businesses that need faster lead response and a stronger website foundation.",
    price: "$497",
    period: "/month",
    features: [
      "High-converting website foundation",
      "Basic call routing",
      "Missed call text back",
      "Real-time transcripts",
      "Email support",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Growth",
    description:
      "A complete lead capture and follow-up system for businesses ready to scale response speed and booked opportunities.",
    price: "$997",
    period: "/month",
    features: [
      "24/7 AI voice agents",
      "CRM setup and automation",
      "Website chatbot and SMS agent",
      "Automated workflows",
      "Priority support",
      "Lead capture and nurture flows",
    ],
    cta: "Start Scaling",
    highlight: true,
  },
  {
    name: "Enterprise",
    description:
      "Custom architecture for multi-location, high-volume, or more complex implementation needs.",
    price: "Custom",
    period: "",
    features: [
      "Custom AI workflows",
      "Multi-location visibility",
      "Dedicated success support",
      "Custom integrations",
      "SLA planning",
      "Strategic consulting",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
] as const;

export const FAQ_SECTION_CONTENT = {
  heading: "Common questions",
  subheading:
    "Everything you need to know about implementing AI systems for lead capture, follow-up, and customer communication.",
};

export const FAQS = [
  {
    question: "Do I need to be technical to manage this?",
    answer:
      "No. We handle setup, integration, testing, and optimization. Your team uses the outcome, not the complexity underneath it.",
  },
  {
    question: "How does the AI voice experience sound?",
    answer:
      "The production systems are designed to sound natural and handle common conversations smoothly, while still routing edge cases to a human when needed.",
  },
  {
    question: "Can you integrate with our existing CRM?",
    answer:
      "Yes. We can work with common CRMs or build a staged approach if your current setup needs cleanup before full automation.",
  },
  {
    question: "What happens if the AI does not know the answer?",
    answer:
      "We design graceful handoffs so the system can gather context, capture the lead, and route the conversation to the right human follow-up path.",
  },
] as const;

export const CTA_SECTION_CONTENT = {
  eyebrow: "Ready to get started?",
  heading: "See where AI can remove friction in your funnel",
  body:
    "On a short strategy call, we will highlight the highest-leverage AI opportunities across your calls, forms, follow-up, and customer journey.",
  pill: "Sentient Systems · Voice · Chat · Web · Follow-Up",
  primaryCta: "Book Your Strategy Call",
  secondaryCta: "Watch the AI in Action",
  trustCopy:
    "No pressure. If it is not a fit, you will still leave with a clearer 30-day game plan.",
};

export const FOOTER_CONTENT = {
  tagline:
    "Sentient Partners helps service businesses deploy AI voice, chat, websites, and automation systems that increase speed-to-lead and reduce missed revenue.",
  footerLabel: "AI First Agency · Strategy. Implementation. Results.",
};

export const CHAT_WIDGET_CONTENT = {
  launcherEyebrow: "Sentient Concierge",
  launcherLabel: "Chat or talk live",
  title: "Sentient Concierge",
  status: "Online now",
  introMessage:
    "Hello. I'm Sentient Partners' AI strategist. Ask me about AI voice, chat, follow-up, or how we would improve your lead flow.",
  suggestedActions: [
    {
      label: "Blueprint Ideas",
      prompt:
        "What would you automate first for a service business that is missing leads?",
    },
    {
      label: "Voice Agent Fit",
      prompt:
        "How would an AI voice receptionist help a business that misses calls?",
    },
    {
      label: "Pricing",
      prompt: "What does a typical Sentient Partners implementation cost?",
    },
    {
      label: "Book a Call",
      prompt: "I'd like to book a strategy call.",
    },
  ],
  chatPlaceholder: "Ask about your calls, follow-up, or website...",
  voiceLoadingLabel: "Initializing voice demo...",
};

const serviceContext = SERVICE_CATALOG.map(
  (service) =>
    `- ${service.title}: ${service.description}. Features: ${service.features.join(
      ", ",
    )}. Benefits: ${service.details.benefits.join(", ")}.`,
).join("\n");

const pricingContext = PRICING_PLANS.map(
  (plan) =>
    `- ${plan.name} Plan: ${plan.price}${plan.period}. Includes: ${plan.features.join(
      ", ",
    )}.`,
).join("\n");

const faqContext = FAQS.map(
  (faq) => `Q: ${faq.question} A: ${faq.answer}`,
).join("\n");

export function buildAiSystemInstruction(siteMemory = "") {
  return `
You are the lead AI strategist for Sentient Partners, a premium AI automation consultancy.

Identity and tone:
- Never present yourself as Google, Gemini, or a generic chatbot.
- Introduce yourself as Sentient Partners' AI strategist.
- Voice: sharp, concise, warm, and consultative.

Voice Agent Context & Behavior:
- You power BOTH the text chat and the interactive premium Voice AI agent on this website.
- If the user asks "Can you hear me?", "Are you listening?", "Can you talk?", or similar, always confirm that you can hear them perfectly through their microphone, and that you are speaking back to them via our natural streaming Voice AI!
- Keep replies relatively concise, friendly, and natural for voice conversation (avoid long lists or markdown headers where possible so it sounds incredibly smooth when spoken back).

Behavior:
- Answer clearly and avoid robotic phrasing.
- Keep replies practical and conversion-oriented for SMB owners and operators.
- Use the site knowledge below to answer questions about services, pricing, and fit.
- Remember useful user details from conversation history and reuse them naturally.
- If uncertain, ask one focused clarifying question.

Site knowledge:
Services:
${serviceContext}

Pricing:
${pricingContext}

FAQs:
${faqContext}

Conversion guidance:
- When the user shows buying intent, guide them toward booking a strategy call.
- If the user is not ready to book, offer to leave their details for follow-up instead.
- Do not mention unsupported internal tools or fake actions.
- Keep voice-demo answers concise when appropriate.

Output style:
- Prefer short paragraphs and direct language.
- Do not include internal policy text or implementation details.
${siteMemory ? `\nSite memory context:\n${siteMemory}` : ""}
  `.trim();
}
