import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { openContactModal } from "../../lib/siteActions";
import "./relay-showcase.css";

/** Real Relay screens (sample data), captured from the app. */
const screens = [
  [
    "relay-home",
    "Relay home screen: today's date, a welcome, and shortcuts to add or find a customer, create an estimate or invoice, and record a payment",
  ],
  [
    "relay-calendar",
    "Relay calendar day view with scheduled visits, addresses and open time slots",
  ],
  [
    "relay-jobs",
    "Relay jobs list with open and completed tabs, job statuses, and a Record payment button on a job with a balance due",
  ],
  [
    "relay-estimate",
    "Relay estimate screen with the customer's details, the work needed and the estimate total",
  ],
  [
    "relay-sign",
    "Relay approval screen where the customer types their name and signs the estimate on the phone",
  ],
  [
    "relay-paid",
    "Relay payment screen showing the amount received and the payment method",
  ],
] as const;

export function RelayShowcase() {
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
        <p className="eyebrow">Sentient Relay · In development</p>
        <h3 id="relay-title">
          The service day,
          <br />
          <em>in one app.</em>
        </h3>
        <p className="rs-outcome">
          Schedule the visit, write the estimate, get it signed and record the
          payment, from the field or the office.
        </p>
        <ul className="rs-points">
          <li>Calendar and jobs, open and completed, in one place</li>
          <li>Estimates customers approve and sign on their phone</li>
          <li>Payments recorded against each job</li>
        </ul>
        <button
          type="button"
          className="text-link"
          onClick={() =>
            openContactModal({
              source: "Sentient Relay interest",
              inquiry:
                "I would like to learn about Sentient Relay, currently in development.",
            })
          }
        >
          Ask about Sentient Relay <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
      <div className="rs-gallery">
        <ul
          ref={track}
          className="rs-track"
          aria-label="Relay app screens"
          tabIndex={0}
        >
          {screens.map(([file, alt]) => (
            <li key={file} className="rs-phone">
              <img
                src={`/showcase/relay/${file}.webp`}
                alt={alt}
                width="640"
                height="1432"
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
