import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { RELAY } from "../../content/siteNav";
import { openContactModal } from "../../lib/siteActions";
import "./relay-showcase.css";

/** Real Relay screens (sample data), captured from the app. */
const screens = [
  ["relay-today", 640, 1387, "Relay Today view: the next visit card, a Needs you list and the Your day timeline"],
  ["relay-jobs", 640, 1387, "Relay jobs list with open and completed tabs, today's jobs and a Record payment button on a job that needs payment"],
  ["relay-job", 640, 1387, "Relay job screen with the customer's address, call, text and map buttons, the next step and the appointment details"],
  ["relay-calendar", 640, 1387, "Relay calendar day view with a week strip, scheduled visits with their status and open time slots"],
  ["relay-customers", 640, 1387, "Relay customers list with search, A to Z and recent sorting, and each customer's location and phone number"],
  ["relay-customer", 640, 1387, "Relay customer profile with call and text buttons, documents, create estimate and create invoice, and a Schedule job button"],
  ["relay-documents", 640, 1387, "Relay documents screen listing estimates and invoices with amounts and statuses such as waiting, paid and approved"],
  ["relay-sign", 640, 1432, "Relay estimate approval screen where the customer types their name, signs with a finger on the phone and agrees to the terms"],
  ["relay-more", 640, 1387, "Relay More menu with Needs you, Documents, Help, appearance, map settings and review links"],
] as const;

/** "The service day," + "in one app.": the last clause carries the emphasis. */
const [headlineLead, headlineEmphasis] = RELAY.headline.split(/,\s*/);

export interface RelayShowcaseProps {
  /** h3 inside the homepage Work section; h2 on /relay/, under the page title. */
  headingLevel?: "h2" | "h3";
  /** Adds a link to the Relay page (used on the homepage). */
  showOverviewLink?: boolean;
}

export function RelayShowcase({ headingLevel: Heading = "h3", showOverviewLink = false }: RelayShowcaseProps = {}) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const items = [...el.children] as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            setActive(items.indexOf(entry.target as HTMLElement));
        });
      },
      { root: el, threshold: 0.6 },
    );
    items.forEach((item) => io.observe(item));
    return () => io.disconnect();
  }, []);

  const go = (i: number) => {
    const el = track.current;
    const item = el?.children[i] as HTMLElement | undefined;
    if (!el || !item) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({
      left: item.offsetLeft - (el.clientWidth - item.clientWidth) / 2,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <div className="relay-showcase" aria-labelledby="relay-title">
      <div className="rs-copy">
        <p className="eyebrow">{RELAY.eyebrow}</p>
        <Heading id="relay-title" className="rs-title">
          {headlineLead},
          <br />
          <em>{headlineEmphasis}</em>
        </Heading>
        <p className="rs-outcome">{RELAY.summary}</p>
        <ul className="rs-points">
          {RELAY.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <button
          type="button"
          className="text-link"
          onClick={() =>
            openContactModal({
              source: "Sentient Relay interest",
              inquiry:
                "I would like to learn about Sentient Relay, currently in pilot.",
            })
          }
        >
          Ask about Sentient Relay <ArrowRight size={15} aria-hidden="true" />
        </button>
        {showOverviewLink && (
          <a className="text-link rs-overview" href={RELAY.path}>
            Relay overview <ArrowRight size={15} aria-hidden="true" />
          </a>
        )}
      </div>
      <div className="rs-gallery">
        <ul
          ref={track}
          className="rs-track"
          aria-label="Relay app screens"
          tabIndex={0}
        >
          {screens.map(([file, w, h, alt]) => (
            <li key={file} className="rs-phone">
              <img
                src={`/showcase/relay/${file}.webp?v=9`}
                alt={alt}
                width={w}
                height={h}
                loading="lazy"
                decoding="async"
              />
            </li>
          ))}
        </ul>
        <div className="rs-dots" role="group" aria-label="Choose a screen">
          {screens.map(([file], i) => (
            <button
              key={file}
              type="button"
              aria-label={`Screen ${i + 1} of ${screens.length}`}
              aria-current={active === i ? "true" : undefined}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <p className="rs-note">Real app screens with sample data.</p>
      </div>
    </div>
  );
}
