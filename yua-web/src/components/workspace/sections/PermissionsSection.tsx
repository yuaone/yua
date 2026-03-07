"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, Plus, Trash2, Check } from "lucide-react";
import { useWorkspaceCtx } from "../WorkspaceContext";
import type { Permission, CustomRole, RolePermission } from "../types";

/* ─────────────────────────────────────────────
   PermissionsSection
───────────────────────────────────────────── */
export default function PermissionsSection() {
  const { isEnterprise, authFetch, showToast } = useWorkspaceCtx();

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(false);

  // Draft permission map: roleId -> Set of permissionKeys
  const [draft, setDraft] = useState<Record<string, Set<string>>>({});
  // Track which roles have unsaved changes
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  // Create role form
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");

  /* ── Load ────────────────────────────────── */
  const loadPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/workspace/permissions");
      const data = await res.json();
      if (data?.ok) {
        setPermissions(data.permissions ?? []);
        setRoles(data.roles ?? []);
        setRolePermissions(data.rolePermissions ?? []);
      }
    } catch {
      showToast("Failed to load permissions.", "error");
    } finally {
      setLoading(false);
    }
  }, [authFetch, showToast]);

  useEffect(() => {
    if (isEnterprise) loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnterprise]);

  // Sync draft from server data
  useEffect(() => {
    const next: Record<string, Set<string>> = {};
    for (const role of roles) {
      next[role.id] = new Set(
        rolePermissions
          .filter((rp) => rp.roleId === role.id)
          .map((rp) => rp.permissionKey),
      );
    }
    setDraft(next);
    setDirty(new Set());
  }, [roles, rolePermissions]);

  /* ── Create role ─────────────────────────── */
  const handleCreateRole = async () => {
    const n = newName.trim();
    const k = newKey.trim().toLowerCase().replace(/\s+/g, "_");
    if (!n || !k) return;
    setLoading(true);
    try {
      const res = await authFetch("/api/workspace/permissions/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, key: k }),
      });
      const data = await res.json();
      if (data?.ok) {
        showToast("Role created.", "ok");
        setNewName("");
        setNewKey("");
        await loadPermissions();
      } else {
        showToast(data?.error ?? "Failed to create role.", "error");
      }
    } catch {
      showToast("Failed to create role.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── Save role permissions ───────────────── */
  const handleSaveRole = async (roleId: string) => {
    const keys = Array.from(draft[roleId] ?? []);
    setLoading(true);
    try {
      const res = await authFetch(
        `/api/workspace/permissions/roles/${roleId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissionKeys: keys }),
        },
      );
      const data = await res.json();
      if (data?.ok) {
        showToast("Permissions updated.", "ok");
        setDirty((prev) => {
          const next = new Set(prev);
          next.delete(roleId);
          return next;
        });
        await loadPermissions();
      } else {
        showToast(data?.error ?? "Failed to update permissions.", "error");
      }
    } catch {
      showToast("Failed to update permissions.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── Delete role ─────────────────────────── */
  const handleDeleteRole = async (roleId: string) => {
    setLoading(true);
    try {
      const res = await authFetch(
        `/api/workspace/permissions/roles/${roleId}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data?.ok) {
        showToast("Role deleted.", "ok");
        await loadPermissions();
      } else {
        showToast(data?.error ?? "Failed to delete role.", "error");
      }
    } catch {
      showToast("Failed to delete role.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── Toggle checkbox ─────────────────────── */
  const togglePermission = (roleId: string, permKey: string) => {
    setDraft((prev) => {
      const current = new Set(prev[roleId] ?? []);
      if (current.has(permKey)) current.delete(permKey);
      else current.add(permKey);
      return { ...prev, [roleId]: current };
    });
    setDirty((prev) => new Set(prev).add(roleId));
  };

  /* ── Gate ─────────────────────────────────── */
  if (!isEnterprise) {
    return (
      <div className="bg-white dark:bg-[#1b1b1b] border border-[var(--line)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Lock size={18} /> Permissions &amp; Roles
        </h2>
        <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)]">
          <Lock size={32} className="mb-2 opacity-40" />
          <p className="text-sm">
            Custom RBAC is available on the Enterprise plan.
          </p>
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────── */
  return (
    <div className="bg-white dark:bg-[#1b1b1b] border border-[var(--line)] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Lock size={18} /> Permissions &amp; Roles
      </h2>

      {/* Create role form */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">
          Create a new role
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Role name"
            disabled={loading}
            className="flex-1 rounded-lg border border-[var(--line)] px-3 py-2 text-sm bg-transparent outline-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="role_key"
            disabled={loading}
            className="flex-1 rounded-lg border border-[var(--line)] px-3 py-2 text-sm bg-transparent outline-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <button
            onClick={handleCreateRole}
            disabled={loading || !newName.trim() || !newKey.trim()}
            className="bg-[#111827] dark:bg-white text-white dark:text-[#111827] rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-1.5 justify-center"
          >
            <Plus size={14} /> Add Role
          </button>
        </div>
      </div>

      {/* Permission grid */}
      <div className="mt-6">
        <p className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
          Role permissions
        </p>

        {loading && roles.length === 0 ? (
          <div className="space-y-2">
            <div className="h-16 rounded-lg bg-[#f9fafb] dark:bg-white/5 animate-pulse" />
            <div className="h-16 rounded-lg bg-[#f9fafb] dark:bg-white/5 animate-pulse" />
          </div>
        ) : roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)]">
            <Lock size={28} className="mb-2 opacity-40" />
            <p className="text-sm">No roles defined yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#f9fafb] dark:bg-white/5">
                  <th className="text-left px-3 py-2 font-semibold text-[var(--text-secondary)] border-b border-[var(--line)] min-w-[140px]">
                    Role
                  </th>
                  {permissions.map((p) => (
                    <th
                      key={p.key}
                      className="text-center px-2 py-2 font-medium text-[var(--text-secondary)] border-b border-[var(--line)] min-w-[80px]"
                      title={p.description}
                    >
                      <span className="text-xs">{p.key}</span>
                    </th>
                  ))}
                  <th className="text-center px-2 py-2 border-b border-[var(--line)] w-[100px]" />
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => {
                  const selected = draft[role.id] ?? new Set<string>();
                  const isDirty = dirty.has(role.id);
                  return (
                    <tr
                      key={role.id}
                      className="border-b border-[var(--line)] last:border-b-0"
                    >
                      <td className="px-3 py-3">
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {role.name}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {role.key}
                          {role.isSystem && (
                            <span className="ml-1 text-[10px] bg-[#f9fafb] dark:bg-white/10 px-1.5 py-0.5 rounded">
                              system
                            </span>
                          )}
                        </div>
                      </td>
                      {permissions.map((p) => (
                        <td key={p.key} className="text-center px-2 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(p.key)}
                            onChange={() => togglePermission(role.id, p.key)}
                            disabled={loading}
                            className="w-4 h-4 rounded border-[var(--line)] cursor-pointer accent-[#111827] dark:accent-white"
                          />
                        </td>
                      ))}
                      <td className="text-center px-2 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {isDirty && (
                            <button
                              onClick={() => handleSaveRole(role.id)}
                              disabled={loading}
                              className="bg-[#111827] dark:bg-white text-white dark:text-[#111827] rounded-md px-2.5 py-1 text-xs font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-1"
                            >
                              <Check size={12} /> Save
                            </button>
                          )}
                          {!role.isSystem && (
                            <button
                              onClick={() => handleDeleteRole(role.id)}
                              disabled={loading}
                              className="text-red-500 hover:text-red-600 transition p-1 disabled:opacity-50"
                              title="Delete role"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Permission descriptions legend */}
            {permissions.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {permissions.map((p) => (
                  <div key={p.key} className="text-xs text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--text-secondary)]">
                      {p.key}
                    </span>
                    {p.description ? ` - ${p.description}` : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
