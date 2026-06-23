import { db } from "@/lib/server/db";
import {
  computeOfficialResultSnapshotForMatch,
  OFFICIAL_RESULT_SNAPSHOT_VERSION,
  officialResultSnapshotToJson
} from "@/lib/server/official-result-snapshot";

async function main() {
  const refreshExisting = process.argv.includes("--refresh");
  const matches = await db.match.findMany({
    where: {
      status: {
        in: ["FINAL", "FORFEIT"]
      },
      ...(refreshExisting
        ? {}
        : {
            officialResultSnapshotVersion: null
          })
    },
    include: {
      tournament: {
        select: {
          forfeitPointsAwarded: true,
          forfeitHolesWonAwarded: true
        }
      },
      playerSelections: {
        include: {
          player: true,
          tee: {
            include: {
              holes: {
                orderBy: {
                  holeNumber: "asc"
                }
              }
            }
          }
        }
      },
      holeScores: {
        orderBy: [{ holeNumber: "asc" }, { playerId: "asc" }]
      }
    }
  });

  let updated = 0;
  let skipped = 0;

  for (const match of matches) {
    const snapshot = computeOfficialResultSnapshotForMatch(match);

    if (!snapshot) {
      skipped += 1;
      console.warn(`Skipped ${match.id}: could not compute official result snapshot.`);
      continue;
    }

    await db.match.update({
      where: {
        id: match.id
      },
      data: {
        officialResultSnapshot: officialResultSnapshotToJson(snapshot),
        officialResultSnapshotVersion: OFFICIAL_RESULT_SNAPSHOT_VERSION,
        officialResultSnapshotAt: new Date(snapshot.generatedAt)
      }
    });
    updated += 1;
  }

  console.log(`Official result snapshot backfill complete. Updated ${updated}, skipped ${skipped}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
