import React from "react";
import { BarChart3, MessagesSquare, Sprout, Users } from "lucide-react";
import {
  HOME_AUBURN,
  HOME_CLOSE,
  HOME_CONTACT,
  HOME_CTA,
  HOME_FOUNDER,
  HOME_INTRO,
  HOME_NAV,
  HOME_PILLARS,
  HOME_PROCESS,
} from "../../content/homeContent";
import { bookIntroduction, goToSection } from "./actions";
import { Arrow } from "./Arrow";
import { Wordmark } from "./Wordmark";

/** A brief statement of what the firm is, before any tools appear. */
export const IntroSection: React.FC = () => (
  <section
    aria-labelledby="intro-heading"
    className="border-b border-sp-line bg-sp-cream py-[calc(var(--sp-space)*0.85)]"
  >
    <div className="sp-shell grid gap-7 lg:grid-cols-12 lg:items-center lg:gap-12">
      <h2 id="intro-heading" className="sp-h2 text-sp-navy lg:col-span-7">
        {HOME_INTRO.heading}
      </h2>
      <div className="space-y-4 lg:col-span-5 lg:border-l lg:border-sp-navy/20 lg:pl-12">
        {HOME_INTRO.body.map((paragraph) => (
          <p key={paragraph} className="sp-lede text-sp-ink">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  </section>
);

const PILLAR_ICONS = {
  attract: Users,
  automate: MessagesSquare,
  operate: BarChart3,
  advise: Sprout,
} as const;

/** The four ways the firm works with a business. Advisory sits here, beside the technology. */
export const PillarsSection: React.FC = () => (
  <section
    id="services"
    aria-labelledby="services-heading"
    className="sp-section border-t border-sp-line bg-sp-cream"
  >
    <div className="sp-shell">
      <h2 id="services-heading" className="sp-h2 max-w-[24ch] text-sp-navy">
        {HOME_PILLARS.heading}
      </h2>
      <ul className="mt-12 grid gap-x-10 gap-y-10 border-t border-sp-navy/20 pt-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-0">
        {HOME_PILLARS.pillars.map((pillar, index) => {
          const Icon = PILLAR_ICONS[pillar.id];
          return (
            <li
              key={pillar.id}
              className={`lg:px-9 ${index === 0 ? "lg:pl-0" : "lg:border-l lg:border-sp-line"} ${index === 3 ? "lg:pr-0" : ""}`}
            >
              <Icon
                aria-hidden="true"
                className="h-9 w-9 text-sp-bronze"
                strokeWidth={1.15}
              />
              <h3 className="sp-h3 mt-5 text-sp-navy">{pillar.name}</h3>
              <p className="sp-body mt-3 text-sp-ink">{pillar.outcome}</p>
              <p className="mt-4 text-[15px] leading-relaxed text-sp-slate">
                {pillar.scope}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  </section>
);

/**
 * The founder's perspective as a split screen: the redwoods fill half the
 * viewport, the words sit on navy beside them. Employer names stay in the full bio.
 */
export const FounderSection: React.FC = () => (
  <section
    id="founder"
    aria-labelledby="founder-heading"
    className="bg-sp-deep text-sp-ivory lg:grid lg:grid-cols-2"
  >
    <div className="relative aspect-[3/2] lg:aspect-auto lg:min-h-[46rem]">
      <img
        src="/home/redwoods-2055.webp"
        srcSet="/home/redwoods-1370.webp 1370w, /home/redwoods-2055.webp 2055w"
        sizes="(min-width: 1024px) 110vw, 150vw"
        alt={HOME_FOUNDER.imageAlt}
        width={2055}
        height={1014}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-[46%_50%]"
      />
    </div>
    <div className="sp-edge-right flex flex-col justify-center py-[var(--sp-space)] pl-[var(--sp-gutter)] lg:pl-[clamp(3rem,5vw,5.5rem)]">
      <h2 id="founder-heading" className="sp-h2 max-w-[20ch]">
        {HOME_FOUNDER.heading}
      </h2>
      <div className="mt-7 max-w-[36rem] space-y-4">
        {HOME_FOUNDER.body.map((paragraph) => (
          <p key={paragraph} className="sp-body text-sp-mist">
            {paragraph}
          </p>
        ))}
      </div>
      <dl className="mt-9 max-w-[40rem] border-t border-sp-ivory/20">
        {HOME_FOUNDER.points.map((point) => (
          <div key={point.name} className="border-b border-sp-ivory/20 py-5">
            <dt className="font-editorial text-[1.3125rem] leading-snug text-sp-champagne">
              {point.name}
            </dt>
            <dd className="mt-1.5 text-[1.0625rem] leading-relaxed text-sp-mist">
              {point.detail}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
);

/** Local roots: downtown Auburn, edge to edge, where the firm is based. */
export const AuburnSection: React.FC = () => (
  <section
    aria-labelledby="auburn-heading"
    className="bg-sp-ivory pt-[var(--sp-space)]"
  >
    <div className="sp-shell grid gap-6 pb-10 lg:grid-cols-12 lg:items-end lg:gap-12 lg:pb-14">
      <h2 id="auburn-heading" className="sp-h2 text-sp-navy lg:col-span-6">
        {HOME_AUBURN.heading}
      </h2>
      <div className="space-y-3 lg:col-span-6">
        {HOME_AUBURN.body.map((paragraph) => (
          <p key={paragraph} className="sp-lede text-sp-ink">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
    <div className="sp-letterbox overflow-hidden">
      <img
        src="/home/downtown-auburn-2048.webp"
        srcSet="/home/downtown-auburn-800.webp 800w, /home/downtown-auburn-1200.webp 1200w, /home/downtown-auburn-2048.webp 2048w"
        sizes="100vw"
        alt={HOME_AUBURN.imageAlt}
        width={2048}
        height={1366}
        loading="lazy"
        decoding="async"
        className="aspect-[3/2] w-full object-cover object-[50%_30%] md:aspect-[2/1] 2xl:aspect-[21/9]"
      />
    </div>
  </section>
);

/** Four steps, in order. The numerals are real: each step depends on the one before. */
export const ProcessSection: React.FC = () => (
  <section
    id="approach"
    aria-labelledby="approach-heading"
    className="sp-section bg-sp-cream"
  >
    <div className="sp-shell">
      <h2 id="approach-heading" className="sp-h2 max-w-[30ch] text-sp-navy">
        {HOME_PROCESS.heading}
      </h2>
      <ol className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
        {HOME_PROCESS.steps.map((step, index) => (
          <li key={step.name} className="border-t border-sp-navy/25 pt-5">
            <span
              aria-hidden="true"
              className="font-editorial text-[1.75rem] leading-none text-sp-bronze"
            >
              {index + 1}
            </span>
            <h3 className="sp-h3 mt-3 text-sp-navy">{step.name}</h3>
            <p className="sp-body mt-2.5 text-sp-slate">{step.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

/** The close: one next step, and the direct ways to reach the firm. */
export const CloseSection: React.FC = () => (
  <section
    id="contact"
    aria-labelledby="contact-heading"
    className="sp-section bg-sp-deep text-sp-ivory"
  >
    <div className="sp-shell grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
      <div className="lg:col-span-7">
        <h2 id="contact-heading" className="sp-h2 max-w-[22ch]">
          {HOME_CLOSE.heading}
        </h2>
        <p className="sp-lede mt-5 max-w-[36rem] text-sp-mist">
          {HOME_CLOSE.body}
        </p>
      </div>
      <div className="lg:col-span-5 lg:border-l lg:border-sp-ivory/20 lg:pl-12">
        <button
          type="button"
          onClick={() => bookIntroduction("Close")}
          className="sp-btn sp-btn-champagne w-full sm:w-auto"
        >
          {HOME_CTA.book}
          <Arrow />
        </button>
        <div className="sp-body mt-6 flex flex-col gap-2 text-sp-mist">
          <p>
            Call or text{" "}
            <a
              href={HOME_CONTACT.phoneHref}
              className="whitespace-nowrap text-sp-ivory underline decoration-sp-ivory/40 underline-offset-4 hover:decoration-sp-ivory"
            >
              {HOME_CONTACT.phone}
            </a>
          </p>
          <p>
            Email{" "}
            <a
              href={`mailto:${HOME_CONTACT.email}`}
              className="whitespace-nowrap text-sp-ivory underline decoration-sp-ivory/40 underline-offset-4 hover:decoration-sp-ivory"
            >
              {HOME_CONTACT.email}
            </a>
          </p>
        </div>
      </div>
    </div>
  </section>
);

export const SiteFooter: React.FC<{
  nav?: readonly { id: string; label: string }[];
  reserveMobileLauncher?: boolean;
}> = ({ nav = HOME_NAV, reserveMobileLauncher = true }) => (
  <footer className={`bg-sp-deep ${reserveMobileLauncher ? 'pb-28' : 'pb-12'} text-sp-mist sm:pb-12`}>
    <div className="sp-shell">
      <div className="flex flex-col gap-8 border-t border-sp-ivory/15 pt-10 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Wordmark tone="light" />
          <p className="mt-4 text-[13px] uppercase tracking-[0.2em] text-sp-mist/80">
            {HOME_CONTACT.signature.join("  |  ")}
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-8 gap-y-3 text-[16px]">
            {nav.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(event) => goToSection(event, item.id)}
                  className="hover:text-sp-ivory"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="mt-10 text-[14px] text-sp-mist/70">
        © {new Date().getFullYear()} Sentient Partners · {HOME_CONTACT.location}
      </p>
    </div>
  </footer>
);
