import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Menu,
  X,
  MapPin,
  Mail,
} from "lucide-react";
import type { BannerDisplayState } from "../../types";
import { BOOKING_URL } from "../../content/siteContent";
import {
  openBookingModal,
  openContactModal,
  openSentientChat,
} from "../../lib/siteActions";
import { GoldenGate } from "./GoldenGate";
import { Capabilities } from "./Capabilities";
import "./atmosphere.css";

const book = (source: string) =>
  openBookingModal({ source, ctaLabel: "Book a Conversation" });
function Brand() {
  return (
    <a className="brand-lockup" href="#top">
      <img
        src="/atmosphere/sp-monogram-white.png"
        alt=""
        width="50"
        height="50"
      />
      <span>
        <strong>Sentient Partners</strong>
        <small>STRATEGY | INTELLIGENCE | RESULTS</small>
      </span>
    </a>
  );
}
const links = [
  ["Perspective", "#perspective"],
  ["Capabilities", "#capabilities"],
  ["Our work", "#work"],
  ["Our founder", "#founder"],
];
function Navigation() {
  const [menu, setMenu] = useState(false),
    [scrolled, setScrolled] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const update = () => setScrolled(scrollY > 30);
    update();
    addEventListener("scroll", update, { passive: true });
    return () => removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    addEventListener("keydown", close);
    return () => removeEventListener("keydown", close);
  }, [menu]);
  return (
    <header className={`site-header ${scrolled ? "header-scrolled" : ""}`}>
      <div className="header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <a
          className="header-book"
          href={BOOKING_URL}
          onClick={(e) => {
            e.preventDefault();
            book("Navigation");
          }}
        >
          Let's talk <ArrowUpRight size={15} />
        </a>
        <button
          ref={menuButton}
          className="menu-toggle"
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
          aria-controls="mobile-navigation"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </div>
      {menu && (
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          aria-label="Mobile navigation"
        >
          {links.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setMenu(false)}>
              {label}
              <ArrowUpRight size={18} />
            </a>
          ))}
          <a href="#contact" onClick={() => setMenu(false)}>
            Book a conversation <ArrowUpRight size={18} />
          </a>
        </nav>
      )}
    </header>
  );
}
const outcomes = [
  [
    "Attract & Convert",
    "Make it easier to find you. And choose you.",
    "Distinctive websites, local search visibility, and a clear path from first impression to inquiry.",
  ],
  [
    "Automate & Communicate",
    "Be responsive, without being everywhere.",
    "Helpful voice and chat experiences, timely follow-up, and fewer routine tasks for your team.",
  ],
  [
    "Operate & Scale",
    "Give your business room to grow.",
    "Connected scheduling, customer operations, applications, and invoicing that work together.",
  ],
  [
    "Advise & Grow",
    "Move forward with a practical plan.",
    "A clear-eyed view of your business, a sensible technology roadmap, and hands-on implementation.",
  ],
];
const stages = [
  ["Inquiry", "Capture the question and the context."],
  ["Booking", "Find a time. Confirm the details."],
  ["Service", "Give your team what they need."],
  ["Billing", "Prepare an accurate invoice for review."],
  ["Follow-up", "Keep the relationship moving forward."],
];
function Connected() {
  const [stage, setStage] = useState(0);
  return (
    <section className="connected-section section-space">
      <div className="page-width connected-inner">
        <div>
          <p className="eyebrow">Connected intelligence</p>
          <h2>
            Less friction.
            <br />
            <em>More forward.</em>
          </h2>
          <p>
            When your systems work together, your people can focus on the work
            that matters. We connect the journey, with you in control.
          </p>
        </div>
        <div className="connection-story">
          <div className="journey-line">
            {stages.map(([name], i) => (
              <button
                key={name}
                aria-pressed={stage === i}
                onClick={() => setStage(i)}
              >
                <span>{i < stage ? <Check size={15} /> : i + 1}</span>
                <strong>{name}</strong>
              </button>
            ))}
          </div>
          <div className="journey-detail" aria-live="polite">
            <span>{stages[stage][0]}</span>
            <p>{stages[stage][1]}</p>
            <button
              aria-label="Explore next workflow step"
              onClick={() => setStage((stage + 1) % stages.length)}
            >
              <ArrowRight size={20} />
            </button>
          </div>
          <small>Connected systems. Clear handoffs. Human oversight.</small>
        </div>
      </div>
    </section>
  );
}
export default function Landing({ banner }: { banner: BannerDisplayState }) {
  return (
    <div className="atmosphere-page" id="top">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navigation />
      <main id="main-content">
        <GoldenGate />
        <section id="perspective" className="perspective-section section-space">
          <div className="page-width">
            <div className="place-line">
              <span>
                <MapPin size={13} /> Auburn, California
              </span>
              <span>Global perspective. Local commitment.</span>
            </div>
            <div className="perspective-layout">
              <h2>
                The discipline of
                <br />
                enterprise technology.
                <br />
                <em>
                  The commitment
                  <br />
                  of a local partner.
                </em>
              </h2>
              <div className="perspective-copy">
                <p className="lead-copy">
                  Big-business experience.
                  <br />
                  Built for your business.
                </p>
                <p>
                  Growing businesses deserve the same thoughtful strategy,
                  reliable systems, and disciplined execution as the world's
                  largest organizations.
                </p>
                <p>
                  We make that expertise practical. From Auburn and Placer
                  County to Greater Sacramento and beyond, we help you connect
                  the right technology to the work you do every day.
                </p>
                <a className="text-link" href="#founder">
                  The experience behind the partnership{" "}
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </div>
            {banner.visible && (
              <aside
                className="partner-announcement"
                aria-label="Current invitation"
              >
                <span>{banner.message}</span>
                <a
                  href={
                    banner.ctaUrl === "#blueprint" ? "#contact" : banner.ctaUrl
                  }
                  onClick={(event) => {
                    if (banner.ctaUrl === "#blueprint") {
                      event.preventDefault();
                      openContactModal({
                        intent: "blueprint",
                        source: "Partner invitation",
                        ctaLabel: banner.ctaText,
                      });
                    }
                  }}
                >
                  {banner.ctaText}
                  <ArrowUpRight size={14} />
                </a>
              </aside>
            )}
          </div>
        </section>
        <section id="services" className="outcomes-section section-space">
          <div className="page-width">
            <div className="section-heading">
              <div>
                <p className="eyebrow">What we help you accomplish</p>
                <h2>
                  Better business.
                  <br />
                  <em>By intention.</em>
                </h2>
              </div>
              <p>
                Start with what needs to work better.
                <br />
                We'll bring the strategy and the systems.
              </p>
            </div>
            <div className="outcomes-grid">
              {outcomes.map(([title, heading, body]) => (
                <article key={title}>
                  <span className="outcome-title">{title}</span>
                  <h3>{heading}</h3>
                  <p>{body}</p>
                  <a
                    href="#capabilities"
                    aria-label={`Explore ${title.toLowerCase()} capabilities`}
                  >
                    <ArrowUpRight size={20} />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
        <Capabilities />
        <Connected />
        <section id="work" className="work-section section-space">
          <div className="page-width">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Real work. Practical results.</p>
                <h2>
                  Built for the way
                  <br />
                  <em>business actually happens.</em>
                </h2>
              </div>
              <p>
                Practical implementation across service businesses. Here are the
                kinds of problems we work on.
              </p>
            </div>
            <div className="work-grid">
              <article>
                <div className="work-visual field-visual" aria-hidden="true">
                  <div className="field-preview">
                    <span>SERVICE DAY</span>
                    <div>
                      <i /> Dispatch & scheduling
                    </div>
                    <div>
                      <i /> Field notes & job status
                    </div>
                    <div>
                      <i /> Invoice preparation
                    </div>
                    <div className="field-summary">
                      From the office to the field <ArrowUpRight size={15} />
                    </div>
                  </div>
                </div>
                <p className="eyebrow">Field operations</p>
                <h3>
                  More time on the job.
                  <br />
                  Less time chasing details.
                </h3>
                <p>
                  HVAC service workflows and field applications that connect
                  scheduling, job information, and invoicing.
                </p>
                <button
                  className="text-link"
                  onClick={() =>
                    openContactModal({
                      source: "Field operations work",
                      inquiry:
                        "I would like to discuss field operations for my business.",
                    })
                  }
                >
                  Explore the possibilities <ArrowUpRight size={15} />
                </button>
              </article>
              <article>
                <div className="work-visual customer-visual" aria-hidden="true">
                  <div className="estimate-preview">
                    <span>A CLEARER CUSTOMER JOURNEY</span>
                    <strong>
                      A fresh start,
                      <br />
                      <em>made simple.</em>
                    </strong>
                    <div>
                      Discover <ArrowRight size={12} /> Estimate{" "}
                      <ArrowRight size={12} /> Schedule
                    </div>
                  </div>
                </div>
                <p className="eyebrow">Customer experience</p>
                <h3>
                  A better experience.
                  <br />
                  From the first inquiry.
                </h3>
                <p>
                  Cleaning business websites, estimating tools, and
                  customer-facing systems that make the next step clear.
                </p>
                <button
                  className="text-link"
                  onClick={() =>
                    openContactModal({
                      source: "Customer experience work",
                      inquiry:
                        "I would like to discuss my website and customer experience.",
                    })
                  }
                >
                  Start a conversation <ArrowUpRight size={15} />
                </button>
              </article>
              <article>
                <div className="work-visual relay-visual" aria-hidden="true">
                  <div className="relay-symbol">
                    r<span>elay</span>
                  </div>
                  <div className="relay-lines">
                    <span>Customers</span>
                    <i />
                    <span>Operations</span>
                    <i />
                    <span>Insights</span>
                  </div>
                </div>
                <p className="eyebrow">Sentient Relay · In development</p>
                <h3>
                  Connected operations.
                  <br />A stronger foundation.
                </h3>
                <p>
                  Our reusable service-business platform brings together lessons
                  from custom applications, automation, and QuickBooks-connected
                  workflows.
                </p>
                <button
                  className="text-link"
                  onClick={() =>
                    openContactModal({
                      source: "Sentient Relay interest",
                      inquiry:
                        "I would like to learn about Sentient Relay, currently in development.",
                    })
                  }
                >
                  Discuss your operations <ArrowUpRight size={15} />
                </button>
              </article>
            </div>
            <p className="work-disclosure">
              Visuals illustrate implementation areas. They are not client
              dashboards or claims of measured results.
            </p>
          </div>
        </section>
        <section id="founder" className="founder-section section-space">
          <div className="page-width founder-layout">
            <div className="founder-portrait">
              <img
                src="/atmosphere/troy-hill-480.webp"
                alt="Troy Hill, Founder and Principal Consultant at Sentient Partners"
                loading="lazy"
                width="480"
                height="600"
              />
              <div>
                <strong>Troy Hill</strong>
                <span>Founder & Principal Consultant</span>
              </div>
            </div>
            <div className="founder-copy">
              <p className="eyebrow">Meet your partner</p>
              <h2>
                Enterprise experience.
                <br />
                <em>Personal accountability.</em>
              </h2>
              <p className="lead-copy">
                Global experience is where the story begins.
                <br />
                Local partnership is why it matters.
              </p>
              <p>
                After decades leading global teams and mission-critical
                operations, Troy Hill founded Sentient Partners to bring
                enterprise-level expertise directly to growing businesses.
              </p>
              <p>
                His prior senior leadership experience at Hewlett-Packard and
                E*TRADE Financial spans teams of thousands and technology
                operations reaching more than 180 countries. That background
                informs a practical approach: understand the business, build
                carefully, and verify the result.
              </p>
              <p>
                Today, every engagement combines strategic perspective with
                hands-on execution and a personal commitment to getting it
                right.
              </p>
              <div className="experience-note">
                Prior corporate experience includes financial services,
                aviation, healthcare, and enterprise technology. These are
                Troy's career credentials, not Sentient Partners client
                endorsements.
              </div>
              <a
                className="text-link"
                href={BOOKING_URL}
                onClick={(e) => {
                  e.preventDefault();
                  book("Founder");
                }}
              >
                Have a conversation with Troy <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
        </section>
        <section id="process" className="process-section section-space">
          <div className="page-width">
            <div className="section-heading">
              <div>
                <p className="eyebrow">How we partner</p>
                <h2>
                  Clear thinking.
                  <br />
                  <em>Careful execution.</em>
                </h2>
              </div>
              <p>
                Direct access to your partner.
                <br />A practical path from possibility to progress.
              </p>
            </div>
            <div className="process-grid">
              {[
                [
                  "01",
                  "Discover",
                  "We listen first. Together, we understand your business, the friction, and the opportunities worth pursuing.",
                ],
                [
                  "02",
                  "Design",
                  "We shape a practical strategy, establish priorities, and agree on a clear implementation roadmap.",
                ],
                [
                  "03",
                  "Deliver",
                  "We build, test, and implement with your team. Then refine the system as your business evolves.",
                ],
              ].map(([n, title, copy]) => (
                <article key={title}>
                  <span>{n}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="local-interlude">
          <img
            src="/atmosphere/downtown-auburn-1200.webp"
            alt="Historic downtown Auburn in Northern California"
            width="1200"
            height="800"
            loading="lazy"
          />
          <div className="page-width">
            <p className="eyebrow">Rooted in Northern California</p>
            <p>
              We don't build client lists.
              <br />
              <em>We build partnerships.</em>
            </p>
            <span>Auburn · Placer County · Greater Sacramento</span>
          </div>
        </section>
        <section id="contact" className="contact-section section-space">
          <div className="page-width">
            <p className="eyebrow">The next step starts with a conversation</p>
            <h2>
              Let's build what's next
              <br />
              <em>for your business.</em>
            </h2>
            <p>
              The right technology should make running your business
              <br className="desktop-break" /> simpler, not more complicated.
            </p>
            <a
              className="button button-light"
              href={BOOKING_URL}
              onClick={(e) => {
                e.preventDefault();
                book("Final invitation");
              }}
            >
              Schedule a Conversation <ArrowUpRight size={17} />
            </a>
            <button
              className="contact-alternative"
              onClick={() => openContactModal({ source: "Final invitation" })}
            >
              Prefer to write? Send us a note <Mail size={14} />
            </button>
          </div>
        </section>
      </main>
      <footer className="atmosphere-footer">
        <div className="page-width">
          <div className="footer-top">
            <div>
              <Brand />
              <p>Global perspective. Local commitment.</p>
            </div>
            <div>
              <span>Explore</span>
              <a href="#capabilities">Capabilities</a>
              <a href="#work">Our work</a>
              <a href="#founder">Our founder</a>
              <a href="#process">Our approach</a>
            </div>
            <div>
              <span>Let's connect</span>
              <a href="mailto:troyhill@sentientpartners.ai">
                troyhill@sentientpartners.ai
              </a>
              <a href={BOOKING_URL}>
                Book a conversation <ArrowUpRight size={12} />
              </a>
              <button onClick={() => openSentientChat({ source: "Footer" })}>
                Ask our AI concierge
              </button>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Sentient Partners.</span>
            <span>Auburn, California · Serving businesses everywhere.</span>
            <a href="/privacy.html">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
