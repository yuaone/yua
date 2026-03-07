// 🔒 SSOT: GLOBAL COMPUTE GATE

import { redisPub } from "../../db/redis";

export type ComputeTier = "FAST" | "NORMAL" | "DEEP";
export type PlanTier = "free" | "pro" | "business" | "enterprise";

interface GateTicket {
  threadId: number;
  traceId: string;
  userId: number;
  workspaceId: string;
  computeTier: ComputeTier;
  planTier: PlanTier;
}

const GLOBAL_CAPACITY_WEIGHT = 100;
const ENTERPRISE_RESERVED_WEIGHT = 40;
const SHARED_CAPACITY_WEIGHT = GLOBAL_CAPACITY_WEIGHT - ENTERPRISE_RESERVED_WEIGHT;

const PLAN_POLICY: Record<PlanTier, {
  maxUserConcurrency: number;
  maxWorkspaceConcurrency: number;
  allowDeep: boolean;
  priorityWeight: number;
}> = {
  free: { maxUserConcurrency: 1, maxWorkspaceConcurrency: 2, allowDeep: false, priorityWeight: 1 },
  pro: { maxUserConcurrency: 3, maxWorkspaceConcurrency: 6, allowDeep: true, priorityWeight: 2 },
  business: { maxUserConcurrency: 6, maxWorkspaceConcurrency: 20, allowDeep: true, priorityWeight: 3 },
  enterprise: { maxUserConcurrency: 12, maxWorkspaceConcurrency: 50, allowDeep: true, priorityWeight: 6 },
};

function computeWeight(computeTier: ComputeTier, planTier: PlanTier): number {
  const base = computeTier === "FAST" ? 1 : computeTier === "NORMAL" ? 3 : 6;
  const priority = PLAN_POLICY[planTier].priorityWeight;
  return Math.ceil(base / priority);
}

const ACQUIRE_LUA = `
-- KEYS:
-- 1: userKey
-- 2: workspaceKey
-- 3: threadKey
-- 4: sharedWeightKey
-- 5: reservedWeightKey
-- 6: leasesKey
-- ARGV:
-- 1: nowMs
-- 2: ttlMs
-- 3: userLimit
-- 4: workspaceLimit
-- 5: weight
-- 6: planTier
-- 7: traceId
-- 8: threadId
-- 9: userId
-- 10: workspaceId
-- 11: computeTier
-- 12: sharedCap
-- 13: reservedCap
-- 14: queueKey
-- 15: grantKey

local userKey = KEYS[1]
local workspaceKey = KEYS[2]
local threadKey = KEYS[3]
local sharedWeightKey = KEYS[4]
local reservedWeightKey = KEYS[5]
local leasesKey = KEYS[6]

local nowMs = tonumber(ARGV[1])
local ttlMs = tonumber(ARGV[2])
local userLimit = tonumber(ARGV[3])
local workspaceLimit = tonumber(ARGV[4])
local weight = tonumber(ARGV[5])
local planTier = ARGV[6]
local traceId = ARGV[7]
local threadId = ARGV[8]
local userId = ARGV[9]
local workspaceId = ARGV[10]
local computeTier = ARGV[11]
local sharedCap = tonumber(ARGV[12])
local reservedCap = tonumber(ARGV[13])
local queueKey = ARGV[14]
local grantKey = ARGV[15]

local activeTrace = redis.call("GET", threadKey)
if activeTrace and activeTrace ~= traceId then
  return {0, "THREAD_ACTIVE"}
end

local userCount = tonumber(redis.call("GET", userKey) or "0")
if userCount >= userLimit then
  return {0, "USER_LIMIT"}
end

local workspaceCount = tonumber(redis.call("GET", workspaceKey) or "0")
if workspaceCount >= workspaceLimit then
  return {0, "WORKSPACE_LIMIT"}
end

local poolUsed = "shared"
local sharedUsage = tonumber(redis.call("GET", sharedWeightKey) or "0")
local reservedUsage = tonumber(redis.call("GET", reservedWeightKey) or "0")

if planTier == "enterprise" then
  if reservedUsage + weight <= reservedCap then
    poolUsed = "reserved"
  else
    if sharedUsage + weight > sharedCap then
      return {0, "GLOBAL_LIMIT"}
    end
    poolUsed = "shared"
  end
else
  if sharedUsage + weight > sharedCap then
    return {0, "GLOBAL_LIMIT"}
  end
  poolUsed = "shared"
end

local expiresAt = nowMs + ttlMs
local member = traceId .. "|" .. threadId .. "|" .. userId .. "|" .. workspaceId .. "|" .. poolUsed .. "|" .. weight

redis.call("SET", threadKey, traceId, "PX", ttlMs)
redis.call("INCR", userKey)
redis.call("PEXPIRE", userKey, ttlMs)
redis.call("INCR", workspaceKey)
redis.call("PEXPIRE", workspaceKey, ttlMs)

if poolUsed == "reserved" then
  redis.call("INCRBY", reservedWeightKey, weight)
  redis.call("PEXPIRE", reservedWeightKey, ttlMs)
else
  redis.call("INCRBY", sharedWeightKey, weight)
  redis.call("PEXPIRE", sharedWeightKey, ttlMs)
end

redis.call("ZADD", leasesKey, expiresAt, member)

return {1, "OK", poolUsed}
`;

