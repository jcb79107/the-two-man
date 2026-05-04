import { describe, expect, it } from "vitest";
import {
  parseMatchForm,
  parsePodAssignmentForm,
  parseTeamForm,
  parseTeamSeedUpdateForm
} from "@/lib/server/admin-validation";

function buildFormData(entries: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
}

describe("admin validation safeguards", () => {
  it("rejects teams that reuse the same player twice", () => {
    const formData = buildFormData({
      name: "Two Putts",
      seedNumber: "4",
      playerOneId: "player-1",
      playerTwoId: "player-1"
    });

    expect(() => parseTeamForm(formData)).toThrow(/two different players/i);
  });

  it("requires a pod assignment for pod-play matches", () => {
    const formData = buildFormData({
      roundLabel: "Pod A Match 1",
      stage: "POD_PLAY",
      scheduledAt: "2026-04-30T09:00",
      homeTeamId: "team-1",
      awayTeamId: "team-2"
    });

    expect(() => parseMatchForm(formData)).toThrow(/pod assignment/i);
  });

  it("rejects manual matches that reuse the same team on both sides", () => {
    const formData = buildFormData({
      roundLabel: "Quarterfinal 1",
      stage: "QUARTERFINAL",
      scheduledAt: "2026-04-30T13:00",
      homeTeamId: "team-1",
      awayTeamId: "team-1"
    });

    expect(() => parseMatchForm(formData)).toThrow(/must be different/i);
  });

  it("normalizes a blank seed override back to null", () => {
    const formData = buildFormData({
      teamId: "team-7",
      seedNumber: ""
    });

    expect(parseTeamSeedUpdateForm(formData)).toEqual({
      teamId: "team-7",
      seedNumber: null
    });
  });

  it("caps pod assignments to the three valid slots", () => {
    const formData = buildFormData({
      teamId: "team-1",
      podId: "pod-a",
      slotNumber: "4"
    });

    expect(() => parsePodAssignmentForm(formData)).toThrow();
  });
});
