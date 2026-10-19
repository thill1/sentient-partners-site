import { useEffect, useRef } from "react";
import { ArrowRight, Mail, Phone } from "lucide-react";
import { BOOKING_URL, BRAND } from "../../content/siteContent";
import { duration, ease, loadFabric, revealText } from "../../fabric/motion";
import "./contact-finale.css";

const STAGED = "(min-width: 900px) and (min-height: 640px)";

/* The finale: the bridge at dusk comes slowly closer as the fog clears,
   and the invitation settles in the middle of it. */
export default function Contact({ onBook }: { onBook: () => void }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let ctx: { revert: () => void } | undefined;
    let alive = true;
    loadFabric().then((f) => {
      if (!f || !alive) return;
      ctx = f.gsap.context(() => {
        const q = f.gsap.utils.selector(el);
        const mm = f.gsap.matchMedia();
        const intro = (trigger: Element, start: string) =>
          f.gsap
            .timeline({
              defaults: { ease: ease.out },
              scrollTrigger: { trigger, start, once: true },
            })
            .from(q(".cf-eyebrow, .cf-lede"), {
              autoAlpha: 0,
              y: 16,
              stagger: 0.12,
              duration: duration.slow,
            })
            .fromTo(
              q(".cf-underline"),
              { scaleX: 0 },
              { scaleX: 1, duration: 1.4, ease: ease.inOut },
              0.5,
            )
            .from(
              q(".cf-cta, .cf-alts"),
              { autoAlpha: 0, y: 12, stagger: 0.15, duration: duration.slow },
              0.35,
            );

        mm.add(STAGED, () => {
          const tl = f.gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "bottom bottom",
              scrub: 0.8,
            },
          });
          tl.fromTo(
            q(".cf-photo"),
            { scale: 1.28, yPercent: 6 },
            { scale: 1.02, yPercent: 0, duration: 1 },
            0,
          )
            .fromTo(
              q(".cf-fog-a"),
              { autoAlpha: 1, xPercent: 0 },
              { autoAlpha: 0.1, xPercent: -28, duration: 0.75 },
              0.2,
            )
            .fromTo(
              q(".cf-fog-b"),
              { autoAlpha: 1, xPercent: 0 },
              { autoAlpha: 0.15, xPercent: 26, duration: 0.75 },
              0.2,
            )
            .fromTo(
              q(".cf-veil"),
              { autoAlpha: 0.85 },
              { autoAlpha: 0.35, duration: 0.7 },
              0.3,
            );
          revealText(f, q(".cf-headline")[0], {
            type: "lines",
            start: "top 75%",
          });
          intro(q(".cf-headline")[0], "top 65%");
        });
        mm.add(`not all and ${STAGED}`, () => {
          f.gsap.fromTo(
            q(".cf-photo"),
            { scale: 1.12 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top bottom",
                end: "bottom bottom",
                scrub: true,
              },
            },
          );
          revealText(f, q(".cf-headline")[0], {
            type: "lines",
            start: "top 85%",
          });
          intro(q(".cf-headline")[0], "top 75%");
        });
      }, el);
    });
    return () => {
      alive = false;
      ctx?.revert();
    };
  }, []);

  return (
    <section ref={root} id="contact" className="contact-section contact-v2">
      <div className="cf-stage">
        <div className="cf-layers" aria-hidden="true">
          <div className="cf-photo" />
          <div className="cf-veil" />
          <div className="cf-fog-a" />
          <div className="cf-fog-b" />
        </div>
        <div className="page-width cf-content">
          <p className="eyebrow cf-eyebrow">
            The next step starts with a conversation
          </p>
          <h2 className="cf-headline">
            Let's build what's next
            <br />
            <em>for your business.</em>
          </h2>
          <p className="cf-lede">
            The right technology should make running your business
            <br className="desktop-break" /> simpler, not more complicated.
          </p>
          <a
            className="cf-cta cta-primary cta-lg"
            href={BOOKING_URL}
            onClick={(e) => {
              e.preventDefault();
              onBook();
            }}
          >
            <span className="cf-cta-label">
              Book a 20-minute intro call
              <i className="cf-underline" aria-hidden="true" />
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </a>
          <div className="cf-alts">
            <a className="cf-alt" href={BRAND.phoneHref}>
              <Phone size={14} aria-hidden="true" /> Prefer to talk?{" "}
              <span>{BRAND.phone}</span>
            </a>
            <a className="cf-alt" href={`mailto:${BRAND.email}`}>
              <Mail size={14} aria-hidden="true" /> Prefer to write?{" "}
              <span>{BRAND.email}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
