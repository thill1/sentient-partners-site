import type { ComponentType } from "react";
import {
  CalendarDemo,
  ChatDemo,
  OperationsDemo,
  ReviewsDemo,
  SearchDemo,
  VoiceDemo,
  WebsiteDemo,
  WorkflowDemo,
} from "../capabilityDemos";

/** The interactive demo for each capability solution, by slug. */
export const SOLUTION_DEMOS: Record<string, ComponentType> = {
  search: SearchDemo,
  websites: WebsiteDemo,
  "ai-chatbots": ChatDemo,
  "voice-agents": VoiceDemo,
  scheduling: CalendarDemo,
  "business-apps": OperationsDemo,
  automation: WorkflowDemo,
  reviews: ReviewsDemo,
};
