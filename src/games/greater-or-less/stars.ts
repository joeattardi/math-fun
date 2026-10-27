/** 1 to 3 stars from first-try correct rounds. Always at least one star. */
export function starsFor(firstTryCorrect: number, rounds: number): 1 | 2 | 3 {
  const ratio = rounds > 0 ? firstTryCorrect / rounds : 0;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.6) return 2;
  return 1;
}
