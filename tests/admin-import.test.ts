import { describe, expect, it } from "vitest";
import { BULK_ROSTER_TEMPLATE, parseBulkRosterCsv } from "@/lib/server/admin-import";

describe("bulk roster import parsing", () => {
  it("parses a valid two-team roster template", () => {
    const rows = parseBulkRosterCsv(BULK_ROSTER_TEMPLATE);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      teamName: "Cedar & Co",
      seedNumber: 1,
      podName: "Pod A",
      podSlot: 1,
      player1Email: "jason@example.com",
      player2Email: "sam@example.com"
    });
    expect(rows[1]?.player1Ghin).toBeNull();
    expect(rows[1]?.player2Ghin).toBeNull();
  });

  it("rejects duplicate player emails in the same bulk import", () => {
    const csv = [
      "teamName,seedNumber,podName,podSlot,player1FirstName,player1LastName,player1Email,player1Ghin,player1HandicapIndex,player2FirstName,player2LastName,player2Email,player2Ghin,player2HandicapIndex",
      "Team One,1,Pod A,1,Jane,Doe,jane@example.com,100001,7.4,Sam,Smith,sam@example.com,100002,9.1",
      "Team Two,2,Pod A,2,Ty,Blue,jane@example.com,100003,4.8,Alex,Green,alex@example.com,100004,10.3"
    ].join("\n");

    expect(() => parseBulkRosterCsv(csv)).toThrow(/same player email more than once/i);
  });
});
