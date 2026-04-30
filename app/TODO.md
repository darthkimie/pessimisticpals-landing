# Pessimistic Pals Asset TODO

## Current App Follow-Ups

- [ ] Visually verify companion.html bottom-stack spacing in browser
  - Confirm #input-area sits flush above the bottom nav with no gap
  - Confirm the nav is fully visible and not clipped at the bottom edge
  - Confirm #chat-window bottom padding clears the fixed stack during scrolling
- [ ] Re-test companion Gemini responses after quota reset
  - Verify API calls stop returning 429 on the free tier
  - Confirm Doolin responds in character in the current prompt setup
- [ ] Confirm Ahote-linked JS update landed in main.js
- [ ] Investigate care.html placeholder pal name state
  - Re-check after the earlier WHEEL_SEGMENTS fix in live flow
- [ ] Run the game-over screen prompt for last-pal-death handling

## Priority 1: Home Screen Essentials

- [ ] Draw `assets/pals/xio.png`
  - Used immediately by the temporary home-screen preview
  - Portrait or full-body PNG with transparent background
  - Target size: at least 800px tall for crisp mobile scaling
- [ ] Define a visual style sheet for Pal portraits
  - Consistent framing, line weight, and silhouette treatment
  - Should read clearly against a near-black background

## Priority 2: Remaining Base Pal Art

- [ ] Draw `assets/pals/ahote.png`
- [ ] Draw `assets/pals/brutus.png`
- [ ] Draw `assets/pals/centrama.png`
- [ ] Draw `assets/pals/doolin.png`
- [ ] Draw `assets/pals/elbjorg.png`
- [ ] Draw `assets/pals/veruca.png`
- [ ] Draw `assets/pals/winta.png`
- [ ] Draw `assets/pals/yun.png`
- [ ] Draw `assets/pals/zenji.png`

## Priority 3: UI Support Art

- [ ] Create a small app wordmark or logotype reference
  - Optional, but useful for onboarding and splash states
- [ ] Create bottom-nav icons for Home, Care, Lab, and Collection
  - Flat, 1-color icons sized for 24px to 32px display
- [ ] Create a generic fallback silhouette PNG
  - Useful when a Pal image is still missing

## Priority 4: Future Screen Art

- [ ] Draw planet images referenced in `js/data.js`
  - `assets/planets/aniwer.png`
  - `assets/planets/busru.png`
  - `assets/planets/coonsa.png`
  - `assets/planets/dirwa.png`
  - `assets/planets/einlin.png`
  - `assets/planets/yuin.png`
- [ ] Draw moon images referenced in `js/data.js`
  - `assets/moons/alai.png`
  - `assets/moons/brau.png`
  - `assets/moons/carea.png`
- [ ] Sketch cloning chamber UI art for the Lab page
- [ ] Sketch Wheel of Gloom wedges or icon set for the Care page
- [ ] Draw lore-card thumbnails for the Collection page

## Notes

- The current home screen already shows a text placeholder when a PNG is missing.
- File names should stay exactly aligned with `js/data.js` so no code changes are needed later.
- All art should sit comfortably on dark backgrounds without relying on glow or shadow effects.