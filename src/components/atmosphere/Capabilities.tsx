import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { openContactModal } from "../../lib/siteActions";
import { loadFabric, revealText, type Fabric } from "../../fabric/motion";
import {
  CalendarDemo,
  ChatDemo,
  OperationsDemo,
  ReviewsDemo,
  SearchDemo,
  VoiceDemo,
  WebsiteDemo,
  WorkflowDemo,
} from "./capabilityDemos";
// Load after the shared sheet so these rules win over its global button reset.
import "./atmosphere.css";
import "./capabilities.css";
import "./capabilities-journey.css";

type Tone = "dusk" | "night" | "day";

/**
 * One customer, one broken AC, start to finish. Each scene is a capability,
 * told as the moment it matters to her. Order follows the story, not the menu.
 */
const scenes = [
  {
    slug: "search",
    name: "Search Visibility",
    when: "Mon · 6:58 PM",
    tone: "dusk" as Tone,
    moment: "Her AC quits on the hottest night of the year. She searches.",
    copy: "Business profile care, local service pages, and sound technical foundations so you're the name she finds.",
    includes: ["Business profile", "Service pages", "Plain-language reporting"],
    // Auto-preview: switch on two foundations so the ranking visibly moves.
    preview: [
      '.cx-checks button[aria-checked="false"]',
      '.cx-checks button[aria-checked="false"]',
    ],
    Demo: SearchDemo,
  },
  {
    slug: "websites",
    name: "Premium Websites",
    when: "Mon · 7:01 PM",
    tone: "dusk" as Tone,
    moment: "Yours is the first site that looks like someone will pick up.",
    copy: "Thoughtful design, clear messaging, and fast pages that turn a first look into an inquiry.",
    includes: ["Custom design", "Mobile-first", "Analytics tied to inquiries"],
    preview: [],
    Demo: WebsiteDemo,
  },
  {
    slug: "ai-chatbots",
    name: "AI Chat Assistants",
    when: "Mon · 7:03 PM",
    tone: "dusk" as Tone,
    moment: "She asks a question instead of filling out a form.",
    copy: "Trained on your services and pricing. Qualifies the inquiry and hands your team the whole story.",
    includes: ["Website, text, social", "Lead qualification", "Human handoff"],
    preview: [".cx-replies button", ".cx-replies button"],
    Demo: ChatDemo,
  },
  {
    slug: "voice-agents",
    name: "AI Voice Agents",
    when: "Mon · 11:42 PM",
    tone: "night" as Tone,
    moment: "Still too hot to sleep. She calls. Someone answers.",
    copy: "After-hours and overflow calls handled in a natural voice, with urgent issues sent straight to a person.",
    includes: ["After hours", "Safety screening", "Summary by morning"],
    preview: [".cx-play"],
    Demo: VoiceDemo,
  },
  {
    slug: "scheduling",
    name: "Calendar & Scheduling",
    when: "Tue · 7:15 AM",
    tone: "day" as Tone,
    moment: "She books a visit before your office opens.",
    copy: "Availability, appointments, and reminders connected, so everyone knows what happens next.",
    includes: ["Online booking", "Team calendar sync", "Text reminders"],
    preview: [".cx-times button:not([disabled])"],
    Demo: CalendarDemo,
  },
  {
    slug: "business-apps",
    name: "Business Applications",
    when: "Tue · 8:30 AM",
    tone: "day" as Tone,
    moment: "Your crew rolls out with the job, the notes, and the address.",
    copy: "Jobs, customers, scheduling, and billing in one practical system built around how you work.",
    includes: ["Dispatch", "Job notes and photos", "Invoices and payments"],
    preview: [".cx-advance"],
    Demo: OperationsDemo,
  },
  {
    slug: "automation",
    name: "Workflow Automation",
    when: "Tue · 4:10 PM",
    tone: "day" as Tone,
    moment: "The estimate goes out while the truck is still in her driveway.",
    copy: "Handoffs between your tools run on rules you can read, with your approval where it counts.",
    includes: ["Connects your tools", "Approval steps", "Alerts when stalled"],
    preview: [".cx-play"],
    Demo: WorkflowDemo,
  },
  {
    slug: "reviews",
    name: "Reputation & Reviews",
    when: "Fri · 10:20 AM",
    tone: "day" as Tone,
    moment: "She tells the neighbors. You thank her in one tap.",
    copy: "Ask for honest feedback, answer it with drafts you approve, and see what customers keep saying.",
    includes: ["Review requests", "Drafted replies", "Monthly summary"],
    preview: [],
    Demo: ReviewsDemo,
  },
];

const PINNED = "(min-width: 1024px) and (min-height: 700px)";
const HOLD = 0.55; // scroll the strip rests on each scene, relative to a move

