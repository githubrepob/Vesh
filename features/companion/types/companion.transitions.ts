
import type {
  CompanionEvent,
  CompanionState,
} from "./companion.types";

export const INITIAL_COMPANION_STATE: CompanionState = "ambient";

const TRANSITIONS: Record<
  CompanionState,
  Partial<Record<CompanionEvent, CompanionState>>
> = {
  ambient: {
    START_LISTENING: "listening",
    START_WORKING: "working",
    NEEDS_ATTENTION: "attention",
  },

  listening: {
    STOP_LISTENING: "ambient",
    REQUEST_RECEIVED: "thinking",
    NEEDS_ATTENTION: "attention",
  },

  thinking: {
    RESPONSE_STARTED: "speaking",
    START_WORKING: "working",
    NEEDS_ATTENTION: "attention",
    RESET: "ambient",
  },

  speaking: {
    RESPONSE_FINISHED: "ambient",
    START_LISTENING: "listening",
    START_WORKING: "working",
    NEEDS_ATTENTION: "attention",
  },

  working: {
    TASK_FINISHED: "ambient",
    REQUEST_RECEIVED: "thinking",
    NEEDS_ATTENTION: "attention",
  },

  attention: {
    DISMISS_ATTENTION: "ambient",
    START_LISTENING: "listening",
  },
};

export interface TransitionResult {
  accepted: boolean;
  previousState: CompanionState;
  currentState: CompanionState;
}

export function transitionCompanionState(
  currentState: CompanionState,
  event: CompanionEvent,
): TransitionResult {
  if (event === "RESET") {
    return {
      accepted: true,
      previousState: currentState,
      currentState: INITIAL_COMPANION_STATE,
    };
  }

  const nextState = TRANSITIONS[currentState][event];

  if (!nextState) {
    return {
      accepted: false,
      previousState: currentState,
      currentState,
    };
  }

  return {
    accepted: true,
    previousState: currentState,
    currentState: nextState,
  };
}