import { Link } from "react-router-dom";
import { Construction, ArrowLeft } from "lucide-react";

/**
 * Shown when NSFW Studio is temporarily disabled (direct /nsfw, /pro/nsfw, or Pro embed).
 * @param {{ pro?: boolean }} props
 */
export default function NsfwStudioLockedPage({ pro = false }) {
  const backTo = pro ? "/pro" : "/dashboard";
  return (
    <div className="min-h-[min(100vh,720px)] flex flex-col items-center justify-center p-6 text-center text-slate-200">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 mb-6">
        <Construction className="h-9 w-9 text-rose-400" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold text-white tracking-tight mb-2">NSFW Studio</h1>
      <p className="text-slate-400 max-w-md text-sm leading-relaxed mb-8">
        Under reconstruction. We&apos;re improving this experience — check back soon.
      </p>
      <Link
        to={backTo}
        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
        data-testid="link-nsfw-locked-back"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {pro ? "Back to Pro" : "Back to dashboard"}
      </Link>
    </div>
  );
}
