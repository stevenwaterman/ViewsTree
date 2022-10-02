export function getPlacements(parentOffset: number, childLeafCounts: number[]): number[] {
  const startingPoints: number[] = childLeafCounts.reduce((acc, elem) => {
    const last = acc[acc.length - 1];
    const next = last + elem;
    return [...acc, next];
  }, [parentOffset]);

  const midPoints: number[] = [];
  for (let i = 0; i < startingPoints.length - 1; i++) {
    const a = startingPoints[i];
    const b = startingPoints[i + 1];
    const mid = (a+b)/2;
    midPoints.push(mid);
  }

  const size = startingPoints[startingPoints.length - 1];
  const adjustmentAmount = (size - parentOffset) / 2;
  const adjusted = midPoints.map(offset => offset - adjustmentAmount);

  return adjusted;
}