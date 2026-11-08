// src/ui/dialog.js — focus handling for the overlay sheets.
// ---------------------------------------------------------------------------
// React 19 ref callbacks may return a cleanup function, which is exactly the
// shape of "on mount: remember focus, focus the sheet; on unmount: give focus
// back". No useRef + useEffect pair needed.
//
// It's a *module-level* function, so its identity never changes: React calls
// it once on mount and its cleanup once on unmount. An inline arrow would be
// a new function each render, so React would detach and re-attach it on
// every render, stealing focus back to the sheet while you type.
//
// Trapping Tab inside the sheet is done by making the chart behind `inert`
// (see App.jsx). That's the platform's own focus trap: no keydown juggling.
// ---------------------------------------------------------------------------

/** Ref callback: focus the node on mount, restore the previous focus on unmount. */
export function focusOnMount(node) {
  const previous = document.activeElement
  node.focus({ preventScroll: true })
  return () => {
    // The opener may be gone (e.g. lesson -> next lesson remounts the book).
    if (previous?.isConnected) previous.focus({ preventScroll: true })
  }
}

/** Spread onto an overlay's sheet: <article {...dialogProps}> */
export const dialogProps = { ref: focusOnMount, tabIndex: -1, role: 'dialog', 'aria-modal': true }
