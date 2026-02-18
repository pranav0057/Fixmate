import { Check } from "lucide-react";

const getAvatarUrl = (name) => {
  const encodedName = encodeURIComponent(name || "?");
  return `https://ui-avatars.com/api/?name=${encodedName}&background=random&color=fff&size=128&bold=true`;
};

const ParticipantSelectRow = ({ user, selected, onToggle }) => {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`
        w-full flex items-center gap-3
        px-2.5 py-2
        rounded-lg
        border transition-all duration-200 backdrop-blur
        focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50
        ${
          selected
            ? "bg-cyan-500/15 border-cyan-400/70 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]"
            : "bg-slate-800/75 border-slate-700 hover:bg-slate-800 hover:border-slate-500"
        }
      `}
    >
      <img
        src={getAvatarUrl(user.name)}
        alt={user.name}
        className="h-9 w-9 shrink-0 rounded-full border border-slate-600"
      />

      <div className="min-w-0 flex-1 text-left">
        <p
          className={`truncate text-[13px] font-medium ${
            selected ? "text-cyan-100" : "text-slate-100"
          }`}
        >
          {user.name}
        </p>
        <p className="truncate text-[11px] text-slate-400">Participant</p>
      </div>

      <div
        className={`
          h-4 w-4 rounded-md border
          flex items-center justify-center
          shrink-0 transition-colors duration-200
          ${
            selected
              ? "bg-cyan-400 border-cyan-400 text-slate-950"
              : "border-slate-500 text-transparent"
          }
        `}
      >
        <Check className="h-3 w-3" />
      </div>
    </button>
  );
};

export default ParticipantSelectRow;
