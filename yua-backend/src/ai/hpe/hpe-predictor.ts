import { buildCausalLinks } from "./hpe-utils";

export function runPredictiveCausality(consensus: any) {
  const causeGraph = buildCausalLinks(consensus.majority);

  return {
    causeGraph,
    forecast: `Based on consensus, the likely future scenario centers around: ${consensus.majority}`
  };
}
