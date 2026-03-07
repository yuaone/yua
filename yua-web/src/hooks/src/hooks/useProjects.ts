"use client";

import { useCallback } from "react";
import { useSafePush } from "@/lib/router/safePush";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarStore } from "@/store/useSidebarStore";
import { createProject, isPlanError, listProjects } from "@/lib/api/project";

export function useProjects() {
  const push = useSafePush();
  const { authFetch, status } = useAuth();

  const {
    setProjects,
    setLoadingProjects,
    setActiveProject,
  } = useSidebarStore();

  const loadProjects = useCallback(async () => {
    if (status !== "authed") return;
    if (!authFetch) return;

    setLoadingProjects(true);
    try {
      const projects = await listProjects(authFetch);
      setProjects(projects);
    } catch (e) {
      console.error("[PROJECTS][LOAD][ERROR]", e);
    } finally {
      setLoadingProjects(false);
    }
  }, [status, authFetch, setProjects, setLoadingProjects]);

  /**
   * create + plan UX (SSOT)
   * - 403 + PLAN_ERROR -> /upgrade
   * - success -> store 반영 + /project/:id 이동
   */
  const createNewProject = useCallback(
    async (name: string) => {
      if (status !== "authed") return null;
      if (!authFetch) return null;

      try {
        const p = await createProject(authFetch, name);

        // ✅ authoritative reload (서버가 role/createdAt 같이 줄 수 있으니)
        await loadProjects();

        // ✅ store active + route
        setActiveProject(p.id);
        push(`/project/${p.id}`);

        return p;
      } catch (e) {
 if (isPlanError(e)) {
  console.warn("[PROJECT][LIMIT]", e.code);
  return null;
 }

        console.error("[PROJECTS][CREATE][ERROR]", e);
        return null;
      }
    },
    [status, authFetch, loadProjects, setActiveProject, push]
  );

  return {
    loadProjects,
    createNewProject,
  };
}
