import React from 'react';
import { BarChart3, MessagesSquare, Sprout, Users } from 'lucide-react';
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
} from '../../content/homeContent';
import { bookIntroduction, goToSection } from './actions';
import { Arrow } from './Arrow';
import { Wordmark } from './Wordmark';

/** A brief statement of what the firm is, before any tools appear. */
export const IntroSection: React.FC = () => (
  <section aria-labelledby="intro-heading" className="bg-sp-ivory pt-[clamp(4.5rem,3rem+5vw,8rem)]">
    <div className="sp-shell grid gap-8 lg:grid-cols-12 lg:gap-12">
      <h2 id="intro-heading" className="sp-h2 text-sp-navy lg:col-span-6">
        {HOME_INTRO.heading}
      </h2>
      <div className="space-y-5 lg:col-span-5 lg:col-start-8 lg:border-l lg:border-sp-line lg:pl-12">
        {HOME_INTRO.body.map((paragraph) => (
          <p key={paragraph} className="sp-lede text-sp-ink">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  </section>
);

const PILLAR_ICONS = { attract: Users, automate: MessagesSquare, operate: BarChart3, advise: Sprout } as const;

/** The four ways the firm works with a business. Advisory sits here, beside the technology. */
export const PillarsSection: React.FC = () => (
  <section id="services" aria-labelledby="services-heading" className="sp-section border-y border-sp-line bg-sp-cream">
    <div className="sp-shell">
      <h2 id="services-heading" className="sp-h2 max-w-[22ch] text-sp-navy">
        {HOME_PILLARS.heading}
      </h2>
      <ul className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-0">
        {HOME_PILLARS.pillars.map((pillar, index) => {
          const Icon = PILLAR_ICONS[pillar.id];
          return (
            <li
              key={pillar.id}
              className={`lg:px-8 ${index === 0 ? 'lg:pl-0' : 'lg:border-l lg:border-sp-line'} ${index === 3 ? 'lg:pr-0' : ''}`}
            >
              <Icon aria-hidden="true" className="h-8 w-8 text-sp-bronze" strokeWidth={1.2} />
              <h3 className="sp-h3 mt-6 text-sp-navy lg:min-h-[2.4em]">{pillar.name}</h3>
              <p className="mt-3 text-[16px] leading-relaxed text-sp-ink">{pillar.outcome}</p>
              <p className="mt-4 text-[14px] leading-relaxed text-sp-slate">{pillar.scope}</p>
            </li>
          );
        })}
      </ul>
    </div>
  </section>
);

/** The founder's perspective, beside the redwoods. Employer names stay in the full bio. */
export const FounderSection: React.FC = () => (
  <section id="founder" aria-labelledby="founder-heading" className="sp-section bg-sp-ivory">
    <div className="sp-shell grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="lg:sticky lg:top-28 lg:col-span-5">
        <img
          src="/home/redwoods-1370.webp"
          srcSet="/home/redwoods-685.webp 685w, /home/redwoods-1370.webp 1370w"
          sizes="(min-width: 1024px) 38vw, 100vw"
          alt={HOME_FOUNDER.imageAlt}
          width={1370}
          height={676}
          loading="lazy"
          decoding="async"
          className="aspect-[3/2] w-full rounded-[4px] object-cover lg:aspect-[4/5]"
        />
      </div>
      <div className="lg:col-span-7">
        <h2 id="founder-heading" className="sp-h2 text-sp-navy">
          {HOME_FOUNDER.heading}
        </h2>
        <div className="mt-8 max-w-[38rem] space-y-5">
          {HOME_FOUNDER.body.map((paragraph) => (
            <p key={paragraph} className="sp-lede text-sp-ink">
              {paragraph}
            </p>
          ))}
        </div>
        <dl className="mt-12 border-t border-sp-line">
          {HOME_FOUNDER.points.map((point) => (
            <div key={point.name} className="grid gap-2 border-b border-sp-line py-6 sm:grid-cols-5 sm:gap-8">
              <dt className="font-editorial text-[19px] leading-snug text-sp-navy sm:col-span-2">{point.name}</dt>
              <dd className="text-[16px] leading-relaxed text-sp-slate sm:col-span-3">{point.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  </section>
);

/** Local roots: the photograph is downtown Auburn, where the firm is based. */
export const AuburnSection: React.FC = () => (
  <section aria-labelledby="auburn-heading" className="bg-sp-ivory pb-[clamp(4.5rem,3rem+5vw,8rem)]">
    <div className="sp-shell grid items-end gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-4 lg:pb-4">
        <h2 id="auburn-heading" className="sp-h2 text-sp-navy">
          {HOME_AUBURN.heading}
        </h2>
        <div className="mt-6 space-y-4">
          {HOME_AUBURN.body.map((paragraph) => (
            <p key={paragraph} className="text-[17px] leading-relaxed text-sp-ink">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
      <img
        src="/home/downtown-auburn-1200.webp"
        srcSet="/home/downtown-auburn-800.webp 800w, /home/downtown-auburn-1200.webp 1200w, /home/downtown-auburn-2048.webp 2048w"
        sizes="(min-width: 1024px) 62vw, 100vw"
        alt={HOME_AUBURN.imageAlt}
        width={2048}
        height={1366}
        loading="lazy"
        decoding="async"
        className="aspect-[3/2] w-full rounded-[4px] object-cover lg:col-span-8"
      />
    </div>
  </section>
);

/** Four steps, in order. The numerals are real: each step depends on the one before. */
export const ProcessSection: React.FC = () => (
  <section id="approach" aria-labelledby="approach-heading" className="sp-section border-t border-sp-line bg-sp-cream">
    <div className="sp-shell">
      <h2 id="approach-heading" className="sp-h2 max-w-[26ch] text-sp-navy">
        {HOME_PROCESS.heading}
      </h2>
      <ol className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {HOME_PROCESS.steps.map((step, index) => (
          <li key={step.name} className="border-t border-sp-navy/25 pt-6">
            <span aria-hidden="true" className="font-editorial text-[15px] text-sp-bronze">
              {index + 1}
            </span>
            <h3 className="sp-h3 mt-2 text-sp-navy">{step.name}</h3>
            <p className="mt-3 text-[16px] leading-relaxed text-sp-slate">{step.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

/** The close: one next step, and the direct ways to reach the firm. */
export const CloseSection: React.FC = () => (
  <section id="contact" aria-labelledby="contact-heading" className="sp-section bg-sp-deep text-sp-ivory">
    <div className="sp-shell grid gap-12 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-7">
        <h2 id="contact-heading" className="sp-h2">
          {HOME_CLOSE.heading}
        </h2>
        <p className="sp-lede mt-6 max-w-[34rem] text-sp-mist">{HOME_CLOSE.body}</p>
      </div>
      <div className="lg:col-span-4 lg:col-start-9">
        <button type="button" onClick={() => bookIntroduction('Close')} className="sp-btn sp-btn-champagne w-full sm:w-auto">
          {HOME_CTA.book}
          <Arrow />
        </button>
        <p className="mt-6 text-[16px] leading-relaxed text-sp-mist">
          Or call or text{' '}
          <a href={HOME_CONTACT.phoneHref} className="whitespace-nowrap text-sp-ivory underline decoration-sp-ivory/40 underline-offset-4 hover:decoration-sp-ivory">
            {HOME_CONTACT.phone}
          </a>
          , or email{' '}
          <a
            href={`mailto:${HOME_CONTACT.email}`}
            className="break-words text-sp-ivory underline decoration-sp-ivory/40 underline-offset-4 hover:decoration-sp-ivory"
          >
            {HOME_CONTACT.email}
          </a>
          .
        </p>
      </div>
    </div>
  </section>
);

export const SiteFooter: React.FC = () => (
  <footer className="bg-sp-deep pb-28 text-sp-mist sm:pb-12">
    <div className="sp-shell">
      <div className="flex flex-col gap-8 border-t border-sp-ivory/15 pt-10 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Wordmark tone="light" />
          <p className="mt-4 text-[13px] uppercase tracking-[0.2em] text-sp-mist/80">{HOME_CONTACT.signature.join('  |  ')}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-8 gap-y-3 text-[15px]">
            {HOME_NAV.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} onClick={(event) => goToSection(event, item.id)} className="hover:text-sp-ivory">
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
