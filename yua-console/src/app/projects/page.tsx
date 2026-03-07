"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import ProjectList from "./ProjectList";
import CreateProjectModal from "./CreateProjectModal";

type Project = any; // 기존 유지 (추후 정제 가능)

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  async function loadProjects() {
    try {
      setLoading(true);

      const res = await apiRequest<{
        projects: Project[];
      }>("/api/projects/list");

      // ✅ 타입 가드 (핵심)
      if (!res.ok || !res.data) {
        throw new Error("load projects failed");
      }

      setProjects(res.data.projects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div className="px-10 pt-10">
      <div className="flex justify-between mb-8">
        <h1 className="text-2xl font-semibold text-black">
          Projects
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-black text-white rounded-lg hover:opacity-80"
        >
          + New Project
        </button>
      </div>

      {loading ? (
        <p className="text-black/60">Loading...</p>
      ) : (
        <ProjectList
          projects={projects}
          refresh={loadProjects}
        />
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={loadProjects}
        />
      )}
    </div>
  );
}
