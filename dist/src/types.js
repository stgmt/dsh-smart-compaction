/** Plugin-owned types. Keep DSH imports out of the pure planners. */
export const CHECKPOINT_SCHEMA_VERSION = 1;
export const REQUIRED_SUMMARY_SECTIONS = [
    "Goal",
    "Constraints",
    "Confirmed facts",
    "Decisions",
    "Files and paths",
    "Commands and IDs",
    "Open work",
    "Agent/background state",
    "Evidence and unresolved uncertainty",
];
