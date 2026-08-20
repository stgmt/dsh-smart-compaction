/** Safety margin so a chunk + previous summary + instruction cannot kiss the window. */
export const SAFETY_RATIO = 0.12;
/** When the adapter does not report capacity, refuse to gamble a huge request. */
export const CONSERVATIVE_WINDOW = 32_768;
export const INSTRUCTION_RESERVE_TOKENS = 1_200;
export function heuristicTokenCount(message) {
    let chars = 0;
    const walk = (blocks) => {
        for (const block of blocks) {
            if (typeof block.text === "string")
                chars += block.text.length;
            if (typeof block.arguments === "string")
                chars += block.arguments.length;
            if (typeof block.name === "string")
                chars += block.name.length;
            if (Array.isArray(block.content))
                walk(block.content);
        }
    };
    walk(message.content);
    return Math.max(1, Math.ceil(chars / 4) + 8);
}
export function resolveBudget(input) {
    const conservative = !(typeof input.contextWindow === "number" && input.contextWindow > 0);
    const contextWindow = conservative ? CONSERVATIVE_WINDOW : input.contextWindow;
    const systemTokens = Math.ceil((input.system?.length ?? 0) / 4);
    const toolTokens = Math.ceil((input.toolsJsonChars ?? 0) / 4);
    const safety = Math.floor(contextWindow * SAFETY_RATIO);
    const maxInputTokens = Math.max(1024, contextWindow - systemTokens - toolTokens - INSTRUCTION_RESERVE_TOKENS - safety);
    return { contextWindow, maxInputTokens, conservative };
}
export function tokensOf(messages, estimate) {
    return messages.reduce((sum, message) => sum + estimate(message), 0);
}
