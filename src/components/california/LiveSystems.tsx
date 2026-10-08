import React, { useEffect, useState } from 'react';
import { CA_LIVE_SYSTEMS } from '../../content/californiaContent';
import { VOICE_HINT_EVENT, openSentientChat, scrollToSection } from '../../lib/siteActions';
import { Reveal } from './primitives';

/**
 * Early credibility that needs no testimonial: the systems on this page are
 * real and usable. Each row points at one.
 */
export const LiveSystems: React.FC = () => {
  // Voice navigation only exists where the browser can listen; say so where it can't.
  const [voiceReady, setVoiceReady] = useState(true);
  useEffect(() => {
    setVoiceReady(!!document.querySelector('[data-voice-launcher]'));
  }, []);

  const act = (target: string | null) => {
    if (target === 'concierge') {
      openSentientChat({ source: 'California · Live systems', ctaLabel: 'Talk to it' });
    } else if (target === 'voice') {
      window.dispatchEvent(new CustomEvent(VOICE_HINT_EVENT));
    } else if (target) {
      scrollToSection(target);
    }
  };

  return (
    <section id="work" aria-labelledby="ca-work-heading" className="bg-ca-ivory text-ca-navy">
      <div className="mx-auto grid max-w-[1400px] gap-14 ca-section px-5 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:px-12">
        <Reveal className="lg:col-span-5">
          <h2
            id="ca-work-heading"
            className="ca-h2"
          >
            {CA_LIVE_SYSTEMS.heading}
          </h2>
          <p className="mt-7 max-w-[30rem] ca-lede text-ca-navy/70">
            {CA_LIVE_SYSTEMS.body}
          </p>
          <div className="mt-12 border-t border-ca-navy/10 pt-6">
            <p className="ca-body text-ca-navy/75">
              <span className="text-ca-granite">{CA_LIVE_SYSTEMS.industriesLabel}</span> {CA_LIVE_SYSTEMS.industries}
            </p>
          </div>
        </Reveal>

        <ol className="border-t border-ca-navy lg:col-span-6 lg:col-start-7">
          {CA_LIVE_SYSTEMS.systems.map((system, i) => (
            <Reveal as="li" key={system.id} delay={i * 90} className="border-b border-ca-navy/12">
              <div className="grid gap-3 py-7 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-8 sm:py-8">
                <div>
                  <p className="flex items-center gap-3">
                    <span className="font-display text-[24px] leading-tight sm:text-[26px]">{system.name}</span>
                    <span className="text-[13px] font-medium text-ca-rust">Live</span>
                  </p>
                  <p className="mt-2 max-w-[34rem] ca-body text-ca-navy/65">{system.detail}</p>
                </div>
                {system.target === 'voice' && !voiceReady ? (
                  <span className="self-center text-[13px] text-ca-granite sm:justify-self-end">{CA_LIVE_SYSTEMS.voiceUnavailable}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => act(system.target)}
                    className="group inline-flex min-h-[44px] items-center gap-2 self-center justify-self-start rounded-sm border-b border-ca-navy/30 text-[14px] font-medium hover:border-ca-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-ca-orange sm:justify-self-end"
                  >
                    {system.action}
                    <span
                      aria-hidden="true"
                      className={`transition-transform motion-reduce:transition-none ${
                        system.target === 'voice' ? 'group-hover:-translate-x-0.5 group-hover:translate-y-0.5' : 'group-hover:translate-x-1'
                      }`}
                    >
                      {system.target === 'voice' ? '↙' : '→'}
                    </span>
                  </button>
                )}
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
};
