import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type IndustryLabel =
  | "Home Services"
  | "Dental"
  | "Med Spa"
  | "Legal"
  | "Real Estate"
  | "Retail"
  | "Other";

interface ScenarioState {
  industry: IndustryLabel;
  teamSize: number;
  monthlyLeads: number;
  closeRate: number; // percent (0–100)
  avgTicket: number; // dollars
  aiVoice: boolean;
  aiChat: boolean;
  aiFollowUp: boolean;
  aiReputation: boolean;
  aiSmartSite: boolean;
}

interface Metrics {
  baseMonthlyRevenue: number;
  optimizedMonthlyRevenue: number;
  additionalRevenue: number;
  revenueLiftPercent: number;
  leadsRecovered: number;
  hoursSaved: number;
  baseAppointments: number;
  optimizedAppointments: number;
  aiHandledInteractions: number;
  humanHandledInteractions: number;
  roiMultiple: number;
  roiPercent: number;
}

const INDUSTRY_OPTIONS: IndustryLabel[] = [
  "Home Services",
  "Dental",
  "Med Spa",
  "Legal",
  "Real Estate",
  "Retail",
  "Other",
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

function getIndustryConfig(industry: IndustryLabel) {
  switch (industry) {
    case "Home Services":
      return { missedLeadRateBase: 0.28, interactionsPerLead: 2.0 };
    case "Dental":
      return { missedLeadRateBase: 0.24, interactionsPerLead: 2.4 };
    case "Med Spa":
      return { missedLeadRateBase: 0.26, interactionsPerLead: 2.3 };
    case "Legal":
      return { missedLeadRateBase: 0.22, interactionsPerLead: 2.5 };
    case "Real Estate":
      return { missedLeadRateBase: 0.3, interactionsPerLead: 2.2 };
    case "Retail":
      return { missedLeadRateBase: 0.2, interactionsPerLead: 1.8 };
    case "Other":
    default:
      return { missedLeadRateBase: 0.25, interactionsPerLead: 2.0 };
  }
}

function calculateMetrics(state: ScenarioState): Metrics {
  const {
    industry,
    monthlyLeads,
    closeRate,
    avgTicket,
    aiVoice,
    aiChat,
    aiFollowUp,
    aiReputation,
    aiSmartSite,
  } = state;

  const leadCount = Math.max(monthlyLeads, 0);
  const closeRateDecimal = Math.max(closeRate, 0) / 100;
  const avgTicketValue = Math.max(avgTicket, 0);

  const { missedLeadRateBase, interactionsPerLead } =
    getIndustryConfig(industry);

  const baseEffectiveLeads = leadCount * (1 - missedLeadRateBase);
  const baseMonthlyRevenue =
    baseEffectiveLeads * closeRateDecimal * avgTicketValue;

  // Uplift logic
  let missedLeadRate = missedLeadRateBase;
  let leadMultiplier = 1;
  let closeRateBoost = 0;

  // AI Voice Receptionist: fewer missed calls
  if (aiVoice) {
    missedLeadRate *= 0.6; // 40% reduction in missed leads
  }

  // AI Chat Bot: more captured leads
  if (aiChat) {
    leadMultiplier *= 1.12; // +12% leads captured
  }

  // AI Follow-Up: higher close rate
  if (aiFollowUp) {
    closeRateBoost += 0.05; // +5 percentage points
  }

  // AI Reputation & Reviews: social proof bump
  if (aiReputation) {
    closeRateBoost += 0.03; // +3 percentage points
  }

  // AI Smart Website/Funnel: better overall conversion
  if (aiSmartSite) {
    closeRateBoost += 0.04; // +4 percentage points
    leadMultiplier *= 1.05; // +5% more leads
  }

  const optimizedCloseRate = Math.min(closeRateDecimal + closeRateBoost, 0.8);
  const optimizedEffectiveLeadsRaw =
    leadCount * (1 - missedLeadRate) * leadMultiplier;
  const optimizedEffectiveLeads = Math.max(optimizedEffectiveLeadsRaw, 0);

  const optimizedMonthlyRevenueRaw =
    optimizedEffectiveLeads * optimizedCloseRate * avgTicketValue;
  const optimizedMonthlyRevenue = Math.max(optimizedMonthlyRevenueRaw, 0);

  const additionalRevenueRaw = optimizedMonthlyRevenue - baseMonthlyRevenue;
  const additionalRevenue = Math.max(additionalRevenueRaw, 0);

  const revenueLiftPercent =
    baseMonthlyRevenue > 0
      ? (additionalRevenue / baseMonthlyRevenue) * 100
      : 0;

  const baseAppointments = baseEffectiveLeads * 0.6; // assume 60% show to appointment
  const optimizedAppointments = optimizedEffectiveLeads * 0.7; // AI helps bump to 70%

  // Workload + hours saved
  const estimatedInteractions = leadCount * interactionsPerLead;
  let aiShare = 0;
  if (aiVoice) aiShare += 0.35;
  if (aiChat) aiShare += 0.25;
  if (aiFollowUp) aiShare += 0.2;
  aiShare = Math.min(aiShare, 0.85);

  const aiHandledInteractions = estimatedInteractions * aiShare;
  const humanHandledInteractions = estimatedInteractions - aiHandledInteractions;

  const minutesPerInteraction = 4;
  const hoursSaved =
    (aiHandledInteractions * minutesPerInteraction) / 60 || 0;

  const leadsRecoveredRaw = optimizedEffectiveLeads - baseEffectiveLeads;
  const leadsRecovered = Math.max(leadsRecoveredRaw, 0);

  const estimatedFee = 2500; // placeholder monthly SP fee
  const roiMultiple = estimatedFee > 0 ? additionalRevenue / estimatedFee : 0;
  const roiPercent = roiMultiple * 100;

  return {
    baseMonthlyRevenue,
    optimizedMonthlyRevenue,
    additionalRevenue,
    revenueLiftPercent,
    leadsRecovered,
    hoursSaved,
    baseAppointments,
    optimizedAppointments,
    aiHandledInteractions,
    humanHandledInteractions,
    roiMultiple,
    roiPercent,
  };
}

interface CardProps {
  title?: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, subtitle, className, children }) => {
  return (
    <div
      className={
        "rounded-2xl bg-slate-900/70 border border-slate-700/70 shadow-lg shadow-black/50 backdrop-blur-lg p-5 md:p-6 " +
        (className || "")
      }
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-sm font-semibold tracking-wide text-teal-400 uppercase">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-slate-300/90">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

interface TogglePillProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const TogglePill: React.FC<TogglePillProps> = ({
  label,
  description,
  value,
  onChange,
}) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-full flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition
        ${
          value
            ? "border-teal-400/80 bg-teal-500/10 shadow-[0_0_0_1px_rgba(45,212,191,0.4)]"
            : "border-slate-700 bg-slate-900/80 hover:border-slate-500"
        }`}
    >
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-50">{label}</span>
          {value && (
            <span className="inline-flex items-center rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-300">
              On
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-300/80">{description}</p>
        )}
      </div>
      <div
        className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${
          value ? "bg-teal-400/90" : "bg-slate-600"
        }`}
      >
        <div
          className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </button>
  );
};

