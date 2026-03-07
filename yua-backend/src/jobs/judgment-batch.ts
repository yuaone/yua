import { FederatedRuleAggregator } from "../ai/judgment/federated/federated-rule-aggregator";
import { JudgmentRolloutEngine } from "../ai/judgment/rollout/judgment-rollout-engine";

const aggregator = new FederatedRuleAggregator();
const rollout = new JudgmentRolloutEngine();

 // 15분 배치
 setInterval(async () => {
   await aggregator.aggregate(15);
   await rollout.deploy();
 }, 15 * 60 * 1000);
