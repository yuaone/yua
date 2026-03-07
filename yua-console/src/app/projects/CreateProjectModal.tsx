"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";

export default function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function createProject() {
    const res = await apiRequest("/api/projects/create", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });

    if (res.ok) {
      onCreated();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40">
      <div className="bg-white/80 rounded-xl p-8 w-[420px] border border-black/10 shadow-xl">
        <h2 className="text-xl font-semibold text-black mb-4">Create Project</h2>

        <label className="block text-black text-sm mb-1">Project Name</label>
        <input
          className="w-full border border-black/20 rounded-lg px-3 py-2 mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="block text-black text-sm mb-1">Description</label>
        <textarea
          className="w-full border border-black/20 rounded-lg px-3 py-2 mb-6"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 bg-black/10 rounded-lg"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-black text-white rounded-lg"
            onClick={createProject}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
