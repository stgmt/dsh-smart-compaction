import { REQUIRED_SUMMARY_SECTIONS } from "./types.js";
const SECTION_LIST = REQUIRED_SUMMARY_SECTIONS.map((name) => `## ${name}`).join("\n");
export const COMPACTION_INSTRUCTION = [
    "You are compacting an earlier span of a coding-agent session into a durable checkpoint.",
    "The previous checkpoint (if any) is established context. Merge it with the new chunk.",
    "Output ONLY the checkpoint, using exactly these Markdown headings, in this order:",
    "",
    SECTION_LIST,
    "",
    "Rules:",
    "- The checkpoint MUST be shorter than the input chunk.",
    "- Preserve exact file paths, UUIDs, issue/PR IDs, and commands. Do not paraphrase identifiers.",
    "- Do not invent task completion. Unresolved work stays in Open work.",
    "- Do not drop open items, constraints, or unanswered questions.",
    "- Do not emit a tool-call or a partial tool-call/result pair.",
    "- Do not mention this summarization request.",
    "- Write concise engineering prose. English headings, facts in the language of the source.",
].join("\n");
