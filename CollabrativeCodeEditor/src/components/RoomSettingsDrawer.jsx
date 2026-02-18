import { useEffect } from "react";
import { X, Settings2, Info, Check } from "lucide-react";

const RadioOption = ({ label, desc, active, onClick }) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`
        relative w-full text-left px-3.5 py-3 rounded-xl border
        transition-all duration-200 cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60
        ${
          active
            ? "border-cyan-400/45 bg-cyan-500/[0.08] shadow-[0_0_0_1px_rgba(34,211,238,0.14)]"
            : "border-slate-700 bg-slate-800/70 hover:border-slate-500 hover:bg-slate-800"
        }
      `}
    >
      <span
        className={`
          pointer-events-none absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full
          transition-opacity duration-200
          ${active ? "opacity-100 bg-cyan-400" : "opacity-0"}
        `}
      />

      <div className="flex items-start gap-3">
        <span
          className={`
            mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border
            transition-colors duration-200
            ${
              active
                ? "border-cyan-300 bg-cyan-300 text-slate-950"
                : "border-slate-500 bg-slate-900 text-transparent"
            }
          `}
        >
          <Check className="h-3 w-3" />
        </span>

        <span className="min-w-0">
          <span
            className={`block text-[13px] font-medium ${
              active ? "text-cyan-100" : "text-slate-100"
            }`}
          >
            {label}
          </span>
          <span className="mt-1 block text-xs text-slate-400">{desc}</span>
        </span>
      </div>
    </button>
  );
};

const RoomSettingsDrawer = ({ isOpen, onClose, settings, setSettings }) => {
  useEffect(() => {
    if (!isOpen) return;

    const onEsc = (e) => e.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEsc);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`
          fixed inset-0 z-40 bg-black/65 backdrop-blur-sm
          transition-opacity duration-300
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-settings-title"
        className={`
          fixed top-0 right-0 z-50 h-full w-full max-w-[25rem]
          border-l border-white/10
          bg-slate-900/90 backdrop-blur-xl
          flex flex-col
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/80 backdrop-blur px-4 py-3.5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-2.5">
                <Settings2 className="h-4 w-4 text-cyan-300" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Workspace Controls
                </p>
                <h2
                  id="room-settings-title"
                  className="mt-1 text-lg font-semibold text-slate-100"
                >
                  Room Settings
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Configure who can create pages and edit new content.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close room settings"
              className="
                mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg
                border border-slate-700 bg-slate-800/80 text-slate-400
                hover:border-slate-500 hover:text-slate-100
                focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60
                transition-all
              "
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3.5">
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                Page Creation
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Choose who can create new pages in this room.
              </p>
            </div>

            <div role="radiogroup" aria-label="Page creation permissions" className="space-y-2.5">
              <RadioOption
                label="Any participant can create pages"
                desc="Everyone in the room can add new pages."
                active={settings.pageCreation === "anyone"}
                onClick={() =>
                  setSettings((s) => ({ ...s, pageCreation: "anyone" }))
                }
              />
              <RadioOption
                label="Only room owner can create pages"
                desc="Restrict page creation to the room owner."
                active={settings.pageCreation === "owner"}
                onClick={() =>
                  setSettings((s) => ({ ...s, pageCreation: "owner" }))
                }
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3.5">
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                Page Editing Policy
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Toggle between room-wide override and page-owner-level controls.
              </p>
            </div>

            <div role="radiogroup" aria-label="Default page editing access" className="space-y-2.5">
              <RadioOption
                label="Everyone can edit pages"
                desc="Room-level override: every page becomes editable by everyone."
                active={settings.defaultEdit === "everyone"}
                onClick={() =>
                  setSettings((s) => ({ ...s, defaultEdit: "everyone" }))
                }
              />
              <RadioOption
                label="Decided by page owner"
                desc="Restore each page's saved permissions managed by owner/creator."
                active={settings.defaultEdit === "creator"}
                onClick={() =>
                  setSettings((s) => ({ ...s, defaultEdit: "creator" }))
                }
              />
            </div>
          </section>
        </div>

        <footer className="border-t border-white/10 bg-slate-900/80 px-4 py-3.5 backdrop-blur">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
              <p className="text-xs leading-relaxed text-cyan-100">
                Room owners always keep full access to every page and all room settings.
              </p>
            </div>
          </div>
        </footer>
      </aside>
    </>
  );
};

export default RoomSettingsDrawer;
