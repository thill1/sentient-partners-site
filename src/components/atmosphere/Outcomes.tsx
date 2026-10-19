import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { duration, ease, loadFabric, revealText } from "../../fabric/motion";
import "./outcomes.css";

const outcomes = [
  [
    "Attract & Convert",
    "Make it easier to find you. And choose you.",
    "Distinctive websites, local search visibility, and a clear path from first impression to inquiry.",
    "#capabilities:websites",
    "See websites and search",
  ],
  [
    "Automate & Communicate",
    "Be responsive, without being everywhere.",
    "Helpful voice and chat experiences, timely follow-up, and fewer routine tasks for your team.",
    "#capabilities:ai-chatbots",
    "See chat and voice assistants",
  ],
  [
    "Operate & Scale",
    "Give your business room to grow.",
    "Connected scheduling, customer operations, applications, and invoicing that work together.",
    "#capabilities:business-apps",
    "See business applications",
  ],
  [
    "Advise & Grow",
    "Move forward with a practical plan.",
    "A clear-eyed view of your business, a sensible technology roadmap, and hands-on implementation.",
    "#process",
    "See how we partner",
  ],
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Outcomes: four rows take the stage in turn while a giant champagne numeral
 * counts 01→04 and a rail tracks progress. A tall CSS track with a sticky
 * stage keeps the size fixed from first paint (no layout shift). Small or
 * short screens get an unpinned sequence; reduced motion gets the still list.
 */
export default function Outcomes() {
  const track = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let ctx: { revert: () => void } | undefined;
    let alive = true;
    loadFabric().then((f) => {
      if (!f || !alive) return;
      ctx = f.gsap.context(() => {
        const q = f.gsap.utils.selector(el);
        const mm = f.gsap.matchMedia();

        mm.add("(min-width: 900px) and (min-height: 640px)", () => {
          el.classList.add("is-staged");
          const items = q<HTMLElement>(".ov-item");
          const splits = items.map((item) =>
            f.SplitText.create(item.querySelector("h3")!, {
              type: "words",
              mask: "words",
            }),
          );
          const bodies = items.map((item) =>
            f.SplitText.create(item.querySelector(".ov-body")!, {
              type: "words",
            }),
          );
          const heading = f.SplitText.create(q(".ov-heading")[0], {
            type: "words",
            mask: "words",
          });
          f.gsap.set(items, { autoAlpha: 0 });
          f.gsap.set(
            splits.map((s) => s.words),
            { yPercent: 110 },
          );
          f.gsap.set(
            bodies.map((s) => s.words),
            { autoAlpha: 0, y: 12 },
          );
          f.gsap.set(q(".ov-link"), { autoAlpha: 0 });

          // Heading arrives as the stage settles, before the scrub begins.
          f.gsap.from(heading.words, {
            yPercent: 110,
            stagger: 0.05,
            duration: duration.slow,
            ease: ease.out,
            scrollTrigger: { trigger: el, start: "top 70%", once: true },
          });
          f.gsap.from(q(".ov-intro, .ov-rail"), {
            autoAlpha: 0,
            y: 20,
            stagger: 0.12,
            duration: duration.slow,
            scrollTrigger: { trigger: el, start: "top 55%", once: true },
          });

          const tl = f.gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: el,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.8,
              onUpdate: (self) => {
                const step = Math.min(3, Math.floor(self.progress * 4.2));
                items.forEach((item, i) =>
                  item.toggleAttribute("aria-current", i === step),
                );
                q(".ov-rail li").forEach((dot, i) =>
                  dot.classList.toggle("is-active", i <= step),
                );
              },
            },
          });

          // Ambient depth across the whole pin.
          tl.fromTo(
            q(".ov-fog-a"),
            { xPercent: -10 },
            { xPercent: 12, duration: 1 },
            0,
          )
            .fromTo(
              q(".ov-fog-b"),
              { xPercent: 8 },
              { xPercent: -10, duration: 1 },
              0,
            )
            .fromTo(
              q(".ov-glow"),
              { yPercent: 10 },
              { yPercent: -18, duration: 1 },
              0,
            )
            .fromTo(
              q(".ov-rail-fill"),
              { scaleY: 0 },
              { scaleY: 1, duration: 0.86 },
              0.04,
            );

          // The numeral rolls one digit per outcome, landing as each takes the stage.
          for (let i = 1; i < 4; i++) {
            tl.to(
              q(".ov-numerals"),
              { yPercent: -25 * i, duration: 0.07, ease: ease.inOut },
              0.02 + i * 0.25 - 0.045,
            );
          }

          // Each outcome takes the stage, then yields to the next.
          const slot = 0.25;
          items.forEach((item, i) => {
            const at = 0.02 + i * slot;
            tl.to(item, { autoAlpha: 1, duration: 0.02 }, at)
              .to(
                splits[i].words,
                {
                  yPercent: 0,
                  stagger: 0.008,
                  duration: 0.07,
                  ease: ease.soft,
                },
                at,
              )
              .to(
                bodies[i].words,
                {
                  autoAlpha: 1,
                  y: 0,
                  stagger: 0.003,
                  duration: 0.05,
                  ease: ease.soft,
                },
                at + 0.05,
              )
              .to(
                item.querySelector(".ov-link"),
                { autoAlpha: 1, duration: 0.04 },
                at + 0.09,
              );
            if (i < items.length - 1) {
              tl.to(
                splits[i].words,
                {
                  yPercent: -110,
                  stagger: 0.005,
                  duration: 0.05,
                  ease: "power2.in",
                },
                at + slot - 0.06,
              )
                .to(
                  [bodies[i].words, item.querySelector(".ov-link")],
                  { autoAlpha: 0, y: -10, duration: 0.04 },
                  at + slot - 0.06,
                )
                .set(item, { autoAlpha: 0 }, at + slot - 0.005);
            }
          });

          // Handoff: fog thickens and the stage dims into Capabilities' navy.
          tl.to(q(".ov-dusk"), { autoAlpha: 1, duration: 0.1 }, 0.9).to(
            q(".ov-content"),
            { yPercent: -4, autoAlpha: 0.35, duration: 0.1 },
            0.9,
          );

          return () => {
            el.classList.remove("is-staged");
            items.forEach((item) => item.removeAttribute("aria-current"));
            [...splits, ...bodies, heading].forEach((s) => s.revert());
          };
        });

        mm.add("(max-width: 899px), (max-height: 639px)", () => {
          revealText(f, q(".ov-heading")[0], { type: "words" });
          q<HTMLElement>(".ov-item h3").forEach((h) =>
            revealText(f, h, { type: "words" }),
          );
          q<HTMLElement>(".ov-item").forEach((item) => {
            f.gsap.from(
              item.querySelectorAll(
                ".ov-number-inline, .ov-label, .ov-body, .ov-link",
              ),
              {
                autoAlpha: 0,
                y: 18,
                stagger: duration.stagger,
                duration: duration.slow,
                scrollTrigger: { trigger: item, start: "top 85%", once: true },
              },
            );
            f.gsap.fromTo(
              item,
              { "--ov-rule": 0 },
              {
                "--ov-rule": 1,
                duration: duration.slow,
                ease: ease.out,
                scrollTrigger: { trigger: item, start: "top 88%", once: true },
              },
            );
          });
        });
      }, el);
    });
    return () => {
      alive = false;
      ctx?.revert();
    };
  }, []);

  return (
    <section
      ref={track}
      id="services"
      className="outcomes-v2"
      aria-labelledby="outcomes-title"
    >
      <div className="ov-stage">
        <div className="ov-layers" aria-hidden="true">
          <div className="ov-glow" />
          <div className="ov-fog-a" />
          <div className="ov-fog-b" />
          <div className="ov-dusk" />
        </div>
        <div className="ov-content page-width">
          <header className="ov-head">
            <p className="eyebrow">What we help you accomplish</p>
            <h2 id="outcomes-title" className="ov-heading">
              Start where
              <br />
              <em>it hurts most.</em>
            </h2>
            <p className="ov-intro">
              Four places growing businesses lose time or customers.
              <br />
              Pick one. We bring the strategy and the systems.
            </p>
            <ol className="ov-rail" aria-hidden="true">
              {outcomes.map(([title], i) => (
                <li key={title}>
                  <span>{pad(i + 1)}</span>
                  {title}
                </li>
              ))}
              <span className="ov-rail-track">
                <span className="ov-rail-fill" />
              </span>
            </ol>
          </header>
          <div className="ov-numeral" aria-hidden="true">
            <div className="ov-numerals">
              {outcomes.map(([title], i) => (
                <span key={title}>{pad(i + 1)}</span>
              ))}
            </div>
          </div>
          <ol className="ov-list">
            {outcomes.map(([title, heading, body, href, cta], i) => (
              <li key={title} className="ov-item">
                <span className="ov-number-inline" aria-hidden="true">
                  {pad(i + 1)}
                </span>
                <div className="ov-text">
                  <span className="ov-label">{title}</span>
                  <h3>{heading}</h3>
                  <p className="ov-body">{body}</p>
                  <a className="text-link ov-link" href={href}>
                    {cta} <ArrowRight size={15} aria-hidden="true" />
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
