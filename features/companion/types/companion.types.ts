
export const COMPANION_STATES = [
  "ambient",
  "listening",
  "thinking",
  "speaking",
  "working",
  "attention",
] as const;

export type CompanionState = (typeof COMPANION_STATES)[number];

export type CompanionEvent =
  | "START_LISTENING"
  | "STOP_LISTENING"
  | "REQUEST_RECEIVED"
  | "RESPONSE_STARTED"
  | "RESPONSE_FINISHED"
  | "START_WORKING"
  | "TASK_FINISHED"
  | "NEEDS_ATTENTION"
  | "DISMISS_ATTENTION"
  | "RESET";

export interface CompanionController {
  state: CompanionState;
  transitionTo: (event: CompanionEvent) => void;
  reset: () => void;
}
