export declare class SmartCompactionError extends Error {
    readonly code: string;
    constructor(code: string, message: string, options?: ErrorOptions);
}
export declare class TargetResolutionError extends SmartCompactionError {
    constructor(message: string, options?: ErrorOptions);
}
export declare class EmptySummaryError extends SmartCompactionError {
    constructor(message?: string);
}
export declare class SummaryValidationError extends SmartCompactionError {
    constructor(message: string);
}
export declare class OverflowSplitError extends SmartCompactionError {
    constructor(message: string);
}
export declare function errorCode(error: unknown): string | undefined;
export declare function isContextOverflow(error: unknown): boolean;
