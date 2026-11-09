import { describe, expect, it } from "vitest";
import {
  initialReviewState,
  reviewTransition,
  type ReviewState,
} from "../src/review-state";

describe("commissioner review transitions", () => {
  it("requires review and fresh attestation before publication", () => {
    const publish = { type: "publish", persisted: true } as const;
    expect(reviewTransition(initialReviewState, publish)).toEqual(
      initialReviewState,
    );
    const review = reviewTransition(initialReviewState, { type: "review" });
    expect(reviewTransition(review, publish)).toEqual(review);
    const confirmed = reviewTransition(review, {
      type: "confirm",
      confirmed: true,
    });
    const editing = reviewTransition(confirmed, { type: "edit" });
    expect(reviewTransition(editing, { type: "review" })).toEqual(review);
    expect(reviewTransition(confirmed, publish)).toEqual({
      step: "done",
      persisted: true,
    });
  });

  it("keeps visit-only publication distinct until storage succeeds", () => {
    const confirmed: ReviewState = {
      step: "review",
      confirmed: true,
      error: "",
    };
    const visitOnly = reviewTransition(confirmed, {
      type: "publish",
      persisted: false,
    });
    expect(visitOnly).toEqual({ step: "done", persisted: false });
    expect(reviewTransition(visitOnly, { type: "edit" })).toBe(visitOnly);
    expect(
      reviewTransition(visitOnly, { type: "publish", persisted: true }),
    ).toBe(visitOnly);
    expect(reviewTransition(visitOnly, { type: "persist" })).toEqual({
      step: "done",
      persisted: true,
    });
    expect(reviewTransition(initialReviewState, { type: "persist" })).toBe(
      initialReviewState,
    );
  });

  it("clears stale feedback on edit or attestation without losing the phase", () => {
    const retained = reviewTransition(initialReviewState, { type: "retain" });
    expect(retained).toEqual({ step: "edit", saved: true, error: "" });
    expect(reviewTransition(retained, { type: "edit" })).toEqual(
      initialReviewState,
    );
    const invalid = reviewTransition(
      { step: "review", confirmed: false, error: "" },
      { type: "error", message: "Confirm evidence" },
    );
    expect(
      reviewTransition(invalid, { type: "confirm", confirmed: true }),
    ).toEqual({ step: "review", confirmed: true, error: "" });
  });
});
