// Deliberately accepts only a single complete gross-score row, never OCR text.
export function parseScoreRow(text: string): number[] {
  const cells = text
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean);
  if (cells.length !== 18)
    throw new Error(
      `Enter exactly 18 scores, without totals. Found ${cells.length}.`,
    );
  if (
    cells.some(
      (cell) =>
        !/^\d{1,2}$/.test(cell) || Number(cell) < 1 || Number(cell) > 20,
    )
  )
    throw new Error(
      "Use whole-number gross scores from 1 to 20. Replace blanks, labels and decimals.",
    );
  return cells.map(Number);
}
