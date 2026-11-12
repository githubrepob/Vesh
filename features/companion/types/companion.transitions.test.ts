
import { describe, expect, it } from "vitest";

import {
  INITIAL_COMPANION_STATE,
  transitionCompanionState,
} from "./companion.transitions";

import type {
  CompanionEvent,
  CompanionState,
} from "./companion.types";

describe("Companion state machine", () => {
  it("starts in ambient state", () => {
    expect(INITIAL_COMPANION_STATE).toBe("ambient");
  });

  const validTransitions: Array<
    [CompanionState, CompanionEvent, CompanionState]
  > = [
    ["ambient", "START_LISTENING", "listening"],
    ["ambient", "START_WORKING", "working"],
    ["ambient", "NEEDS_ATTENTION", "attention"],
    ["listening", "STOP_LISTENING", "ambient"],
    ["listening", "REQUEST_RECEIVED", "thinking"],
    ["thinking", "RESPONSE_STARTED", "speaking"],
    ["thinking", "START_WORKING", "working"],
    ["speaking", "RESPONSE_FINISHED", "ambient"],
    ["speaking", "START_LISTENING", "listening"],
    ["working", "TASK_FINISHED", "ambient"],
    ["working", "REQUEST_RECEIVED", "thinking"],
    ["attention", "DISMISS_ATTENTION", "ambient"],
    ["attention", "START_LISTENING", "listening"],
  ];

  it.each(validTransitions)(
    "%s + %s should transition to %s",
    (currentState, event, expectedState) => {
      const result = transitionCompanionState(
        currentState,
        event,
      );

      expect(result.accepted).toBe(true);
      expect(result.previousState).toBe(currentState);
      expect(result.currentState).toBe(expectedState);
    },
  );

  it("rejects invalid transitions", () => {
    const result = transitionCompanionState(
      "ambient",
      "RESPONSE_STARTED",
    );

    expect(result.accepted).toBe(false);
    expect(result.currentState).toBe("ambient");
  });

  it("resets every state to ambient", () => {
    const states: CompanionState[] = [
      "ambient",
      "listening",
      "thinking",
      "speaking",
      "working",
      "attention",
    ];

    states.forEach((state) => {
      const result = transitionCompanionState(state, "RESET");

      expect(result.accepted).toBe(true);
      expect(result.currentState).toBe("ambient");
    });
  });
});
