import { Info } from "lucide-react";
import toast from "react-hot-toast";

export default function TutorialInfoLink({ tutorialUrl, label = "click to view tutorial", className = "" }) {
  const handleOpen = () => {
    if (!tutorialUrl) {
      toast("Coming soon");
      return;
    }
    window.open(tutorialUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      className={`inline-flex items-center gap-1.5 text-white hover:text-white/90 transition ${className}`}
      aria-label="Open tutorial"
      title="Open tutorial"
    >
      <Info className="w-4 h-4 text-white" />
      <span className="text-xs font-bold text-white">{label}</span>
    </button>
  );
}
