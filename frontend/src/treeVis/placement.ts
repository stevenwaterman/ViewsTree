export function getPlacements(childLeafCounts: number[]): number[] {
  const startingPoints: number[] = childLeafCounts.reduce((acc, elem) => {
    const last = acc[acc.length - 1];
    const next = last + elem;
    return [...acc, next];
  }, [0]);

  const midPoints: number[] = [];
  for (let i = 0; i < startingPoints.length - 1; i++) {
    const a = startingPoints[i];
    const b = startingPoints[i + 1];
    const mid = (a+b)/2;
    midPoints.push(mid);
  }

  const size = startingPoints[startingPoints.length - 1];
  const adjustmentAmount = (size - 0) / 2;
  const adjusted = midPoints.map(offset => offset - adjustmentAmount);

  return adjusted;
}

export const nodeHeight = 64;
export const nodeWidth = 64;
const nodeMarginHeight = 96;
const nodeMarginWidth = 16;
export const placementHeight = nodeHeight + nodeMarginHeight;
export const placementWidth = nodeWidth + nodeMarginWidth;
export const placementTransitionMs = 400;