export function Capabilities() {
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLElement | null)[]>([]);
  const fabricRef = useRef<Fabric | null>(null);
  const triggerRef = useRef<{ start: number; end: number } | null>(null);
  const progressAt = useRef<number[]>([]);
  const activeRef = useRef(0);
  const previewed = useRef(new Set<number>());
  const touched = useRef(new Set<number>());
  const count = scenes.length;

  /** Each slide's distance from the reading position, for depth and fade. */
  const paint = useCallback((position: number) => {
    slides.current.forEach((el, i) => {
      if (!el) return;
      const d = Math.max(-1, Math.min(1, i - position));
      el.style.setProperty("--d", d.toFixed(3));
      el.style.setProperty("--a", Math.abs(d).toFixed(3));
    });
    const next = Math.max(0, Math.min(count - 1, Math.round(position)));
    if (next !== activeRef.current) {
      activeRef.current = next;
      setActive(next);
    }
  }, [count]);

  const goTo = useCallback(
    (index: number) => {
      const i = Math.max(0, Math.min(count - 1, index));
      const st = triggerRef.current;
      const lenis = fabricRef.current?.lenis;
      if (st && lenis && matchMedia(PINNED).matches) {
        const p = progressAt.current[i] ?? i / (count - 1);
        lenis.scrollTo(st.start + (st.end - st.start) * p, { duration: 1.2 });
        return;
      }
      const strip = track.current;
      const slide = slides.current[i];
      if (strip && slide) {
        const pad = parseFloat(getComputedStyle(strip).paddingLeft) || 0;
        strip.scrollTo({ left: slide.offsetLeft - pad, behavior: "smooth" });
      }
    },
    [count],
  );

  // Swipe/scroll mode: the strip's own scroll position drives the story.
  useEffect(() => {
    const strip = track.current;
    if (!strip || pinned) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      const first = slides.current[0];
      const second = slides.current[1];
      if (!first || !second) return;
      const step = second.offsetLeft - first.offsetLeft || 1;
      paint(strip.scrollLeft / step);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    strip.addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      strip.removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, [pinned, paint]);

  // Pinned mode (large screens, motion allowed): vertical scroll moves the
  // strip sideways, resting on each scene before gliding to the next.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    let ctx: { revert: () => void } | undefined;
    let alive = true;
    loadFabric().then((f) => {
      if (!f || !alive) return;
      fabricRef.current = f;
      ctx = f.gsap.context(() => {
        const q = f.gsap.utils.selector(el);
        revealText(f, q(".jf-heading")[0], { type: "words", start: "top 80%" });
        const mm = f.gsap.matchMedia();
        mm.add(PINNED, () => {
          setPinned(true);
          const strip = track.current!;
          const offset = (i: number) => {
            const s = slides.current[i];
            const first = slides.current[0];
            return s && first ? s.offsetLeft - first.offsetLeft : 0;
          };
          // Wait a frame so the pinned layout (and real slide widths) apply.
          let tl: ReturnType<typeof f.gsap.timeline> | undefined;
          const raf = requestAnimationFrame(() => {
            strip.scrollLeft = 0;
            tl = f.gsap.timeline({
              defaults: { ease: "power2.inOut" },
              scrollTrigger: {
                trigger: el,
                start: "top top",
                end: "bottom bottom",
                scrub: 0.5,
                invalidateOnRefresh: true,
                onRefresh: (self) => {
                  triggerRef.current = { start: self.start, end: self.end };
                },
              },
              // Read the strip's real position on every frame of the scrub,
              // not just on scroll events, so the story never lags the screen.
              onUpdate: () => {
                const x = -Number(f.gsap.getProperty(strip, "x"));
                paint(x / (offset(1) || 1));
              },
            });
            tl.to({}, { duration: HOLD / 2 });
            const at: number[] = [0];
            for (let i = 1; i < count; i++) {
              tl.to(strip, { x: () => -offset(i), duration: 1 });
              at.push(tl.duration());
              tl.to({}, { duration: i === count - 1 ? HOLD / 2 : HOLD });
            }
            const total = tl.duration();
            // Land each deep-link on the middle of that scene's rest.
            progressAt.current = at.map((t, i) =>
              Math.min(1, (t + (i === 0 ? 0 : HOLD / 4)) / total),
            );
            const st = tl.scrollTrigger!;
            triggerRef.current = { start: st.start, end: st.end };
          });
          return () => {
            cancelAnimationFrame(raf);
            tl?.scrollTrigger?.kill();
            tl?.kill();
            f.gsap.set(strip, { clearProps: "transform" });
            triggerRef.current = null;
            setPinned(false);
          };
        });
      }, el);
    });
    return () => {
      alive = false;
      ctx?.revert();
    };
  }, [count, paint]);

  // Auto-preview: the first time a scene settles into view, play a few of
  // its interactions so no window sits empty. Any touch hands over control.
  useEffect(() => {
    const i = active;
    if (previewed.current.has(i) || touched.current.has(i)) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const steps = scenes[i].preview;
    const slide = slides.current[i];
    if (!slide || !steps.length) return;
    const ids: number[] = [];
    const settle = window.setTimeout(() => {
      if (activeRef.current !== i || touched.current.has(i)) return;
      previewed.current.add(i);
      steps.forEach((selector, n) => {
        ids.push(
          window.setTimeout(() => {
            if (touched.current.has(i)) return;
            slide.querySelector<HTMLElement>(selector)?.click();
          }, n * 1900),
        );
      });
    }, 700);
    return () => {
      clearTimeout(settle);
      ids.forEach(clearTimeout);
    };
  }, [active]);

  // Deep links such as "#capabilities:websites" open that scene.
  useEffect(() => {
    const open = (slug: string) => {
      const index = scenes.findIndex((s) => s.slug === slug);
      if (index < 0) return;
      const el = section.current;
      const lenis = fabricRef.current?.lenis;
      if (triggerRef.current && matchMedia(PINNED).matches) {
        goTo(index);
        return;
      }
      if (lenis && el) lenis.scrollTo(el, { offset: -96, duration: 1.1 });
      else el?.scrollIntoView({ behavior: "smooth" });
      window.setTimeout(() => goTo(index), 500);
    };
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.(
        'a[href^="#capabilities:"]',
      );
      if (!link) return;
      event.preventDefault();
      event.stopPropagation();
      open(link.getAttribute("href")!.slice("#capabilities:".length));
    };
    document.addEventListener("click", onClick, true);
    if (location.hash.startsWith("#capabilities:")) {
      const slug = location.hash.slice("#capabilities:".length);
      window.setTimeout(() => open(slug), 600);
    }
    return () => document.removeEventListener("click", onClick, true);
  }, [goTo]);

  const tone = scenes[active].tone;

  return (
    <section
      ref={section}
      id="capabilities"
      className={`capabilities-section jf${pinned ? " is-pinned" : ""}`}
      data-tone={tone}
      aria-roledescription="carousel"
      aria-label="Capabilities: one customer, start to finish"
    >
      <div className="jf-stage">
        <div className="jf-sky" aria-hidden="true">
          <i className="is-dusk" />
          <i className="is-night" />
          <i className="is-day" />
        </div>

        <header className="page-width jf-head">
          <div>
            <p className="eyebrow">Capabilities</p>
            <h2 className="jf-heading">
              One customer. <em>Start to finish.</em>
            </h2>
          </div>
          <div className="jf-progress">
            <p className="jf-now" aria-live="polite">
              <span key={active}>
                <b>{scenes[active].when}</b> {scenes[active].name}
              </span>
            </p>
            <ol className="jf-ticks">
              {scenes.map((s, i) => (
                <li key={s.slug}>
                  <button
                    aria-label={`${s.when}: ${s.name}`}
                    aria-current={active === i ? "step" : undefined}
                    className={i < active ? "is-past" : undefined}
                    onClick={() => goTo(i)}
                  />
                </li>
              ))}
            </ol>
            <div className="jf-arrows">
              <button
                aria-label="Previous scene"
                disabled={active === 0}
                onClick={() => goTo(active - 1)}
              >
                <ArrowLeft size={16} />
              </button>
              <button
                aria-label="Next scene"
                disabled={active === count - 1}
                onClick={() => goTo(active + 1)}
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className="jf-viewport">
          <div className="jf-track" ref={track}>
            {scenes.map((s, i) => (
              <article
                key={s.slug}
                ref={(el) => {
                  slides.current[i] = el;
                }}
                className={`jf-scene is-${i % 2 ? "flip" : "lead"}${active === i ? " is-active" : ""}`}
                data-tone={s.tone}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}: ${s.name}`}
                aria-hidden={pinned && Math.abs(active - i) > 1 ? true : undefined}
                onPointerDown={() => touched.current.add(i)}
                onKeyDown={() => touched.current.add(i)}
              >
                <div className="jf-scene-inner">
                  <div className="jf-moment">
                    <p className="jf-when">
                      <i aria-hidden="true" />
                      {s.when}
                    </p>
                    <h3>{s.moment}</h3>
                  </div>
                  <div className="jf-screen">
                    <s.Demo />
                  </div>
                  <div className="jf-detail">
                    <p className="jf-cap">{s.name}</p>
                    <p className="jf-copy">{s.copy}</p>
                    <ul aria-label="Included">
                      {s.includes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <button
                      className="jf-discuss"
                      onClick={() =>
                        openContactModal({
                          source: "Capability journey",
                          inquiry: `I'd like to explore ${s.name.toLowerCase()} for my business.`,
                        })
                      }
                    >
                      Discuss {s.name}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="page-width">
          <p className="jf-note">
            Sample screens with sample data. Try any of them.
          </p>
        </div>
      </div>
      <noscript>
        <p>
          Our capabilities include search visibility, premium websites, AI chat
          assistants, AI voice agents, calendar and scheduling, business
          applications, workflow automation, and reputation and review
          management.
        </p>
      </noscript>
    </section>
  );
}
