---
name: Transfer (Paseo native surface)
description: Pick the other host and a new folder, read exactly what travels and what stays, then watch each leg land with its own time and open it there.
typography:
  state-title:
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "23px"
  title:
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "21px"
  body:
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "19px"
  label:
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "18px"
  field:
    fontSize: "13px"
    fontWeight: 400
  field-compact:
    fontSize: "16px"
    fontWeight: 400
  meta:
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "17px"
    fontFeature: "tnum"
  group:
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    fontFeature: "tnum"
  button:
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "16px"
    fontFeature: "tnum"
  button-compact:
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "19px"
    fontFeature: "tnum"
  chat-row:
    fontSize: "14px"
    fontWeight: 400
    fontFeature: "tnum"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "17px"
rounded:
  bar: "2px"
  control: "6px"
  segment: "7px"
  tile: "8px"
  track: "9px"
  card: "10px"
  pill: "999px"
spacing:
  segment-inset: "3px"
  tile-stack: "6px"
  inline: "8px"
  row-gap: "10px"
  card-x: "12px"
  frame-gap: "14px"
  popup-gap: "16px"
  gutter-compact: "16px"
  section: "22px"
  gutter: "28px"
  columns: "32px"
components:
  button:
    rounded: "{rounded.control}"
    height: "32px"
    padding: "0 11px"
    typography: "{typography.button}"
  button-small:
    rounded: "{rounded.control}"
    height: "28px"
    padding: "0 9px"
  button-compact:
    rounded: "{rounded.tile}"
    height: "44px"
    padding: "0 14px"
    typography: "{typography.button-compact}"
  icon-button:
    rounded: "{rounded.control}"
    size: "28px"
  icon-button-compact:
    rounded: "{rounded.control}"
    size: "44px"
  segmented-track:
    rounded: "{rounded.track}"
    padding: "3px"
  segmented-option:
    rounded: "{rounded.segment}"
    height: "28px"
    padding: "0 10px"
    typography: "{typography.label}"
  segmented-option-compact:
    rounded: "{rounded.segment}"
    height: "38px"
  host-tile:
    rounded: "{rounded.tile}"
    height: "48px"
    padding: "8px 12px"
  host-tile-compact:
    rounded: "{rounded.tile}"
    height: "56px"
  input:
    rounded: "{rounded.tile}"
    height: "34px"
    padding: "0 11px"
    typography: "{typography.field}"
  input-compact:
    rounded: "{rounded.tile}"
    height: "44px"
    typography: "{typography.field-compact}"
  card:
    rounded: "{rounded.card}"
  receipt-row:
    padding: "7px 0"
    typography: "{typography.body}"
  receipt-row-dense:
    padding: "4px 0"
  route-end:
    rounded: "{rounded.pill}"
    height: "26px"
    padding: "0 9px"
    typography: "{typography.meta}"
  stage-rail:
    rounded: "{rounded.card}"
    padding: "8px 12px"
  copy-bar:
    rounded: "{rounded.bar}"
    height: "3px"
  problem-note:
    rounded: "{rounded.tile}"
    padding: "10px"
  outcome-mark:
    rounded: "{rounded.pill}"
    size: "36px"
  list-row:
    padding: "9px 12px"
    typography: "{typography.body}"
  chat-row:
    rounded: "{rounded.tile}"
    padding: "4px 8px"
    typography: "{typography.chat-row}"
---

# Design System: Transfer

## Overview

**Creative North Star: "A Route and a Receipt"**

Transfer is a shipping tracker's receipt inside a native settings-style setup. The left side (or the top of the popup) is the setup: where it goes, which workspace, the new folder, copy or move. The right side is a receipt card that starts as "What travels", becomes the real itemised receipt after Preview (what goes, what stays), then turns in place into a stage rail whose legs each land with their own time, and ends on a check and "Open on <host>". It lives inside Paseo and owns no colour, no font and no chrome: the host's ground, ink and system sans, plus the plugin family's kit (raised cards, tinted status, 97% press, neutral selection).

Density is that of a working tool. The largest text is the 17px state title ("Ready to copy", "Copying to Build server", "Copied to Build server"); everything else is 12–15px, and every time, count and size is tabular. Paths are always monospace so the folder you typed is the folder you read back on the route.

Colour means state or it is absent. Accent green fills exactly one primary action per state. Status green is something verified, amber is something that needs the person, red is something that failed. Selection, hover and the live step are ink and surfaces.

**Key Characteristics:**

