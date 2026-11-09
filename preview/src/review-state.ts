export type ReviewState =
  | { step: "edit"; saved: boolean; error: string }
  | { step: "review"; confirmed: boolean; error: string }
  | { step: "done"; persisted: boolean };

export type ReviewEvent =
  | { type: "edit" }
  | { type: "retain" }
  | { type: "review" }
  | { type: "confirm"; confirmed: boolean }
  | { type: "error"; message: string }
  | { type: "publish"; persisted: boolean }
  | { type: "persist" };

export const initialReviewState: ReviewState = {
  step: "edit",
  saved: false,
  error: "",
};

// Callers validate and perform storage before dispatching successful transitions.
export function reviewTransition(
  state: ReviewState,
  event: ReviewEvent,
): ReviewState {
  switch (event.type) {
    case "edit":
      return state.step === "done" ? state : initialReviewState;
    case "retain":
      return state.step === "edit" ? { ...state, saved: true } : state;
    case "review":
      return state.step === "edit"
        ? { step: "review", confirmed: false, error: "" }
        : state;
    case "confirm":
      return state.step === "review"
        ? { ...state, confirmed: event.confirmed, error: "" }
        : state;
    case "error":
      return state.step === "done" ? state : { ...state, error: event.message };
    case "publish":
      return state.step === "review" && state.confirmed
        ? { step: "done", persisted: event.persisted }
        : state;
    case "persist":
      return state.step === "done" ? { step: "done", persisted: true } : state;
  }
}
