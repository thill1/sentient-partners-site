import { RELAY, groupOfSolution, solutionPath } from "../../../content/siteNav";
import type { Solution } from "../../../content/siteNav";
import type { SolutionCardProps } from "./SolutionCard";

/** The card for a solution: its group as the eyebrow, linking to its page. */
export function solutionCard(solution: Solution): SolutionCardProps {
  return {
    href: solutionPath(solution.slug),
    eyebrow: groupOfSolution(solution).label,
    title: solution.title,
    copy: solution.summary,
  };
}

/** The card for Sentient Relay. Its eyebrow is always the "in pilot" status. */
export const RELAY_CARD: SolutionCardProps = {
  href: RELAY.path,
  eyebrow: RELAY.status,
  title: RELAY.name,
  copy: RELAY.summary,
};
