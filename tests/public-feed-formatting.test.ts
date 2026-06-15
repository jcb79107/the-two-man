import { describe, expect, it } from "vitest";
import { formatCompletedMatchFeedTitle } from "@/lib/server/public-feed-formatting";

describe("public feed formatting", () => {
  it("formats tied completed matches without a defeated label", () => {
    expect(
      formatCompletedMatchFeedTitle({
        primaryTeamName: "Malkin & Jolcolver",
        secondaryTeamName: "Daitch & Reimer",
        scoreLine: "9-9",
        isTie: true
      })
    ).toBe("Malkin & Jolcolver tied Daitch & Reimer 9-9");
  });

  it("formats won completed matches with the defeated label", () => {
    expect(
      formatCompletedMatchFeedTitle({
        primaryTeamName: "Holway & Chase",
        secondaryTeamName: "Loewenstein & Loewenstein",
        scoreLine: "11-7",
        isTie: false
      })
    ).toBe("Holway & Chase def. Loewenstein & Loewenstein 11-7");
  });
});
