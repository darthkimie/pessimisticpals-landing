# Pessimistic Pals — App Project

## Overview
Mobile-first web app. Productivity tracker + virtual pet game built around the Pessimistic Pals universe.

## Reference Docs
- [APP_DATABASE.md](APP_DATABASE.md) — internal wiki-style reference for systems, mechanics, UI/UX, state architecture, and data catalogs

## Stack
- Plain HTML / CSS / JS (no framework — keeps it simple and portable)
- localStorage for save state
- GitHub Pages for hosting

---

## Folder structure

```
pessimistic-pals/
│
├── index.html              ← entry point, routes to onboarding or home
│
├── pages/
│   ├── onboarding.html     ← pal adoption questionnaire
│   ├── home.html           ← main screen: pal + tasks + check-in
│   ├── care.html           ← needs bars, wheel of gloom, actions
│   ├── lab.html            ← cloning lab, mutation system
│   └── collection.html     ← all pals, lore cards, mutation variants
│
├── css/
│   └── main.css            ← global styles and CSS variables
│
├── js/
│   ├── main.js             ← app entry, state management, routing
│   └── data.js             ← all canon pal/planet/moon/tribe data
│
└── assets/
    ├── pals/               ← pal character images (PNG, transparent bg preferred)
    │   ├── ahote.png       ← source file: ahoteog.png
    │   ├── brutus.png
    │   ├── centrama.png
    │   ├── doolin.png
    │   ├── elbjorg.png
    │   ├── veruca.png
    │   ├── winta.png
    │   ├── xio.png
    │   ├── yun.png
    │   └── zenji.png
    │
    ├── planets/            ← planet images
    │   └── yuin.png        ← Yishap (Yun's planet) — keep filename as yuin.png
    │
    ├── moons/              ← moon images
    │
    ├── tribes/             ← tribe mask / emblem images
    │
    ├── ships/              ← ship part images (layered, 1008x1008px)
    │
    ├── backgrounds/        ← space.png and other backgrounds
    │   └── space.png
    │
    └── ui/                 ← icons, buttons, UI elements
```

---

## Canon rules (do not break these)
- All Pals use **they/them** pronouns
- Pals **clone** — they do not breed
- Gender does not exist in this universe
- Yun's planet is **Yishap** — image file is yuin.png (keep as-is)
- Yun has **no moon**
- Ahote's correct image is **ahoteog.png** — rename to ahote.png when adding to assets
- Use **Pals** not **People** in all lore text
- Source images with black backgrounds: use black matte extraction for transparency

---

## Asset notes
- Pal images: rename to lowercase pal name (ahote.png, brutus.png, etc.)
- Black backgrounds on source art: black matte extraction needed for true transparency
- Ship parts from Procreate: 1008x1008px layered — add to assets/ships/
- Background: space.png goes in assets/backgrounds/

---

## Build status
- [x] Task tracker (home.html)
- [x] Needs + care system (care.html)
- [x] Wheel of Gloom
- [ ] Cloning lab (lab.html)
- [ ] Collection screen (collection.html)
- [ ] Onboarding questionnaire
- [ ] LocalStorage save/load
- [ ] Asset integration (waiting on images)
- [ ] All 10 Pals with real dialogue
