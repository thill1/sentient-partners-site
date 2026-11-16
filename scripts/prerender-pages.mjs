// Every page besides the homepage that scripts/prerender.mjs writes to dist/,
// with its <title> and meta description. Kept apart from the prerender itself
// so tests can check it against the navigation data and public/sitemap.xml.
import {
  FREE_TOOLS,
  RELAY,
  SOLUTIONS,
  SOLUTIONS_HUB,
  WEBSITE_CHECK_PATH,
  solutionPath,
} from "../src/content/siteNav.data.mjs";

const SUFFIX = " | Sentient Partners";
const websiteCheck = FREE_TOOLS.find((tool) => tool.href === WEBSITE_CHECK_PATH);
if (!websiteCheck) {
  throw new Error(
    `prerender-pages: no free tool has href ${WEBSITE_CHECK_PATH}. Check FREE_TOOLS in src/content/siteNav.data.mjs.`,
  );
}

/** @type {{ path: string, title: string, desc: string }[]} */
export const PRERENDER_PAGES = [
  {
    path: "/tools/",
    title: `Free tools for growing businesses${SUFFIX}`,
    desc: "Free tools from Sentient Partners: website check, missed-call calculator, AI readiness check, time-back estimator and reputation snapshot.",
  },
  {
    path: WEBSITE_CHECK_PATH,
    title: `${websiteCheck.title}${SUFFIX}`,
    desc: websiteCheck.copy,
  },
  {
    path: "/tools/missed-call-calculator/",
    title: `Missed-call calculator${SUFFIX}`,
    desc: "Estimate what unanswered calls may cost your business each month and year, using your own call volume, booking rate and average job value.",
  },
  {
    path: "/tools/ai-readiness/",
    title: `AI readiness check${SUFFIX}`,
    desc: "Nine quick questions on calls, booking, follow-up, invoicing and data. Get a score out of 100 and three practical next steps.",
  },
  {
    path: "/tools/time-back/",
    title: `Time-back estimator${SUFFIX}`,
    desc: "Estimate the hours a week and a year you could get back from scheduling, invoicing, follow-ups and retyping, using your own numbers.",
  },
  {
    path: "/tools/reputation/",
    title: `Reputation snapshot${SUFFIX}`,
    desc: "A quick self-check of your rating, review count, recency and replies. Get a score out of 100 and three practical next steps.",
  },
  {
    path: SOLUTIONS_HUB.path,
    title: `${SOLUTIONS_HUB.label}${SUFFIX}`,
    desc: SOLUTIONS_HUB.lede,
  },
  ...SOLUTIONS.map((solution) => ({
    path: solutionPath(solution.slug),
    title: `${solution.title}${SUFFIX}`,
    desc: solution.summary,
  })),
  {
    path: RELAY.path,
    title: `${RELAY.name} (in pilot)${SUFFIX}`,
    desc: RELAY.summary,
  },
];
