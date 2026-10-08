import { HOME_CTA } from '../../content/homeContent';
import { openBookingModal, scrollToSection } from '../../lib/siteActions';

/** Every booking button on the homepage opens the same calendar. */
export function bookIntroduction(source: string) {
  openBookingModal({ source: `Homepage · ${source}`, ctaLabel: HOME_CTA.book });
}

/** In-page links keep their href for the status bar but never change the route hash. */
export function goToSection(event: { preventDefault: () => void }, id: string) {
  event.preventDefault();
  scrollToSection(id);
}