- Host theme tokens only; every derived colour is a token at an alpha through `client/theme.ts`.
- One accent-filled primary per state, last in the action row, full width on phones.
- Choices are neutral: a lifted thumb in segmented tracks, a `foreground` ring on `surface2` for host tiles, a `surface2` fill with a check for list rows.
- The receipt card and the stage rail occupy the same place; the rail's legs carry their own durations and a total under a hairline.
- Paths in mono, durations and counts in tabular figures.

## Colors

The palette is the host's. Transfer owns no hex values, so the frontmatter carries no colour tokens; values follow the user's Paseo theme in light and dark. Use only `surface0`, `surface1`, `surface2`, `border`, `foreground`, `foregroundMuted`, `accent`, `accentForeground`, `statusSuccess`, `statusWarning` and `statusDanger`, through `withAlpha`, `tint` (12% light / 16% dark), `raised` and `isLight` (relative luminance of `surface0` > 0.4; unknown counts as dark).

### Primary

- **Host Accent** (`accent`, `accentForeground`): the one primary per state: Preview transfer, Copy/Move workspace, Open on <host>, Back to transfer after a failure, Use Copy instead for a blocked Move. Hover is accent at 92%, press at 85%. Settings switches are the host's own.

### Status

- **Verified Green** (`statusSuccess`): a done stage's check, the landed route end (tinted pill with a check), the outcome mark after success, a verified copy in "where things are", the header icon's check. A done leg's connector is green at 45%.
- **Amber** (`statusWarning`): a host that is unreachable or missing the plugin (its tile status line), a destination folder or Move the person can fix (tinted problem note, input border), a partial or unknown copy, a lost status.
- **Red** (`statusDanger`): a failed stage, the failed outcome mark, a general preview failure, a failed chat tool row, a settings save error.

### Neutral

- **Ground** (`surface0`): screens, cards, the selected segment in light themes, inputs in light themes.
- **Lifted** (`surface1`): the popup ground, inputs in dark themes, the segmented track in dark themes, hover fill of rows and tiles, the "What travels" footnote band, the failure details box, an open chat row.
- **Pressed** (`surface2`): selected host tiles and list rows, the segmented track in light themes, the selected segment in dark themes, the neutral route end, skeleton bars, pressed fills.
- **Hairline** (`border`): unselected tile and input outlines, card dividers (at 70%; list dividers at 60%), the route line, pending stage nodes and connectors, the rail's total rule (at 80%), the open chat row frame, the empty-hosts dashed box.
- **Ink** (`foreground`): titles, selected rings and radio dots, focused input borders, the running stage label (600) and its live time, the copy bar fill (at 70%; track at 12%), segment hover wash (at 5%), the header's progress ring.
- **Muted Ink** (`foregroundMuted`): group labels, meta, "stays behind" rows, pending stages, icons, placeholders (at 80%).

### Named Rules

**The One Green Button Rule.** Each state has exactly one accent-filled button, and it names its result ("Copy workspace", "Open on Build server"). Back, New transfer, Check again and a secondary Open are secondary buttons.

**The Status Is State Rule.** Green means verified, amber means the person must act, red means it failed. A running step is ink with a spinner, never a hue; a selected tile is ink, never accent.

**The Tint Not Fill Rule.** Status surfaces are the hue at the tint alpha with the hue as text or icon (problem notes, outcome marks, the landed route end); never a solid status fill.

## Typography

**Body Font:** the host's system sans (no family set)
**Label/Mono Font:** `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`, for paths (workspace cwd, destination, preserved copy) and path inputs only

**Character:** One system face across a narrow range; hierarchy comes from weight (400 / 500 / 600) and ink strength. Every time, count, size and duration uses tabular numerals.

### Hierarchy

- **State title** (600, 17px, 23px): the state's headline: Ready to copy, Copying to <host>, Copied to <host>, Copy stopped.
- **Title** (600, 15px, 21px): the workspace name at the top of the popup, the handoff message.
- **Body** (400, 13px, 19px): receipt rows, stage labels (600 while running), list row names (600), failure explanation.
- **Label** (600, 13px, 18px): host tile names, problem titles, "No other hosts yet"; segmented options at 500 / 600 selected (14px compact).
- **Field** (400, 13px desktop / 16px compact): inputs; 16px on touch so phones do not zoom.
- **Meta** (400, 12px, 17px, tabular): status lines, details under receipt rows, stage details and durations, consequence lines, footnotes.
- **Group** (600, 12px, 16px, tabular, muted): field labels (To, New folder on <host>, Copy or move) and receipt section heads (Goes to <host>, Stays on <host>, This session). Sentence case, the label of what follows, never a kicker.
- **Button** (500, 13px / 14px compact; 600 primary; 12px small).
- **Chat row** (400, 14px, tabular): the one-line agent tool row, matching Paseo's tool rows.

