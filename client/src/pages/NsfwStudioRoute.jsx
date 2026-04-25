import { useAuthStore } from "../store";
import NSFWPage from "./NSFWPage";
import NsfwStudioLockedPage from "./NsfwStudioLockedPage";

/** Full-page /nsfw: full studio for admins, locked message for everyone else. */
export default function NsfwStudioRoute() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === "admin") return <NSFWPage />;
  return <NsfwStudioLockedPage />;
}
