import { ArrowRight, Download } from "lucide-react";
import { CAPABILITIES_PDF, SOLUTIONS_HUB } from "../../../content/siteNav";

/**
 * The two ways onward from any solutions view: the capabilities overview
 * (PDF) and, unless we are already there, the solutions hub.
 */
export default function SolutionLinks({ showHubLink = true }: { showHubLink?: boolean }) {
  return (
    <p className="solution-links">
      <a className="text-link" href={CAPABILITIES_PDF.href}>
        <Download size={15} aria-hidden="true" /> {CAPABILITIES_PDF.downloadLabel}
      </a>
      {showHubLink && (
        <a className="text-link" href={SOLUTIONS_HUB.path}>
          {SOLUTIONS_HUB.allLabel} <ArrowRight size={15} aria-hidden="true" />
        </a>
      )}
    </p>
  );
}