### Named Rules

**The Mono Is For Paths Rule.** Monospace marks filesystem paths and path inputs at 12–13px. Host names, branches and counts stay in the system sans.

**The Tabular Times Rule.** Every duration, size and count is tabular so the rail's right-hand times align as they tick.

## Layout

- **Popup** (desktop, from the header button): 384px wide on `surface1`. The body scrolls inside a fixed box (356px with actions, 408px without, minus any pinned notice) while the problem note and the action row stay pinned below; a six-strip fade (4px each) into the ground marks more content. Popup form stack gap 16px; other states 14px.
- **Phone popup** (host compact layout, workspace actions sheet): same content unpinned, 4px sides, 12px bottom; actions stack full width with the primary last (column-reverse).
- **Screen, wide** (its own measured width ≥ 860px): 28px gutter, 56px bottom, centred row at most 1080px, setup column `flex 11` | 32px | receipt column `flex 10`. Setup sections 22px apart. The right column holds What travels → receipt → stage rail → result, then "This session".
- **Screen, narrow** (< 860px): one column, 16px sides; the current step's action pinned at the bottom (12px top, 16px bottom, a hairline when content scrolls under it).
- **Inside cards**: 12px sides; receipt sections 10px top / 4px bottom (8 / 6 dense in the popup); rows 7px vertical (4px dense) with a 16px icon column and a 10px gap.
- **Workspace list**: one card, max 290px tall, scrolls internally.

Rhythm is 3/6/8 inside controls, 10–14 between rows and states, 16–22 between sections, 28–32 at gutter scale.

## Elevation & Depth

Mostly tonal. Depth is `surface0` → `surface1` → `surface2`, plus the family's `raised` ring on cards, secondary buttons and the selected segment. Nothing in Transfer floats on its own; the popup's frame belongs to the host.

### Shadow Vocabulary

- **Raised, light** (`box-shadow: 0px 0px 0px 1px rgba(0,0,0,0.07), 0px 1px 2px -1px rgba(0,0,0,0.06), 0px 2px 6px 0px rgba(0,0,0,0.04)`): cards, secondary buttons, the selected segment, on light grounds.
- **Raised, dark** (`box-shadow: 0px 0px 0px 1px rgba(255,255,255,0.08)`): the same on dark grounds.

### Named Rules

**The Flat Until Lifted Rule.** Rows and tiles are flat; selection and hover are fills and rings. Only cards, secondary buttons and the selected segment carry the raised ring.

## Shapes

Soft rectangles at a few steps: 6px for desktop buttons and icon buttons, 7px for segments inside a 9px track, 8px for host tiles, inputs, problem notes, compact buttons, the details box and chat rows, 10px for cards. Pills (999px) for route ends and SSH suggestions. Circles for the 36px outcome mark, the 16px radio with its 8px dot, and the 9px hollow pending node. The copy bar is 3px tall with 2px ends. The empty-hosts box is the only dashed border.

## Components

### Buttons

Quiet, compact, one vocabulary (`client/kit.tsx`), all wrapped in PressScale.

- **Shape:** 6px corners desktop, 8px compact.
- **Sizes:** 32px default, 28px small (12px text), 44px compact with 16px icon and 14px text; 4px hit slop off touch.
- **Primary:** `accent` fill, `accentForeground` 600 text, 14px icon. Grows to full width in the pinned popup and on phones.
- **Secondary:** `surface1` with the raised ring; `surface2` on hover and press.
- **Ghost:** transparent; `surface1` hover, `surface2` press. Use SSH / Paseo hosts, Connection options, Show details.
- **Icon button:** 28px (44px compact), muted 15px icon; the workspace list's refresh.
- **Disabled:** 45% opacity (40% icon buttons); loading swaps the icon for a 12px spinner.

### Segmented control

Direction (Send from / Bring to) and Copy or move. A 3px-inset track (`surface2` light / `surface1` dark, 9px corners) holding equal options (7px corners, 28px / 38px compact, 14px icon). The selected option lifts: `surface0` light / `surface2` dark with the raised ring, foreground 600 text. Unselected options are muted 500 with a 5% foreground hover wash. One consequence line in meta sits under it.

### Host tiles

