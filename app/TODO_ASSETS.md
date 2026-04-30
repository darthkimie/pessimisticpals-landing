# Asset TODO — Pessimistic Pals App
things to draw. bring finished art to the Claude chat for processing.

current placeholder rule in app:
- pal art uses a solid color block with the pal name until the real PNG exists
- real image tags are already wired to `assets/pals/[palid].png`
- when you add the correctly named PNG, the placeholder hides automatically

---

## PAL PORTRAITS
main character images. transparent background preferred.
export from procreate with background layer hidden.
save as PNG. rename to pal id when done.

- [ ] ahote.png (source exists: ahoteog.png — just needs transparency fix)
- [ ] brutus.png
- [ ] centrama.png
- [ ] doolin.png
- [ ] elbjorg.png
- [ ] veruca.png
- [ ] winta.png
- [ ] xio.png
- [ ] yun.png
- [ ] zenji.png

target size: 400x400px minimum
note: if source has black background, bring to Claude for matte extraction

---

## PAL EXPRESSIONS / REACTIONS
optional but high value. each pal in different states.
used for: task completed, task missed, plague, clone complete

priority order (build these after base portraits):
- [ ] xio — idle, reacting (surprised), sick
- [ ] yun — idle, reacting, streak broken
- [ ] winta — idle, reacting
- [ ] brutus — idle, post-clone-mutation

---

## PLANET IMAGES
one per pal. used in habitat background and collection screen.

- [ ] aniwer.png
- [ ] busru.png
- [ ] coonsa.png
- [ ] dirwa.png
- [ ] einlin.png
- [ ] yuin.png (Yun's planet Yishap — file stays named yuin.png)
- [ ] + 4 more planets once names confirmed from lore

target size: 600x600px or larger
style: painterly, alien, gloomy. each one should feel distinct.

---

## MOON IMAGES
small collectible objects. displayed in planet habitat sky.

- [ ] alai.png
- [ ] brau.png
- [ ] carea.png
- [ ] + more once lore confirmed

target size: 200x200px
style: simple, odd shapes, each one weird in a different way

---

## TRIBE EMBLEMS / MASKS
used as habitat decor and collectible items.

- [ ] andgo emblem or mask
- [ ] busrani emblem or mask
- [ ] casnov emblem or mask

target size: 300x300px
you already have tribemasks.png — bring that to Claude to extract

---

## CLONING LAB UI
used on lab.html screen

- [ ] clone chamber idle state (illustration or stylized graphic)
- [ ] clone chamber active/running state
- [ ] clone reveal animation frame (optional)

---

## SHIP PARTS
for ship builder feature (later phase)
you already have these in the project — just need to be confirmed and added to assets/ships/

- [ ] review existing Ship*.png files and confirm which are usable
- [ ] thrusterd.png — confirm usable
- [ ] thrusterfired.png — confirm usable
- [ ] nosed.png — confirm usable
- [ ] based.png — confirm usable
- [ ] wingd.png — confirm usable
- [ ] windowd.png — confirm usable

---

## BACKGROUNDS
- [ ] space.png — you already have this. copy to assets/backgrounds/

---

## UI ELEMENTS (lower priority)
- [ ] gloom icon (small, used next to currency counter)
- [ ] luckdust icon (small, used next to currency counter)
- [ ] wheel of gloom graphic (optional — currently built in SVG/code)
- [ ] app icon (for when it goes to home screen)
- [ ] loading/splash screen graphic

---
## GIFTS / INVENTORY ITEMS
collectible relics handed out by Daily Disappointment, streak bonuses, seasonal events, and trophies. each one needs a matching PNG in `assets/ui/items/` (filename already wired in `js/data.js` → `ITEM_CATALOG`). currently shown as text-only cards on collection.html.

target size: 256x256px (square)
style: relic-like, painterly, transparent background, sits on a dark panel
naming: kebab-case, must match `image_ref` exactly

- [ ] burnt-toast-relic.png — common — "smells like burnt toast and resignation"
- [ ] staring-idol.png — uncommon — "it stares at you. you stare back. nobody wins"
- [ ] receipt-of-minor-ruin.png — common — "proof that something preventable still happened"
- [ ] dust-locket.png — rare — "warm to the touch in a way that suggests poor decisions"
- [ ] cursed-participation-ribbon.png — cursed — "awarded for showing up with deeply average energy"
- [ ] mildew-medal.png — uncommon — "its texture suggests patience has gone too far"
- [ ] velvet-grudge.png — rare — "soft, expensive, and quietly judgmental"
- [ ] lint-crown.png — common — "regal only if the room has given up"

note: rarity tier should be readable from the art (common = drab, uncommon = slight glow, rare = clear glow, cursed = pink/plague tint). collection.html already color-codes the rarity badge — the art just needs to feel like the tier.

---

## TROPHIES / ANTI-ACHIEVEMENTS
unlockable plaques on the trophy case (habits.html). each one needs a matching PNG in `assets/ui/trophies/` (folder doesn't exist yet — create when first art lands, then wire `image_ref` into `ANTI_ACHIEVEMENTS` in `js/data.js` and update the trophy renderer in main.js).

target size: 200x200px (square)
style: dusty, slightly pathetic, like a participation trophy that's been on a shelf too long. transparent background.
naming: snake_case, must match the trophy `id` exactly

- [ ] tried_once.png — "opened the app but added no new tasks"
- [ ] participation.png — "completed 1+ task in a 7-day window"
- [ ] it_could_be_worse.png — "streak broke but reopened the same day"
- [ ] administrative_gloom.png — "opened 7 days in a row with 0 tasks completed"
- [ ] first_loss.png — "first pal death recorded"
- [ ] rare_clone_lost_parent.png — "rare clone obtained while parent pal died"
- [ ] deep_sequence.png — "completed a deep clone sequence"
- [ ] first_divergence.png — "first divergent clone recorded"

wiring (do once first PNG exists):
- add `image_ref: 'assets/ui/trophies/<id>.png'` to each entry in `ANTI_ACHIEVEMENTS` (data.js ~line 1170)
- update the trophy case renderer in main.js (~line 4056, `renderTrophyCase`) to render an `<img>` when image_ref exists, falling back to the current text-only card otherwise
- mirrors the existing `image_ref` pattern already used by `ITEM_CATALOG`

---
## NOTES FOR CLAUDE SESSION
when you bring finished art here:
- Claude can do black matte extraction on images with baked-in black backgrounds
- Claude can resize and prep images for web
- Claude can help write dialogue for each pal once portraits are done
- bring lore (catchphrases, diagnoses, quirks) from OneNote and Claude will fill in the data.js file
