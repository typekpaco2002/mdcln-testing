/**
 * CustomCursor — DISABLED.
 *
 * Used to render a small blurred dot that replaced the native cursor on
 * hover-capable devices. Removed in favour of the standard system cursor
 * after repeated user feedback that the dot was distracting and broke
 * affordance cues (text caret, resize cursors, etc). Kept as a no-op
 * export so any standalone usage of the modelclone-landing folder
 * continues to import without errors.
 */
export function CustomCursor() {
  return null;
}