Connected hosts as a radiogroup, 6px apart: 48px (56px compact), 8px corners, `border` outline, server icon, name in label and a status line in meta (Connected, Connecting… for 8s, then amber guidance), and a 16px radio on the right. Selected: `foreground` ring and radio dot on `surface2`. Hosts that are not ready are muted and disabled. No hosts: a dashed `border` box with a label and one meta line.

### Inputs / Fields

- **Style:** 1px `border`, 8px corners, `surface0` light / `surface1` dark, 34px (44px compact), 11px sides; path inputs in mono.
- **Focus:** the border turns `foreground`; the web outline is suppressed.
- **Invalid / Disabled:** amber border with the problem note in place of the hint; 60% when locked.
- Each field sits under a group label with an 8px gap and one meta hint below.

### Cards / Containers

- **Card:** 10px corners, `surface0`, raised, clipped; sections divide with `border` at 70%, list rows at 60%.
- **Problem note:** 8px corners, 10px padding, status tint fill, 15px status icon, title in the hue at label weight, message in foreground meta, at most one small secondary action. Amber when the person can fix it here, red when it failed outright. Pinned above the actions in the popup.

### Route

`Laptop ──› Build server` then the destination path in mono meta. Each end is a 26px pill on `surface2` with a muted 13px server icon and a 600 foreground label; between them a 24–72px hairline ending in a chevron. On success the destination end becomes a `statusSuccess` tint with a check.

### Receipt card and stage rail (signature)

- **Receipt:** one card, "Goes to <host>" (branch, files · size, conversations with up to three titles) above a hairline, then "Stays on <host>" in muted rows (ignored files, sign-ins and settings, this workspace). Before a preview the same card reads "What travels" with a `surface1` footnote band.
- **Stage rail:** in a card with 8 × 12px padding. Each leg has a 16px node (hollow 9px `border` circle pending, 14px spinner running, `statusSuccess` check done, `statusDanger` cross failed; nodes swap with IconSwap), a 1.5px connector (`border`, green at 45% once done), the label in body (600 while running) and its duration right-aligned in meta (foreground while running). The copy leg shows "x of y" and a 3px bar: foreground 12% track, 70% fill. When done, a `border` 80% rule and "Verified end to end" with the 600 total.
- **Outcome:** the 36px tinted circle with a 19px check, cross or warning, beside the state title and a meta summary; on failure a "where things are" card names each host's copy.

### Header icon

The plugin's header button icon: arrows idle; while running, an SVG ring (track at 30% stroke opacity) that fills as bytes arrive, in foreground; then a `statusSuccess` check, `statusDanger` cross or `statusWarning` triangle until seen. A host toast announces endings no panel is showing.

### Chat tool rows

One 14px line sized like Paseo's tool rows (8 × 4px padding, 8px corners, 22px icon slot with a 12px icon, muted until hover; 72% while running). Expanded, it frames in `border` on `surface1` and opens a 320px-max scroll of hosts or stages. Failure turns the line `statusDanger`.

### Motion

One ease, `cubic-bezier(0.16, 1, 0.3, 1)`, opacity and transform, and none of it under reduced motion. PressScale eases to 0.97 in 140ms. Reveal rises 6px over 280ms as each state arrives. IconSwap grows stage nodes in from 40% in 260ms. The outcome mark grows from 60% over 420ms once. The copy bar eases its width over 220ms. Skeletons breathe 55–100% on an 800ms loop.

## Do's and Don'ts

### Do:

- **Do** use only host theme tokens and alphas derived from them through `client/theme.ts`.
- **Do** give each state exactly one accent primary that names its result, last in the row and full width on phones.
- **Do** show what goes and what stays in one receipt card before anything moves, and turn that place into the stage rail.
- **Do** stamp every leg with its own tabular duration and close a finished rail with the total.
- **Do** draw selection neutrally: lifted thumb in a segmented track, `foreground` ring on `surface2` for tiles, `surface2` fill with a check for list rows.
- **Do** set every path in mono and name the host in every state line.
- **Do** keep controls at 28/32px with hit slop on desktop and 44px on compact layouts, with 16px input text on touch.
- **Do** honour reduced motion in every animation.

### Don't:

- **Don't** use accent green for selection, a running step, a tab or a second button in the same state.
- **Don't** use a status colour except for its state: green verified, amber needs the person, red failed.
- **Don't** fill a status surface solid; tint it at 12% / 16%.
- **Don't** report progress as one sentence; each leg is its own row with its own time.
- **Don't** add nav tabs inside the popup or toggle buttons as tabs; exclusive choices are a segmented track.
- **Don't** introduce a font family; monospace is for paths only.