const RELEASE_LUA = `
-- KEYS:
-- 1: userKey
-- 2: workspaceKey
-- 3: threadKey
-- 4: sharedWeightKey
-- 5: reservedWeightKey
-- 6: leasesKey
-- ARGV:
-- 1: traceId
-- 2: threadId
-- 3: userId
-- 4: workspaceId
-- 5: poolUsed
-- 6: weight

local userKey = KEYS[1]
local workspaceKey = KEYS[2]
local threadKey = KEYS[3]
local sharedWeightKey = KEYS[4]
local reservedWeightKey = KEYS[5]
local leasesKey = KEYS[6]

local traceId = ARGV[1]
local threadId = ARGV[2]
local userId = ARGV[3]
local workspaceId = ARGV[4]
local poolUsed = ARGV[5]
local weight = tonumber(ARGV[6])

local member = traceId .. "|" .. threadId .. "|" .. userId .. "|" .. workspaceId .. "|" .. poolUsed .. "|" .. weight

local exists = redis.call("ZSCORE", leasesKey, member)
if not exists then
  return {0, "NO_LEASE"}
end

redis.call("ZREM", leasesKey, member)

if redis.call("EXISTS", threadKey) == 1 then
  redis.call("DEL", threadKey)
end

local userCount = tonumber(redis.call("GET", userKey) or "0")
if userCount > 0 then
  redis.call("DECR", userKey)
end

local wsCount = tonumber(redis.call("GET", workspaceKey) or "0")
if wsCount > 0 then
  redis.call("DECR", workspaceKey)
end

if poolUsed == "reserved" then
  local r = tonumber(redis.call("GET", reservedWeightKey) or "0")
  r = r - weight
  if r < 0 then r = 0 end
  redis.call("SET", reservedWeightKey, r)
else
  local s = tonumber(redis.call("GET", sharedWeightKey) or "0")
  s = s - weight
  if s < 0 then s = 0 end
  redis.call("SET", sharedWeightKey, s)
end

return {1, "OK"}
`;

const ACQUIRE_TTL_MS = 15000;
const GRANT_TTL_MS = 30;

function userKey(userId: number) {
  return `yua:compute:user:${userId}`;
}
function workspaceKey(workspaceId: string) {
  return `yua:compute:workspace:${workspaceId}`;
}
function threadKey(threadId: number) {
  return `yua:compute:thread:${threadId}`;
}

const sharedWeightKey = "yua:compute:pool:shared:weight";
const reservedWeightKey = "yua:compute:pool:reserved:weight";
const leasesKey = "yua:compute:leases";

function queueKey(workspaceId: string) {
  return `yua:compute:q:ws:${workspaceId}`;
}
function workspacesIndexKey() {
  return "yua:compute:q:workspaces";
}
function grantKey(traceId: string) {
  return `yua:compute:grant:${traceId}`;
}

async function ensureRedis() {
  if (redisPub.status !== "ready") {
    await redisPub.connect();
  }
}

