import React from "react";
import { useAuthStore } from "../../store";
import NSFWPage from "../NSFWPage";
import NsfwStudioLockedPage from "../NsfwStudioLockedPage";

export default function ProNSFWPage() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === "admin") {
    return (
      <div className="min-h-full">
        <NSFWPage embedded sidebarCollapsed={false} />
      </div>
    );
  }
  return (
    <div className="min-h-full">
      <NsfwStudioLockedPage pro />
    </div>
  );
}
