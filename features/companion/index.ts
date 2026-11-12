
export {
  COMPANION_STATES,
  type CompanionState,
  type CompanionEvent,
  type CompanionController,
} from "./types/companion.types";

export {
  INITIAL_COMPANION_STATE,
  transitionCompanionState,
} from "./types/companion.transitions";

export { useCompanionController } from "./hooks/useCompanionController";
