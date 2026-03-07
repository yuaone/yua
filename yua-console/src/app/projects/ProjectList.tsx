"use client";

import { apiRequest } from "@/lib/api";

export default function ProjectList({
  projects,
  refresh,
}: {
  projects: any[];
  refresh: () => void;
}) {
  async function deleteProject(id: number) {
    if (!confirm("Delete this project?")) return;
    await apiRequest("/api/projects/delete", {
      method: "POST",
      body: JSON.stringify({ projectId: id }),
    });
    refresh();
  }

  if (!projects.length) {
    return <p className="text-black/60">No projects yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {projects.map((p) => (
        <div
          key={p.id}
          className="
            bg-white/60 backdrop-blur-xl border border-black/10
            rounded-xl px-6 py-4 shadow-sm flex items-center justify-between
          "
        >
          <div>
            <h2 className="text-[17px] font-semibold text-black">{p.name}</h2>
            {p.description && (
              <p className="text-black/50 text-[13px] mt-1">{p.description}</p>
            )}
          </div>

          <button
            onClick={() => deleteProject(p.id)}
            className="text-red-600 hover:opacity-70 font-medium"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
