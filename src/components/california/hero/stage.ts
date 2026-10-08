import type { RefObject } from 'react';
import type { Tally } from './signalLayer';

/** What the hero's controls need from whichever background is running. */
export interface HeroStage {
  setTarget(order: 0 | 1, immediate?: boolean): void;
  setPaused(paused: boolean): void;
}

export interface StageProps {
  reduced: boolean;
  /** The headline block, so a stage can keep that area calm. */
  copyRef: RefObject<HTMLDivElement>;
  onReady: (stage: HeroStage) => void;
  /** Eased order, 0 to 1, after each frame. */
  onFrame: (order: number) => void;
  /** The stage can't run here; the hero falls back. */
  onFail?: () => void;
  /** Messages answered (or left waiting) in the scene, for stages that count them. */
  onTally?: (tally: Tally) => void;
  /** The stage lets the visitor place a call by clicking the city (told once, when it can). */
  onCanSend?: () => void;
  /** The visitor placed a call. */
  onSend?: () => void;
}
