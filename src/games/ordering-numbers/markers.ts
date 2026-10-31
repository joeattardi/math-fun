/**
 * Rows for number line markers so labels never overlap: walk left to right and put each
 * marker in the lowest row whose last marker is at least `minGap` px away.
 */
export function markerRows(xs: readonly number[], minGap: number): number[] {
  const order = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  const lastX: number[] = [];
  const rows: number[] = Array(xs.length).fill(0);
  for (const { x, i } of order) {
    let row = lastX.findIndex((lx) => x - lx >= minGap);
    if (row < 0) row = lastX.length;
    lastX[row] = x;
    rows[i] = row;
  }
  return rows;
}
