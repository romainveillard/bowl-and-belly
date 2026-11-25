/**
 * The token behind each mark that carries a chart's figures. WCAG 1.4.11 asks
 * 3:1 of them against the card, which styles.test.ts checks.
 */
export const markTokens = {
  barOutline: "primary-strong",
  weightAverage: "primary-strong",
  runningTotal: "primary-strong",
} as const;

export const markColour = (mark: keyof typeof markTokens) => `var(--color-${markTokens[mark]})`;