function buildPackageName(state: ScenarioState): string {
  const names: string[] = [];
  if (state.aiVoice) names.push("AI Receptionist");
  if (state.aiChat) names.push("AI Chat + SMS");
  if (state.aiFollowUp) names.push("AI Follow-Up Sequences");
  if (state.aiReputation) names.push("AI Reviews & Reputation");
  if (state.aiSmartSite) names.push("AI Smart Website/Funnel");

  if (!names.length) return "Discovery & Strategy Blueprint";
  if (names.length === 1) return names[0] + " Package";
  return names.join(" + ");
}

function buildSummary(state: ScenarioState, metrics: Metrics): string {
  const leads =
    state.monthlyLeads > 0
      ? `~${numberFormatter.format(state.monthlyLeads)} leads/month`
      : "a steady flow of leads each month";

  const recovered =
    metrics.leadsRecovered > 0
      ? `recover ~${numberFormatter.format(
          Math.round(metrics.leadsRecovered)
        )} lost leads`
      : "recover lost leads";

  const additionalRevenue =
    metrics.additionalRevenue > 0
      ? currencyFormatter.format(Math.round(metrics.additionalRevenue))
      : "significant additional revenue";

  const hours =
    metrics.hoursSaved > 0
      ? `save ~${numberFormatter.format(
          Math.round(metrics.hoursSaved)
        )} hours of manual work`
      : "save hours of manual work";

  return `For a ${state.industry.toLowerCase()} team of ${
    state.teamSize
  } handling ${leads}, Sentient Partners could ${recovered}, unlock about ${additionalRevenue} in additional monthly revenue, and ${hours} by letting AI handle the busywork.`;
}

