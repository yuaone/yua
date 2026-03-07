
"use client";

import type { Project } from "@/store/useSidebarStore";

/**
 * SSOT Contract
 * - GET  /api/project  -> { ok: true, projects: Project[] }
 * - POST /api/project  -> { ok: true, project: { id, name } }
 * - 403 plan error     -> { ok: false, error: "PLAN_PROJECT_NOT_ALLOWED" | "PLAN_PROJECT_LIMIT_REACHED" }
 */

export type PlanErrorCode =
  | "PLAN_PROJECT_NOT_ALLOWED"
  | "PLAN_PROJECT_LIMIT_REACHED"
  | string;

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor(args: {
    message: string;
    status: number;
    code?: string;
    payload?: unknown;
  }) {
    super(args.message);
    this.name = "ApiError";
    this.status = args.status;
    this.code = args.code;
    this.payload = args.payload;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

const PLAN_ERROR_CODES = new Set([
  "PLAN_PROJECT_NOT_ALLOWED",
  "PLAN_PROJECT_LIMIT_REACHED",
]);

export function isPlanError(
  e: unknown
): e is ApiError & { code: PlanErrorCode } {
  return (
    isApiError(e) &&
    e.status === 403 &&
    typeof e.code === "string" &&
    PLAN_ERROR_CODES.has(e.code)
  );
}

async function readJsonSafe(res: Response): Promise<any | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

type AuthFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export async function listProjects(authFetch: AuthFetch): Promise<Project[]> {
  const res = await authFetch("/api/project");
  const data = await readJsonSafe(res);

  if (!res.ok) {
    throw new ApiError({
      message: data?.message ?? "프로젝트 로드 실패",
      status: res.status,
      code: data?.error,
      payload: data,
    });
  }

  if (!data?.ok) return [];
  const projects = Array.isArray(data.projects) ? data.projects : [];

  // 최소 정규화: id/name 안전 보장
  return projects
    .filter((p: any) => p && p.id != null)
    .map((p: any) => ({
      id: p.id,
      name: String(p.name ?? ""),
      role: p.role ? String(p.role) : undefined,
    }));
}

export async function createProject(
  authFetch: AuthFetch,
  name: string,
  options?: { useMemory?: boolean }
): Promise<{ id: string; name: string; useMemory?: boolean }> {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) {
    throw new ApiError({ message: "invalid_name", status: 400 });
  }

  const res = await authFetch("/api/project", {
    method: "POST",
    body: JSON.stringify({ name: trimmed, useMemory: options?.useMemory ?? false }),
  });

  const data = await readJsonSafe(res);

  if (!res.ok) {
    throw new ApiError({
      message: data?.message ?? "프로젝트 생성 실패",
      status: res.status,
      code: data?.error,
      payload: data,
    });
  }

  if (!data?.ok || !data?.project?.id) {
    throw new ApiError({ message: "프로젝트 생성 실패", status: 500, payload: data });
  }

  return {
    id: String(data.project.id),
    name: String(data.project.name ?? trimmed),
  };
}
