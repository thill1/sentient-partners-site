import { ArrowRight } from "lucide-react";

export interface SolutionCardProps {
  href: string;
  /** Small label above the title, e.g. the group or "In pilot". */
  eyebrow: string;
  title: string;
  copy: string;
}

/** One linked card: a solution (or Relay) with its one-line summary. */
export default function SolutionCard({ href, eyebrow, title, copy }: SolutionCardProps) {
  return (
    <a className="tool-card solution-card" href={href}>
      <span className="tool-eyebrow">{eyebrow}</span>
      <strong>{title}</strong>
      <span className="tool-copy">{copy}</span>
      <span className="tool-go">
        Learn more <ArrowRight size={15} aria-hidden="true" />
      </span>
    </a>
  );
}