const SentientImpactDashboard: React.FC = () => {
  const [scenario, setScenario] = useState<ScenarioState>({
    industry: "Home Services",
    teamSize: 5,
    monthlyLeads: 350,
    closeRate: 25,
    avgTicket: 1200,
    aiVoice: true,
    aiChat: true,
    aiFollowUp: true,
    aiReputation: false,
    aiSmartSite: false,
  });

  const metrics = useMemo(() => calculateMetrics(scenario), [scenario]);

  const barData = useMemo(
    () => [
      {
        name: "Now",
        Revenue: Math.round(metrics.baseMonthlyRevenue),
        Appointments: Math.round(metrics.baseAppointments),
      },
      {
        name: "With Sentient",
        Revenue: Math.round(metrics.optimizedMonthlyRevenue),
        Appointments: Math.round(metrics.optimizedAppointments),
      },
    ],
    [
      metrics.baseMonthlyRevenue,
      metrics.baseAppointments,
      metrics.optimizedMonthlyRevenue,
      metrics.optimizedAppointments,
    ]
  );

  const workloadData = useMemo(() => {
    const ai = metrics.aiHandledInteractions;
    const human = metrics.humanHandledInteractions;
    const total = ai + human;
    if (total <= 0) {
      return [
        { name: "AI Systems", value: 1 },
        { name: "Human Team", value: 1 },
      ];
    }
    return [
      { name: "AI Systems", value: ai },
      { name: "Human Team", value: human },
    ];
  }, [metrics.aiHandledInteractions, metrics.humanHandledInteractions]);

  const bookingClick = () => {
    // TODO: wire to your real booking link (Cal.com or Sentient booking modal)
    window.open("https://cal.com/sentient-partners/meeting", "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-8 md:px-6 lg:px-0">
        {/* Top bar */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300 shadow-[0_0_20px_rgba(45,212,191,0.5)]">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
              Sentient Impact Dashboard
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
              See what{" "}
              <span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">
                always-on AI
              </span>{" "}
              does to your pipeline.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300/90 md:text-base">
              Plug in your real numbers and watch the impact. We&apos;ll show
              you how AI Voice, Chat, and Automations recover missed leads,
              unlock revenue, and give your team their time back.
            </p>
          </div>
          <div className="flex items-center gap-3 md:flex-col md:items-end">
            <button
              onClick={bookingClick}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-500/40 transition hover:shadow-teal-400/70"
            >
              Book a Strategy Call
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-slate-600 bg-slate-900/60 px-4 py-2 text-xs font-medium text-slate-200 hover:border-slate-400"
            >
              View AI Blueprint Sample
            </button>
          </div>
        </header>

        {/* Main grid */}
        <main className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
          {/* Left column: Controls + Recommendations */}
          <div className="space-y-6">
            <Card
              title="Your Business Scenario"
              subtitle="Adjust the sliders and toggles to match your real-world numbers."
            >
              <div className="space-y-4">
                {/* Industry */}
                <div className="space-y-2">
                  <label className="flex items-center justify-between text-xs font-medium text-slate-200">
                    <span>Industry</span>
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-400"
                    value={scenario.industry}
                    onChange={(e) =>
                      setScenario((prev) => ({
                        ...prev,
                        industry: e.target.value as IndustryLabel,
                      }))
                    }
                  >
                    {INDUSTRY_OPTIONS.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team size */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-200">
                    <span>Team size</span>
                    <span className="text-[11px] text-slate-400">
                      {scenario.teamSize} people
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={scenario.teamSize}
                    onChange={(e) =>
                      setScenario((prev) => ({
                        ...prev,
                        teamSize: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-teal-400"
                  />
                </div>

                {/* Monthly leads */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-200">
                    <span>Monthly lead volume</span>
                    <span className="text-[11px] text-slate-400">
                      {numberFormatter.format(scenario.monthlyLeads)} leads
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2000}
                    value={scenario.monthlyLeads}
                    onChange={(e) =>
                      setScenario((prev) => ({
                        ...prev,
                        monthlyLeads: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-teal-400"
                  />
                </div>

                {/* Close rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-200">
                    <span>Current close rate</span>
                    <span className="text-[11px] text-slate-400">
                      {percentFormatter.format(scenario.closeRate)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={scenario.closeRate}
                    onChange={(e) =>
                      setScenario((prev) => ({
                        ...prev,
                        closeRate: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-teal-400"
                  />
                </div>

                {/* Average ticket */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-200">
                    <span>Average ticket value (USD)</span>
                    <span className="text-[11px] text-slate-400">
                      {currencyFormatter.format(scenario.avgTicket)}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-400"
                    value={scenario.avgTicket}
                    onChange={(e) =>
                      setScenario((prev) => ({
                        ...prev,
                        avgTicket: Number(e.target.value || 0),
                      }))
                    }
                  />
                </div>

                {/* Toggles */}
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    AI Solutions
                  </p>
                  <TogglePill
                    label="AI Voice Receptionist"
                    description="Answer, qualify, and book calls 24/7 so you never miss a hot lead."
                    value={scenario.aiVoice}
                    onChange={(value) =>
                      setScenario((prev) => ({ ...prev, aiVoice: value }))
                    }
                  />
                  <TogglePill
                    label="AI Chat Bot (Web + SMS)"
                    description="Engage website visitors and SMS leads in real time, even after hours."
                    value={scenario.aiChat}
                    onChange={(value) =>
                      setScenario((prev) => ({ ...prev, aiChat: value }))
                    }
                  />
                  <TogglePill
                    label="AI Follow-Up Sequences"
                    description="Persistent, on-brand follow-up that turns slow leads into booked appointments."
                    value={scenario.aiFollowUp}
                    onChange={(value) =>
                      setScenario((prev) => ({ ...prev, aiFollowUp: value }))
                    }
                  />
                  <TogglePill
                    label="AI Reputation & Reviews"
                    description="Automated review requests that boost social proof and conversion."
                    value={scenario.aiReputation}
                    onChange={(value) =>
                      setScenario((prev) => ({ ...prev, aiReputation: value }))
                    }
                  />
                  <TogglePill
                    label="AI Smart Website/Funnel"
                    description="A high-converting, always-testing funnel tuned for your ideal customer."
                    value={scenario.aiSmartSite}
                    onChange={(value) =>
                      setScenario((prev) => ({ ...prev, aiSmartSite: value }))
                    }
                  />
                </div>
              </div>
            </Card>

            {/* Recommendation Panel */}
            <Card title="Suggested Sentient Package">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">
                    Recommended Stack
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-50">
                    {buildPackageName(scenario)}
                  </p>
                  <p className="mt-2 text-xs text-slate-300/90">
                    {buildSummary(scenario, metrics)}
                  </p>
                </div>
                <div className="grid gap-3 text-xs text-slate-300 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-100">
                      What we&apos;ll deploy
                    </p>
                    <ul className="space-y-1">
                      {scenario.aiVoice && (
                        <li>• AI call routing & live booking</li>
                      )}
                      {scenario.aiChat && (
                        <li>• Web & SMS chat that actually converts</li>
                      )}
                      {scenario.aiFollowUp && (
                        <li>• Multi-channel follow-up sequences</li>
                      )}
                      {scenario.aiReputation && (
                        <li>• Review collection & reputation boosts</li>
                      )}
                      {scenario.aiSmartSite && (
                        <li>• High-converting AI-powered funnel</li>
                      )}
                      {!(
                        scenario.aiVoice ||
                        scenario.aiChat ||
                        scenario.aiFollowUp ||
                        scenario.aiReputation ||
                        scenario.aiSmartSite
                      ) && <li>• Custom AI Blueprint for your business</li>}
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-100">Next step</p>
                    <p>
                      We&apos;ll take these inputs, map your top AI
                      opportunities, and show you a live demo of Sentient
                      Systems handling calls, chats, and follow-up.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={bookingClick}
                    className="inline-flex items-center justify-center rounded-full bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-teal-500/40 hover:bg-teal-400"
                  >
                    Book this into my calendar
                  </button>
                  <p className="text-[11px] text-slate-400">
                    No pressure. Bring your real numbers and we&apos;ll do the
                    math together.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right column: KPIs + Charts */}
          <div className="space-y-6">
            {/* KPI Cards */}
            <Card>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Revenue */}
                <div className="rounded-2xl bg-slate-950/60 p-4 ring-1 ring-slate-800">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Monthly Revenue
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-400">With Sentient</p>
                      <p className="text-xl font-semibold text-slate-50">
                        {currencyFormatter.format(
                          Math.round(metrics.optimizedMonthlyRevenue)
                        )}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Currently{" "}
                        {currencyFormatter.format(
                          Math.round(metrics.baseMonthlyRevenue)
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center rounded-full bg-teal-500/15 px-2 py-1 text-[11px] font-semibold text-teal-300">
                        +{" "}
                        {percentFormatter.format(
                          metrics.revenueLiftPercent
                        )}% uplift
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-900/80 px-2 py-1 text-[10px] text-slate-400">
                        +{" "}
                        {currencyFormatter.format(
                          Math.round(metrics.additionalRevenue)
                        )}{" "}
                        / month
                      </span>
                    </div>
                  </div>
                </div>

                {/* ROI + Leads */}
                <div className="space-y-3">
                  <div className="rounded-2xl bg-slate-950/60 p-4 ring-1 ring-slate-800">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Estimated ROI
                    </p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <p className="text-xl font-semibold text-slate-50">
                        {metrics.roiMultiple > 0
                          ? `${percentFormatter
                              .format(metrics.roiPercent)
                              .toString()}%`
                          : "TBD"}
                      </p>
                      {metrics.roiMultiple > 0 && (
                        <p className="text-[11px] text-slate-400">
                          on a ~$2.5k/mo Sentient stack
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-950/60 p-4 ring-1 ring-slate-800">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Recovered Leads & Hours Saved
                    </p>
                    <div className="mt-2 flex items-baseline justify-between gap-2 text-sm">
                      <div>
                        <p className="text-xs text-slate-400">Leads saved</p>
                        <p className="text-lg font-semibold text-slate-50">
                          {numberFormatter.format(
                            Math.round(metrics.leadsRecovered)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Hours saved</p>
                        <p className="text-lg font-semibold text-slate-50">
                          {numberFormatter.format(
                            Math.round(metrics.hoursSaved)
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Bar Chart */}
            <Card
              title="Pipeline Impact"
              subtitle="Compare your current revenue and bookings with a Sentient-powered stack."
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1f2937"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      tickFormatter={(val) =>
                        currencyFormatter.format(val as number)
                      }
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      tickFormatter={(val) =>
                        numberFormatter.format(val as number)
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid #1f2937",
                        borderRadius: "0.75rem",
                        fontSize: 11,
                      }}
                      formatter={(value: any, name: any) => {
                        if (name === "Revenue") {
                          return [
                            currencyFormatter.format(value as number),
                            "Revenue",
                          ];
                        }
                        if (name === "Appointments") {
                          return [
                            numberFormatter.format(value as number),
                            "Appointments",
                          ];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      iconSize={10}
                      iconType="circle"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="Revenue"
                      name="Revenue"
                      radius={[6, 6, 0, 0]}
                      fill="#14b8a6"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="Appointments"
                      name="Appointments"
                      radius={[6, 6, 0, 0]}
                      fill="#6366f1"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Workload chart */}
            <Card
              title="Who Handles the Work?"
              subtitle="See how much of your operational load can be handled by AI vs your human team."
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="mx-auto h-52 w-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={workloadData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="65%"
                        outerRadius="90%"
                        paddingAngle={2}
                      >
                        {workloadData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={index === 0 ? "#14b8a6" : "#64748b"}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3 text-xs text-slate-300">
                  <p>
                    As you toggle AI Voice, Chat, and Follow-Up on, more of
                    your repetitive interactions shift to Sentient Systems.
                    Your team focuses on the calls and conversations that
                    actually move the needle.
                  </p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-xl bg-slate-950/70 p-3 ring-1 ring-slate-800">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        AI Systems
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-50">
                        {numberFormatter.format(
                          Math.round(metrics.aiHandledInteractions)
                        )}{" "}
                        interactions
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-950/70 p-3 ring-1 ring-slate-800">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Human team
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-50">
                        {numberFormatter.format(
                          Math.round(metrics.humanHandledInteractions)
                        )}{" "}
                        interactions
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Numbers are estimates based on your lead volume, team size,
                    and which Sentient solutions you&apos;ve enabled above.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </main>

        {/* Sticky CTA bar */}
        <div className="sticky bottom-4 z-10">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl bg-gradient-to-r from-teal-500/80 via-cyan-500/70 to-sky-500/80 p-[1px] shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
              <div className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-slate-950/95 px-4 py-3 md:flex-row md:items-center md:px-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">
                    Ready to see this live?
                  </p>
                  <p className="text-sm text-slate-100">
                    Bring this dashboard to your strategy call and we&apos;ll
                    map out a custom Sentient stack for your business.
                  </p>
                </div>
                <button
                  onClick={bookingClick}
                  className="inline-flex items-center justify-center rounded-full bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-teal-500/40 hover:bg-teal-300"
                >
                  Lock in a Session
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentientImpactDashboard;

