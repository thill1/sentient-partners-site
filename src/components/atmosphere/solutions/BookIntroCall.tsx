import { ArrowRight } from "lucide-react";
import { BOOKING_URL } from "../../../content/siteNav";
import { bookIntroCall } from "../bookIntroCall";

/** The primary call to action on every solutions page: the 20-minute intro call. */
export default function BookIntroCall({ source }: { source: string }) {
  return (
    <a
      className="cta-primary"
      href={BOOKING_URL}
      onClick={(event) => {
        event.preventDefault();
        bookIntroCall(source);
      }}
    >
      Book a 20-minute intro call <ArrowRight size={16} aria-hidden="true" />
    </a>
  );
}
