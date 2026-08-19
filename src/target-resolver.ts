import { TargetResolutionError } from "./errors.ts";
import type { CompactionTarget } from "./types.ts";

export type RequestHeaderConfig = {
  provider?: string;
  model?: string;
  reasoningEffort?: string;
};

export type AgentOptions = {
  provider?: string;
  model?: string;
  reasoningEffort?: string;
};

function complete(config: RequestHeaderConfig | undefined): CompactionTarget | undefined {
  const provider = config?.provider?.trim();
  const model = config?.model?.trim();
  if (!provider || !model) return undefined;
  const reasoningEffort = config?.reasoningEffort?.trim();
  return reasoningEffort
    ? { provider, model, reasoningEffort }
    : { provider, model };
}

/**
 * Chat-selected target only. Never consults BasicCompactionConfig
 * summarizationProvider/summarizationModel — that pair is the stock
 * auxiliary-route hole this plugin exists to close.
 */
export function resolveTarget(input: {
  requestHeader?: RequestHeaderConfig;
  agentOptions?: AgentOptions;
}): CompactionTarget {
  const fromHeader = complete(input.requestHeader);
  if (fromHeader) return fromHeader;
  const fromAgent = complete(input.agentOptions);
  if (fromAgent) return fromAgent;
  throw new TargetResolutionError(
    "no provider/model available for summarization: route one chat request or set AgentOptions provider+model",
  );
}

export function targetsEqual(a: CompactionTarget, b: CompactionTarget): boolean {
  return (
    a.provider === b.provider &&
    a.model === b.model &&
    (a.reasoningEffort ?? "") === (b.reasoningEffort ?? "")
  );
}
