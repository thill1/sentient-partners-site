/**
 * Typed entry point for the shared solutions and navigation data.
 *
 * The data itself lives in `siteNav.data.mjs` (plain ESM, so Node build
 * scripts such as `insights/build.mjs` can import it directly). App code
 * imports from here.
 */
import { SOLUTIONS, SOLUTION_GROUPS } from "./siteNav.data.mjs";
import type { Solution, SolutionGroup } from "./siteNav.data.mjs";

export * from "./siteNav.data.mjs";
export type * from "./siteNav.data.mjs";

/** The solution with this slug, or undefined when there is none. */
export function findSolution(slug: string): Solution | undefined {
  return SOLUTIONS.find((solution) => solution.slug === slug);
}

/** The group a solution belongs to. */
export function groupOfSolution(solution: Solution): SolutionGroup {
  const group = SOLUTION_GROUPS.find((candidate) => candidate.id === solution.group);
  if (!group) {
    throw new Error(
      `siteNav: solution "${solution.slug}" has unknown group "${solution.group}". Add it to SOLUTION_GROUPS in siteNav.data.mjs.`,
    );
  }
  return group;
}

/** Other solutions in the same group, in menu order. */
export function relatedSolutions(solution: Solution): Solution[] {
  return SOLUTIONS.filter(
    (candidate) => candidate.group === solution.group && candidate.slug !== solution.slug,
  );
}

/** The solutions that have an interactive demo (the capabilities journey). */
export const CAPABILITY_SOLUTIONS: Solution[] = SOLUTIONS.filter(
  (solution) => solution.kind === "capability",
);
