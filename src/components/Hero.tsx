export const Hero: React.FC = () => {
  const openChat = () => {
    window.dispatchEvent(new CustomEvent('open-sentient-chat'));
  };

  const openContact = () => {
    window.dispatchEvent(new CustomEvent('open-contact-modal'));
  };

  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // For now, just trigger your existing Contact modal.
    openContact();
  };

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-16">
      <ParticleBackground />

      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 12-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16 items-center">
          {/* LEFT: original hero content */}
          <div className="lg:col-span-7 xl:col-span-8 text-center lg:text-left">
            <div className="animate-slide-up opacity-0 [animation-delay:200ms] inline-flex">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-brand-50 dark:bg-white/5 text-brand-700 dark:text-brand-300 mb-8 border border-brand-100 dark:border-white/10 backdrop-blur-sm">
                <span className="w-2 h-2 bg-brand-500 rounded-full mr-2 animate-pulse" />
                Accepting New Partners
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-slate-900 dark:text-white mb-8 animate-slide-up opacity-0 [animation-delay:400ms] leading-tight">
              We Build
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400">
                Sentient Systems
              </span>
              <br />
              That Never Sleep
            </h1>

            <p className="max-w-2xl mx-auto lg:mx-0 text-xl text-slate-600 dark:text-slate-300 mb-10 animate-slide-up opacity-0 [animation-delay:600ms] leading-relaxed">
              Transform your business with AI voice agents, intelligent chatbots,
              and automated revenue systems. No tech expertise required.
            </p>

            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 animate-slide-up opacity-0 [animation-delay:800ms]">
              <Button
                size="lg"
                onClick={() =>
                  document
                    .getElementById('pricing')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                View Plans &amp; Pricing
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={openChat}>
                <PlayCircle className="mr-2 h-5 w-5" />
                Try Interactive Demo
              </Button>
            </div>
          </div>

          {/* RIGHT: lightweight contact form */}
          <div className="lg:col-span-5 xl:col-span-4 w-full">
            <div className="animate-slide-up opacity-0 [animation-delay:900ms]">
              <div className="bg-white/80 dark:bg-slate-950/75 border border-slate-200/70 dark:border-white/10 rounded-2xl shadow-xl backdrop-blur-xl p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Get a Custom AI Blueprint
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                  Tell us who you are and what you’re trying to solve. We’ll follow up
                  with a tailored Sentient Partners plan.
                </p>

                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="hero-name"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
                    >
                      Name
                    </label>
                    <input
                      id="hero-name"
                      name="name"
                      type="text"
                      required
                      className="block w-full rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/70 focus:border-brand-500/70"
                      placeholder="Jane Doe"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="hero-email"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
                    >
                      Email
                    </label>
                    <input
                      id="hero-email"
                      name="email"
                      type="email"
                      required
                      className="block w-full rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/70 focus:border-brand-500/70"
                      placeholder="you@company.com"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="hero-message"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
                    >
                      What are you looking to automate?
                    </label>
                    <textarea
                      id="hero-message"
                      name="message"
                      rows={3}
                      className="block w-full rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/70 focus:border-brand-500/70 resize-none"
                      placeholder="Inbound calls, lead follow-up, missed web leads, etc."
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full mt-2"
                  >
                    Submit &amp; Connect
                  </Button>

                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                    No spam. We’ll review your note and respond with specific ideas for
                    your business.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-slate-400 dark:text-slate-600 z-20">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
};
