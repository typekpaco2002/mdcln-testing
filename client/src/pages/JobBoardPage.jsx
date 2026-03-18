import { Briefcase, Clock, MessageSquare, Video, Users, Pen } from "lucide-react";

const ROLES = [
  { icon: MessageSquare, label: "Chatters", desc: "Fan engagement specialists" },
  { icon: Video,         label: "Video Editors", desc: "Content production & cuts" },
  { icon: Users,         label: "Content Managers", desc: "Account growth & strategy" },
  { icon: Pen,           label: "Copywriters", desc: "Captions, scripts & bios" },
];

export default function JobBoardPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-white/5 border border-white/10">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Job Board</h1>
          </div>
          <p className="text-slate-400 text-sm mt-2 ml-[52px]">
            Browse and post jobs for OnlyFans creators and agencies.
          </p>
        </div>

        {/* Coming soon card */}
        <div className="glass-panel rounded-2xl p-8 text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.20)" }}>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold tracking-wide text-amber-400 uppercase">Coming Soon</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            The marketplace is being built
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
            Soon you'll be able to post and discover jobs for chatters, content managers,
            video editors, copywriters, and more — all in one place.
          </p>
        </div>

        {/* Role previews */}
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="glass-card rounded-xl p-4 flex items-start gap-3 opacity-50 cursor-not-allowed select-none"
            >
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 shrink-0">
                <Icon className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">Stay tuned for updates</p>
      </div>
    </div>
  );
}
