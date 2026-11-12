"use client";

import { useCallback, useReducer } from "react";

import type {
  CompanionController,
  CompanionEvent,
} from "../types/companion.types";

import {
  INITIAL_COMPANION_STATE,
  transitionCompanionState,
} from "../types/companion.transitions";

function companionReducer(
  state: CompanionController["state"],
  event: CompanionEvent,
): CompanionController["state"] {
  return transitionCompanionState(state, event).currentState;
}

export function useCompanionController(): CompanionController {
  const [state, dispatch] = useReducer(
    companionReducer,
    INITIAL_COMPANION_STATE,
  );

  const transitionTo = useCallback((event: CompanionEvent) => {
    dispatch(event);
  }, []);

  const reset = useCallback(() => {
    dispatch("RESET");
  }, []);

  return {
    state,
    transitionTo,
    reset,
  };
}