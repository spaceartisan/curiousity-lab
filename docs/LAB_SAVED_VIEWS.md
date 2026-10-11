# Named microscope view continuity

The optional Saved microscope views panel stores up to six named zoom/pan presets on each slide. Names have an 80-character bound, IDs are unique within a slide, zoom remains 1–3 and each pan component remains −35 to 35. The settings use the existing microscope transform; framing can vary with responsive screen shape. They are not calibrated magnifications, source-coordinate landmarks or measurements. Digital zoom adds no detail.

Saving a preset is deliberate. Open view restores its settings. Remove view permits one immediate undo; adding another view clears that removal undo. Switching slides, offline resume and a fresh exploration retain the corresponding slide's presets. Presets do not move to a different source image. Existing saves without this optional field remain valid. No automatic image annotation, diagnostic label or scientific content is generated.

Saving a Lab Notebook page takes a defensive snapshot of its presets. Editing live presets leaves that saved entry and filed session unchanged. Notebook search includes preset names. Revisit specimen restores that notebook snapshot and its original observations, while retaining the existing last-reopened cue and original save date. Unknown-source notes remain readable as before.

Optional `views` fields are validated on active Lab pages, stored per-slide pages and notebook creations. Other creation kinds cannot carry them. Invalid bounds, non-finite values, duplicate IDs, oversized collections, blank/oversized names and unexpected preset fields reject the save. History-off keeps these authored settings with necessary progress, without collecting optional timing/hint summaries. No raw gesture stream, cloud permission, upload path or new image asset is added. Existing source and workflow content IDs/versions remain; the app version identifies this control addition.

Independent scientific/media review, the full image pack and hematology desk, actual family-device usability and full architecture implementation remain pending.
