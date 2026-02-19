export function metaCritique(improvements: string[]): string[] {
  if (!improvements.length) {
    return ["No changes proposed; increase stress-test intensity."];
  }

  return ["Current lab run detected actionable improvements."];
}
