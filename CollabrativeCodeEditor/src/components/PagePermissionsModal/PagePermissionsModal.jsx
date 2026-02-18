import { motion } from "framer-motion";
import { Search, ShieldCheck, UsersRound, Lock, X, FilePenLine, Info } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import ParticipantSelectRow from "./ParticipantSelectRow";

const normalizePermissions = (value) => {
  const mode = ["everyone", "selected", "readonly"].includes(value?.mode)
    ? value.mode
    : "everyone";

  const editors = Array.isArray(value?.editors)
    ? [...new Set(value.editors.filter(Boolean))]
    : [];

  return {
    mode,
    editors: mode === "selected" ? editors : [],
  };
};

const PagePermissionsModal = ({
  open,
  onClose,
  pageId = null,
  pageName = "",
  participants = [],
  ownerId = null,
  pageCreatorId = null,
  pageCreatorName = "Unknown",
  value,
  onSave,
  isSaving = false,
  canManage = true,
  permissionsLockedByRoom = false,
}) => {
  const [mode, setMode] = useState("everyone");
  const [selectedEditors, setSelectedEditors] = useState([]);
  const [search, setSearch] = useState("");
  const [draftPageName, setDraftPageName] = useState("");

  const valueEditorsKey = useMemo(
    () => (Array.isArray(value?.editors) ? [...new Set(value.editors.filter(Boolean))].join("|") : ""),
    [value?.editors]
  );

  const excludedIdSet = useMemo(
    () => new Set([ownerId, pageCreatorId].filter(Boolean)),
    [ownerId, pageCreatorId]
  );

  const modeOptions = [
    {
      id: "everyone",
      label: "Everyone",
      description: "Every participant can edit this page.",
      icon: UsersRound,
    },
    {
      id: "selected",
      label: "Selected Users",
      description: "Only selected participants can edit this page.",
      icon: ShieldCheck,
    },
    {
      id: "readonly",
      label: "Read-Only",
      description: "No participants can edit this page.",
      icon: Lock,
    },
  ];

  const selectableParticipants = useMemo(
    () =>
      participants.filter(
        (participant) => participant?.userId && !excludedIdSet.has(participant.userId)
      ),
    [participants, excludedIdSet]
  );

  const selectableIdSet = useMemo(
    () => new Set(selectableParticipants.map((participant) => participant.userId)),
    [selectableParticipants]
  );

  useEffect(() => {
    if (!open) return;

    const current = normalizePermissions(value);
    setMode(current.mode);
    setSelectedEditors(current.editors.filter((id) => !excludedIdSet.has(id)));
    setDraftPageName(pageName || "");
    setSearch("");
  }, [open, pageId, pageName, value?.mode, valueEditorsKey, excludedIdSet]);

  useEffect(() => {
    if (!open) return;
    setSelectedEditors((prev) => {
      const next = prev.filter((id) => selectableIdSet.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [open, selectableIdSet]);

  const q = search.toLowerCase();
  const filteredUsers = selectableParticipants
    .filter((u) => (u.name || "").toLowerCase().includes(q))
    .sort((a, b) => {
      const aName = (a.name || "").toLowerCase();
      const bName = (b.name || "").toLowerCase();

      const aStarts = aName.startsWith(q);
      const bStarts = bName.startsWith(q);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });

  if (!open) return null;

  const handleSave = () => {
    if (!canManage || typeof onSave !== "function") return;

    const safePageName = draftPageName.trim() || pageName || "Untitled";

    onSave({
      name: safePageName,
      permissions: {
        mode,
        editors:
          mode === "selected"
            ? selectedEditors.filter((id) => selectableIdSet.has(id))
            : [],
      },
    });
  };

  const permissionsInteractive = canManage && !permissionsLockedByRoom;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="page-permissions-title"
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="
            w-full max-w-[38rem] max-h-[74vh]
            rounded-2xl
            bg-slate-900/90 backdrop-blur-xl
            border border-white/10
            shadow-[0_24px_70px_-35px_rgba(0,0,0,0.9)]
            overflow-hidden
            flex flex-col
          "
        >
          <div className="border-b border-white/10 px-4 py-3.5 sm:px-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl border border-cyan-400/20 bg-cyan-500/[0.08] p-2">
                  <ShieldCheck className="h-4 w-4 text-cyan-300" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Access Control
                  </p>
                  <h3
                    id="page-permissions-title"
                    className="mt-1 text-base font-semibold text-slate-100"
                  >
                    Page Settings
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Manage page name and page-level editing access.
                  </p>
                  <p className="mt-1 text-[11px] text-cyan-200">
                    Page creator: <span className="font-semibold text-cyan-100">{pageCreatorName}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                aria-label="Close page settings"
                className="
                  inline-flex h-9 w-9 items-center justify-center rounded-lg
                  border border-slate-700 bg-slate-800/80 text-slate-400
                  hover:border-slate-500 hover:text-slate-100
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60
                  transition-all
                "
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col">
            <div className="mb-3 rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2.5">
              <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                <FilePenLine className="h-3.5 w-3.5 text-cyan-300" />
                Page Name
              </label>
              <input
                value={draftPageName}
                onChange={(e) => canManage && setDraftPageName(e.target.value)}
                disabled={!canManage}
                maxLength={64}
                className="
                  w-full rounded-lg border border-slate-700 bg-slate-900/75 px-3 py-2
                  text-sm text-slate-100 placeholder-slate-500
                  focus:border-cyan-400/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50
                  transition-all disabled:cursor-not-allowed disabled:opacity-60
                "
              />
            </div>

            {permissionsLockedByRoom && (
              <div className="mb-3 rounded-xl border border-cyan-400/25 bg-cyan-500/[0.08] px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                  <p className="text-xs text-cyan-100">
                    Room setting is currently set to <span className="font-semibold">Everyone can edit pages</span>. Page-level permissions are temporarily bypassed and will be restored when the room owner switches back.
                  </p>
                </div>
              </div>
            )}

            <div className="mb-3 rounded-xl border border-slate-700 bg-slate-800/80 p-1">
              <div className="grid grid-cols-3 gap-1">
                {modeOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = mode === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => permissionsInteractive && setMode(option.id)}
                      disabled={!permissionsInteractive}
                      className={`
                        inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-medium
                        transition-all duration-200
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60
                        disabled:cursor-not-allowed disabled:opacity-55
                        ${
                          isActive
                            ? "bg-cyan-400 text-slate-950 shadow-sm"
                            : "text-slate-400 hover:bg-slate-700/70 hover:text-slate-100"
                        }
                      `}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="truncate">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {mode === "selected" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => permissionsInteractive && setSearch(e.target.value)}
                    placeholder="Search participants..."
                    disabled={!permissionsInteractive}
                    className="
                      w-full rounded-lg border border-slate-700 bg-slate-800/80 py-2 pl-9 pr-28
                      text-sm text-slate-100 placeholder-slate-500
                      focus:border-cyan-400/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50
                      transition-all disabled:cursor-not-allowed disabled:opacity-60
                    "
                  />
                  <span
                    className="
                      pointer-events-none absolute right-2 top-1/2 -translate-y-1/2
                      inline-flex items-center rounded-md border border-cyan-400/30 bg-cyan-500/[0.10]
                      px-2 py-1 text-[11px] font-semibold text-cyan-200
                    "
                  >
                    {selectedEditors.length} selected
                  </span>
                </div>

                <div className="mb-2 text-[11px] text-slate-400">
                  Owner and page creator are always allowed and are hidden from this list.
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/60 p-2">
                  <div className="space-y-2">
                    {filteredUsers.map((u) => (
                      <ParticipantSelectRow
                        key={u.userId}
                        user={u}
                        selected={selectedEditors.includes(u.userId)}
                        onToggle={() =>
                          permissionsInteractive &&
                          setSelectedEditors((prev) =>
                            prev.includes(u.userId)
                              ? prev.filter((id) => id !== u.userId)
                              : [...prev, u.userId]
                          )
                        }
                      />
                    ))}

                    {filteredUsers.length === 0 && (
                      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/70 px-4 py-8 text-center">
                        <p className="text-sm font-medium text-slate-300">
                          No participants found
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Try a different name or clear the search.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {mode !== "selected" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16 }}
                className="rounded-xl border border-slate-700 bg-slate-900/65 px-3.5 py-5"
              >
                <p className="text-sm text-slate-300">
                  {mode === "everyone"
                    ? "All participants in the room can edit this page."
                    : "This page is locked for participants and remains read-only."}
                </p>
              </motion.div>
            )}
          </div>

          <div className="border-t border-white/10 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="
                  rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5
                  text-xs font-medium text-slate-200
                  hover:border-slate-500 hover:text-slate-100
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60
                  transition-all
                "
              >
                Cancel
              </button>

              {canManage && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="
                    rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5
                    text-xs font-semibold text-cyan-100
                    hover:border-cyan-300/70 hover:bg-cyan-500/25
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60
                    transition-all disabled:cursor-not-allowed disabled:opacity-60
                  "
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default PagePermissionsModal;
