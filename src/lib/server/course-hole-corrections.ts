type HoleLike = {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  yardage?: number | null;
};

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBrynMawrCourseName(courseName: string | null | undefined) {
  return normalizeText(courseName).includes("bryn mawr");
}

function looksLikeLegacyBrynMawrHoleSet(holes: HoleLike[]) {
  if (holes.length !== 18) {
    return false;
  }

  const byHole = new Map(holes.map((hole) => [hole.holeNumber, hole]));

  return (
    byHole.get(1)?.par === 5 &&
    byHole.get(1)?.strokeIndex === 15 &&
    byHole.get(4)?.par === 4 &&
    byHole.get(4)?.strokeIndex === 1 &&
    byHole.get(12)?.par === 4 &&
    byHole.get(12)?.strokeIndex === 4 &&
    byHole.get(13)?.par === 5 &&
    byHole.get(13)?.strokeIndex === 6 &&
    byHole.get(17)?.par === 4 &&
    byHole.get(17)?.strokeIndex === 2
  );
}

export function normalizeKnownCourseHoles<T extends HoleLike>(
  holes: T[],
  options?: { courseName?: string | null }
) {
  const sorted = holes.slice().sort((left, right) => left.holeNumber - right.holeNumber);
  const shouldCorrect = isBrynMawrCourseName(options?.courseName) || looksLikeLegacyBrynMawrHoleSet(sorted);

  if (!shouldCorrect) {
    return sorted;
  }

  return sorted.map((hole) => {
    if (hole.holeNumber === 12) {
      return {
        ...hole,
        strokeIndex: 6
      };
    }

    if (hole.holeNumber === 13) {
      return {
        ...hole,
        strokeIndex: 4
      };
    }

    return hole;
  });
}
