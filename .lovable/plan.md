1. Rebuild the label positioning in `src/components/ui/globe-emails.tsx` around cobe’s native bindable markers instead of the current custom `project()` math.
   - Add each marker’s `id` to the `createGlobe(..., { markers })` config.
   - Remove the `projected` state, the per-frame `setProjected(...)`, and the guessed sphere radius math.
   - Keep the globe rotation / drag behavior exactly as-is.

2. Attach each label card to its real marker using cobe’s CSS anchor API.
   - Render each label as an absolutely positioned overlay element.
   - Anchor it to `--cobe-{id}` so the browser positions the card from the actual marker location produced by cobe.
   - Use `var(--cobe-visible-{id})` for opacity (and optionally blur/scale) so labels fade out automatically when a marker rotates behind the globe.
   - Keep the existing card design, percentages, and progress bars.

3. Fine-tune the visual offset so the cards sit just above each marker instead of hugging the outer edges.
   - Use anchor-based top/center alignment rather than manual `left/top` percentages.
   - Add a small vertical gap and keep the dot/connector under the card.
   - If needed, slightly reduce card width on smaller screens so labels don’t collide.

4. Verify the landing hero behavior end-to-end.
   - Auto-rotation: labels should move with the globe continuously.
   - Drag interaction: labels should stay glued to the marker while dragging.
   - Backside visibility: labels should fade when their marker is behind the globe.
   - No regression to the continents / globe styling.

Technical details
- The current implementation is failing because it approximates the globe as a flat 2D circle with a hardcoded `radius = 0.38`. That does not match cobe’s real render output, which also depends on its own projection, glow, margins, scaling, and marker placement logic.
- cobe already ships the exact mechanism needed here: bindable markers with CSS anchors and visibility variables. Using that means the labels follow the same coordinates cobe is actually drawing, instead of a guessed projection.
- Result: the labels will no longer sit near the container edges or “float” independently; they will be attached to the markers on the spinning globe itself.