function buildTicket(ticket: GateTicket) {
  const nowMs = Date.now();
  const policy = PLAN_POLICY[ticket.planTier];
  const weight = computeWeight(ticket.computeTier, ticket.planTier);
  const deadlineAtMs = nowMs + 15000;
  return {
    traceId: ticket.traceId,
    threadId: ticket.threadId,
    userId: ticket.userId,
    workspaceId: ticket.workspaceId,
    planTier: ticket.planTier,
    computeTier: ticket.computeTier,
    createdAtMs: nowMs,
    deadlineAtMs,
    weight,
    userLimit: policy.maxUserConcurrency,
    workspaceLimit: policy.maxWorkspaceConcurrency,
  };
}

export class ComputeGate {
  static async acquire(ticket: GateTicket): Promise<{
    allowed: boolean;
    downgradedTier?: ComputeTier;
    reason?: string;
  }> {
    await ensureRedis();
    const policy = PLAN_POLICY[ticket.planTier];

if (ticket.computeTier === "DEEP" && !policy.allowDeep) {
  // 🔒 FREE 플랜은 DEEP 요청 시 NORMAL로 자동 강등
  return {
    allowed: true,
    downgradedTier: "NORMAL",
  };
}

    const weight = computeWeight(ticket.computeTier, ticket.planTier);
    const nowMs = Date.now();
    const res = (await redisPub.eval(
      ACQUIRE_LUA,
      6,
      userKey(ticket.userId),
      workspaceKey(ticket.workspaceId),
      threadKey(ticket.threadId),
      sharedWeightKey,
      reservedWeightKey,
      leasesKey,
      nowMs,
      ACQUIRE_TTL_MS,
      policy.maxUserConcurrency,
      policy.maxWorkspaceConcurrency,
      weight,
      ticket.planTier,
      ticket.traceId,
      String(ticket.threadId),
      String(ticket.userId),
      ticket.workspaceId,
      ticket.computeTier,
      SHARED_CAPACITY_WEIGHT,
      ENTERPRISE_RESERVED_WEIGHT,
      queueKey(ticket.workspaceId),
      grantKey(ticket.traceId)
    )) as any[];

    if (Array.isArray(res) && res[1] === "OK") {
      return { allowed: true };
    }

    const reason = Array.isArray(res) ? res[1] : "GLOBAL_LIMIT";
    const queued = buildTicket(ticket);
    const qKey = queueKey(ticket.workspaceId);
    const wsKey = workspacesIndexKey();
    const member = JSON.stringify(queued);

    await redisPub.multi()
      .zadd(qKey, String(Date.now()), member)
      .zadd(wsKey, String(Date.now()), ticket.workspaceId)
      .exec();

    const gKey = grantKey(ticket.traceId);
    const brpop = await redisPub.brpop(gKey, 15);
    if (!brpop || brpop.length < 2) {
      return { allowed: false, reason: "QUEUE_TIMEOUT" };
    }

    return { allowed: true };
  }

  static async release(ticket: GateTicket & { poolUsed?: "reserved" | "shared"; weight?: number }) {
    await ensureRedis();
    const weight = ticket.weight ?? computeWeight(ticket.computeTier, ticket.planTier);
    const poolUsed = ticket.poolUsed ?? (ticket.planTier === "enterprise" ? "reserved" : "shared");
    await redisPub.eval(
      RELEASE_LUA,
      6,
      userKey(ticket.userId),
      workspaceKey(ticket.workspaceId),
      threadKey(ticket.threadId),
      sharedWeightKey,
      reservedWeightKey,
      leasesKey,
      ticket.traceId,
      String(ticket.threadId),
      String(ticket.userId),
      ticket.workspaceId,
      poolUsed,
      weight
    );

    const wsKey = workspacesIndexKey();
    const qKey = queueKey(ticket.workspaceId);
    const popped = await redisPub.zpopmin(qKey, 1);
    if (Array.isArray(popped) && popped.length >= 2) {
      const raw = popped[0];
      try {
        const payload = JSON.parse(raw as string);
        const grant = grantKey(payload.traceId);
        await redisPub.multi()
          .lpush(grant, "OK")
          .expire(grant, GRANT_TTL_MS)
          .exec();
      } catch {}
    }

    const nowMs = Date.now();
    await redisPub.zadd(wsKey, String(nowMs), ticket.workspaceId);

    console.log("[COMPUTE_GATE][RELEASE]", {
      threadId: ticket.threadId,
      userId: ticket.userId,
      workspaceId: ticket.workspaceId,
      planTier: ticket.planTier,
      computeTier: ticket.computeTier,
      weight,
      poolUsed,
    });
  }
}
