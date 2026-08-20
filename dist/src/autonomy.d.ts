import type { Context } from "@deepseek-ai/cordis";
export declare const name = "dsh-smart-compaction-autonomy";
export type AutonomyOptions = {
    watch?: boolean;
    boot?: boolean;
};
/**
 * Host-plane overlay. Never adds a roster preset. Rewrites every composition
 * that still mounts stock compaction-basic, including presets created later.
 */
export declare function apply(ctx: Context, options?: AutonomyOptions): void;
