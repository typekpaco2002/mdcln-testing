/**
 * CursorGlow — DISABLED.
 *
 * Previously rendered a custom white dot + glow following the cursor and
 * hid the native cursor via `* { cursor: none !important }`. Multiple
 * users reported it was disorienting and broke text-selection affordances
 * on the landing page. Component kept as a no-op so existing import sites
 * (LandingPage, SelectUserTypePage, CreateAIModelLandingPage) keep
 * compiling without needing a coordinated edit across files.
 */
export default function CursorGlow() {
  return null;
}
