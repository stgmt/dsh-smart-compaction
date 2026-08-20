export declare const STOCK_ENGINE = "@deepseek-ai/dsh-compaction-basic";
export declare const OURS_ENGINE = "dsh-smart-compaction";
export declare const COMPOSITION_FILE = "agent.cordis.yml";
export declare const LEFTOVER_PRESET_ID = "smart";
export declare const LEFTOVER_PRESET_NAME = "Smart compaction";
export declare const LEFTOVER_PRESET_DESC = "hierarchical chat-model compaction";
export type PatchStatus = "patched" | "already" | "skip" | "fail";
export declare function dshHome(env?: NodeJS.ProcessEnv): string;
export declare function rewriteComposition(text: string): {
    next: string;
    changed: boolean;
};
export declare function compositionHasOurs(text: string): boolean;
export declare function compositionHasStock(text: string): boolean;
export declare function patchCompositionFile(path: string): PatchStatus;
export declare function findShippedPresetRoots(env?: NodeJS.ProcessEnv): string[];
export declare function collectCompositionFiles(env?: NodeJS.ProcessEnv): string[];
export declare function patchCompositionFiles(files: readonly string[]): {
    patched: number;
    already: number;
    skipped: number;
    failed: number;
};
export declare function patchKnownPresetFiles(env?: NodeJS.ProcessEnv): {
    patched: number;
    already: number;
    skipped: number;
    failed: number;
};
export declare function isLeftoverSmartPresetDir(dir: string): boolean;
export declare function removeLeftoverSmartPreset(env?: NodeJS.ProcessEnv): boolean;
export declare function writeHomeDisablePatch(env?: NodeJS.ProcessEnv): void;
