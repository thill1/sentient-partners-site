import { useEffect, useRef } from 'react';
import spMonogramWhite from '../assets/sp-monogram-white.png';
import './concierge.css';

export function ConciergeLauncher({ onClick, floating = false }: { onClick: () => void; floating?: boolean }) {
  const button = useRef<HTMLButtonElement>(null);
  const seal = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = seal.current;
    const trigger = button.current;
    if (!element || !trigger) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let introduced = false;
    let timer = 0;
    let motion: Animation | undefined;
    const stop = () => { clearTimeout(timer); motion?.cancel(); };
    const remind = () => {
      if (!trigger.matches(':hover, :focus-within') && !document.querySelector('[aria-modal="true"]')) {
        motion = element.animate([
          { transform: 'perspective(260px) rotateY(0deg)' },
          { transform: 'perspective(260px) rotateY(-24deg)', offset: 0.35 },
          { transform: 'perspective(260px) rotateY(14deg)', offset: 0.7 },
          { transform: 'perspective(260px) rotateY(0deg)' },
        ], { duration: 1400, easing: 'ease-in-out' });
      }
      timer = window.setTimeout(remind, 28000);
    };
    const update = () => {
      stop();
      if (!visible || document.hidden || reduced.matches) return;
      if (!introduced) {
        introduced = true;
        motion = element.animate([
          { transform: 'perspective(260px) rotateY(0deg)' },
          { transform: 'perspective(260px) rotateY(360deg)' },
        ], { delay: 700, duration: 1600, easing: 'cubic-bezier(.22,.61,.36,1)' });
      }
      timer = window.setTimeout(remind, 28000);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.8;
      update();
    }, { threshold: 0.8 });
    observer.observe(trigger);
    reduced.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    trigger.addEventListener('pointerdown', stop);
    return () => {
      stop();
      observer.disconnect();
      reduced.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      trigger.removeEventListener('pointerdown', stop);
    };
  }, []);
  return <button ref={button} type="button" className={`concierge-launch${floating ? ' concierge-launch-floating' : ''}`} onClick={onClick} aria-label="Ask Sentient, chat or voice" aria-haspopup="dialog">
    <span className="concierge-label">Ask Sentient<small>Chat or voice</small></span>
    <span ref={seal} className="concierge-mark" aria-hidden="true"><img src={spMonogramWhite} alt="" /></span>
  </button>;
}
