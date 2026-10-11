# Direct microscope manipulation

The existing two-source starter viewer supports one-pointer dragging and two-finger pinch zoom. Mouse dragging uses the primary button; pen and touch use the same Pointer Events path. Two-pointer zoom preserves the source-image point under the moving midpoint until existing pan/zoom bounds are reached. Digital zoom remains 1–3× enlargement and pan remains ±35% of the image element. No magnification, focal plane or scientific content is invented.

## State and continuity

Pointer coordinates, identities, baselines and trajectories exist only in component memory. Pointer moves render a temporary view without writing save-game records. When the final tracked pointer is released, one changed final view is committed through the existing view-only update path. A third simultaneous pointer is ignored. Lifting one of two tracked fingers rebases the remaining drag, and adding a second rebases the pinch.

Pointer cancellation or unexpected lost capture discards the entire unfinished gesture. Escape, blur, document hiding, window resize, external saved-view changes and specimen/component replacement also discard it. An interrupted or canceled gesture cannot fabricate a saved final view. Necessary view settings still persist with optional activity history disabled; ordinary consented input-category observations remain unchanged. No pointer coordinates or tap timestamps are added to history, exports or cloud preparation.

The existing arrow-key, plus/minus and large button controls remain available. Only the image viewport disables browser touch panning; ordinary scrolling works outside it. Optional controls help is closed by default. Do not disable page-level browser zoom or gesture scrolling.

Notebook entries and named presets snapshot existing final display settings. Later gestures change only the working view; they do not change already filed entries, saved dates or finalized sessions. Old saves and content/task identities remain unchanged, and no Firestore permissions or upload flow is added.

## Review still required

Automated Chromium mouse/touch checks cover drag, pinch, capture, cancellation, offline persistence, outside page scrolling, keyboard alternatives and enlarged text. Actual family phones/tablets, Safari/PWA gesture behavior and VoiceOver/TalkBack usability still need review. Independent microscopy review, the 8–12-image collection, hematology and full-document sync/reporting/recovery work remain unfinished.
