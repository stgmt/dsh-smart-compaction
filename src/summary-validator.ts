import { SummaryValidationError } from "./errors.ts";
import { REQUIRED_SUMMARY_SECTIONS } from "./types.ts";

const HEADING = /^(?:#{1,3}\s*)?(.+?)\s*$/;

function headingKey(line: string): string {
  const trimmed = line.trim().replace(/[:*]+$/g, "");
  const match = HEADING.exec(trimmed);
  return (match?.[1] ?? trimmed).trim().toLowerCase();
}

export function validateSummary(summary: string, inputTokenCount: number, estimateTokens: (text: string) => number): void {
  const text = summary.trim();
  if (!text) throw new SummaryValidationError("summary is empty");
  const summaryTokens = estimateTokens(text);
  if (summaryTokens >= inputTokenCount) {
    throw new SummaryValidationError(
      `summary is not smaller than the input chunk (${summaryTokens} >= ${inputTokenCount})`,
    );
  }
  const present = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const key = headingKey(line);
    for (const section of REQUIRED_SUMMARY_SECTIONS) {
      if (key === section.toLowerCase()) present.add(section);
    }
  }
  const missing = REQUIRED_SUMMARY_SECTIONS.filter((section) => !present.has(section));
  if (missing.length > 0) {
    throw new SummaryValidationError(`summary missing required sections: ${missing.join(", ")}`);
  }
  if (/unfinished tool[_ -]?call|tool_call without (?:a )?result|orphaned tool/i.test(text)) {
    throw new SummaryValidationError("summary claims an unfinished tool-call");
  }
}
