function getPalById(palId) {
  if (typeof PAL_DATA !== 'undefined' && PAL_DATA && PAL_DATA[palId]) {
    return PAL_DATA[palId];
  }

  if (typeof PALS === 'undefined') {
    return null;
  }

  return PALS.find((pal) => pal.id === palId) || null;
}

function formatPalOrbitLabel(pal) {
  const moonLabel = Array.isArray(pal.moons) && pal.moons.length
    ? pal.moons.join(', ')
    : pal.moon || 'No moon logged';
  return `${pal.planet || 'Unknown orbit'} // ${moonLabel}`;
}

function getPalMiseryScore(pal) {
  return (pal.pessimism || 0) + (pal.mutationRisk || 0) - (pal.luck || 0);
}

function getPalEmotionalSnapshot(state, palId) {
  return state.palMoodLedger[palId] || {
    mood: 0,
    hunger: 0,
    neglectDays: 0,
    latestReaction: 'No emotional data survived the transfer.',
  };
}

function getPalGlowColor(pal, state) {
  if (!pal || !state) return 'rgba(255, 140, 66, 0.12)';

  const ledger = state.palMoodLedger && state.palMoodLedger[pal.id]
    ? state.palMoodLedger[pal.id]
    : null;

  const hunger = ledger ? ledger.hunger : (state.needs ? state.needs.hunger : 100);
  const boredom = ledger ? ledger.boredom : (state.needs ? state.needs.boredom : 100);
  const mood = ledger ? ledger.mood : (state.needs ? state.needs.mood : 60);
  const plague = ledger ? ledger.plague : (state.needs ? state.needs.plague : 10);
  const trust = ledger ? (ledger.trust || 0) : 0;
  const mode = ledger ? (ledger.relationshipMode || 'observing') : 'observing';

  const plagueStage = getPlagueStage(plague);
  const isCritical = hunger <= 25 || boredom <= 25 || mood <= 25;
  const isMoodLow = mood <= 40;
  const isWithdrawn = mode === 'withdrawn';
  const isBonded = mode === 'bonded' && !isCritical && plagueStage === 0;
  const isInvested = mode === 'invested' && !isCritical && plagueStage === 0;

  if (plagueStage >= 2) return 'rgba(180, 80, 255, 0.32)';
  if (plagueStage === 1) return 'rgba(140, 60, 200, 0.20)';

  if (isCritical) return 'rgba(220, 50, 50, 0.28)';

  if (isWithdrawn) return 'rgba(180, 40, 40, 0.18)';

  if (isMoodLow) return 'rgba(200, 100, 40, 0.20)';

  if (isBonded) return 'rgba(255, 200, 80, 0.22)';

  if (isInvested) return 'rgba(80, 160, 255, 0.18)';

  if (mode === 'present') return 'rgba(200, 220, 255, 0.12)';

  const hex = (pal.color || '#8a8a8a').replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.14)`;
}

function applyPalFrameAccent(frame, pal, state) {
  if (!frame || !pal) return;
  const glowColor = getPalGlowColor(pal, state);
  frame.style.setProperty('--pal-accent', glowColor);
  const accentHost = frame.closest('.pal-panel, .collection-card');
  if (accentHost) {
    accentHost.style.setProperty('--pal-accent', glowColor);
  }
}

function applyPalPlaceholder(placeholder, pal) {
  if (!placeholder || !pal) {
    return;
  }

  placeholder.textContent = pal.name.toUpperCase();
  placeholder.style.background = pal.color || '#8a8a8a';
}

function getPalOutfitById(outfitId) {
  if (!outfitId || typeof PAL_OUTFITS === 'undefined') return null;
  return PAL_OUTFITS.find((entry) => entry.id === outfitId) || null;
}

function getPalOutfitsForPal(palId) {
  if (!palId || typeof PAL_OUTFITS === 'undefined') return [];
  return PAL_OUTFITS.filter((entry) => entry.palId === palId);
}

function getPalOutfitAssetPath(outfit) {
  if (!outfit || !outfit.palId || !outfit.slug) return '';
  return `../assets/pals/outfits/${outfit.palId}-outfit-${outfit.slug}.png`;
}

/* ---- FOOD / PANTRY (scaffolding) -------------------------------------
   Mirrors the wardrobe helpers. Pal pantry is `state.palPantry[palId]`,
   an array of `{ itemId, qty }` rows. Items reference FOOD_CATALOG. */
function getFoodById(itemId) {
  if (!itemId || typeof FOOD_CATALOG === 'undefined') return null;
  return FOOD_CATALOG.find((entry) => entry.id === itemId) || null;
}

function getFoodAssetPath(food) {
  if (!food || !food.slug) return '';
  return `../assets/food/${food.slug}.png`;
}

function getPantryRowsForPal(state, palId) {
  if (!state || !palId || !state.palPantry || !Array.isArray(state.palPantry[palId])) return [];
  return state.palPantry[palId].filter((row) => row && row.itemId && (row.qty || 0) > 0);
}

function getPantryTotalForPal(state, palId) {
  return getPantryRowsForPal(state, palId).reduce((acc, row) => acc + (row.qty || 0), 0);
}

/* Pick the food the pal would eat next: prefer items where this pal is in
   palPreference, otherwise the first stocked item. Returns null if empty. */
function pickFoodToEat(state, palId) {
  const rows = getPantryRowsForPal(state, palId);
  if (!rows.length) return null;
  const preferred = rows.find((row) => {
    const food = getFoodById(row.itemId);
    return food && Array.isArray(food.palPreference) && food.palPreference.indexOf(palId) !== -1;
  });
  return preferred || rows[0];
}

/* ---- TOYS / TOYBOX (scaffolding) ------------------------------------
   Toys are durable like wardrobe items: owning one means the pal can
   auto-play with it forever. State shape: `state.palToybox[palId]` is
   an array of toy IDs (strings). */
function getToyById(itemId) {
  if (!itemId || typeof TOY_CATALOG === 'undefined') return null;
  return TOY_CATALOG.find((entry) => entry.id === itemId) || null;
}

function getToyAssetPath(toy) {
  if (!toy || !toy.slug) return '';
  return `../assets/toys/${toy.slug}.png`;
}

function getToyboxIdsForPal(state, palId) {
  if (!state || !palId || !state.palToybox || !Array.isArray(state.palToybox[palId])) return [];
  return state.palToybox[palId].filter((id) => typeof id === 'string' && !!getToyById(id));
}

function getToyboxTotalForPal(state, palId) {
  return getToyboxIdsForPal(state, palId).length;
}

/* Pick the toy the pal would play with next: prefer one where the pal is
   in palPreference; otherwise pick the first owned toy. Returns null
   when the toybox is empty. */
function pickToyToPlay(state, palId) {
  const ids = getToyboxIdsForPal(state, palId);
  if (!ids.length) return null;
  const preferredId = ids.find((id) => {
    const toy = getToyById(id);
    return toy && Array.isArray(toy.palPreference) && toy.palPreference.indexOf(palId) !== -1;
  });
  return getToyById(preferredId || ids[0]);
}

function applyPalOutfitOverlay(frame, palId, outfitId) {
  if (!frame) return;
  const overlay = frame.querySelector('[data-pal-outfit-overlay]');
  if (!overlay) return;
  const outfit = getPalOutfitById(outfitId);
  if (!outfit || outfit.palId !== palId) {
    overlay.hidden = true;
    overlay.removeAttribute('src');
    return;
  }
  const path = getPalOutfitAssetPath(outfit);
  if (overlay.getAttribute('src') !== path) {
    overlay.setAttribute('src', path);
  }
  overlay.alt = `${outfit.name || 'Outfit'} overlay`;
  overlay.hidden = false;
}

function updateImageState(frame, image, placeholder) {
  if (!frame || !image || !placeholder) {
    return;
  }

  const showImage = image.complete && image.naturalWidth > 0;
  frame.classList.toggle('has-image', showImage);
  image.hidden = !showImage;
  placeholder.hidden = showImage;

  if (image.src && image.src !== window.location.href) {
    placeholder.style.display = showImage ? 'none' : '';
  }
}

function normalizeAssetSlug(value) {
  return String(value || '')
    .trim()
    .replace(/^\.\.\//, '')
    .replace(/^assets\/ui\/items\//, '')
    .replace(/^assets\/ui\/pals\//, '')
    .replace(/^assets\/ui\/ships\//, '')
    .replace(/^assets\/pals\//, '')
    .replace(/_portrait\.png$/, '')
    .replace(/_ship\.png$/, '')
    .replace(/-ship-front\.png$/, '')
    .replace(/-og\.png$/, '')
    .replace(/\.png$/, '');
}

function loadPalImage(slug, type = 'portrait') {
  return loadImageFromCandidates(getAssetCandidates(slug, type), type);
}

function bindResolvedImage(image, frame, placeholder, slug, type = 'portrait', shipNote) {
  if (!image || !frame || !placeholder) {
    return;
  }

  const syncResolvedImageState = () => {
    updateImageState(frame, image, placeholder);

    if (shipNote) {
      const showShipNote = frame.classList.contains('is-ship-fallback') && image.complete && image.naturalWidth > 0;
      shipNote.hidden = !showShipNote;
    }
  };

  image.onload = syncResolvedImageState;
  image.onerror = () => {
    frame.classList.remove('has-image');
    frame.classList.remove('is-ship-fallback');
    image.hidden = true;
    placeholder.hidden = false;

    if (shipNote) {
      shipNote.hidden = true;
    }

    updateImageState(frame, image, placeholder);
  };

  image.hidden = true;
  if (shipNote) {
    shipNote.hidden = true;
  }

  loadPalImage(slug, type).then((result) => {
    const showImage = Boolean(result.src);
    frame.classList.toggle('has-image', showImage);
    frame.classList.toggle('is-ship-fallback', showImage && result.kind === 'ship');
    placeholder.hidden = showImage;
    image.hidden = !showImage;

    if (showImage) {
      image.src = result.src;
    } else {
      image.removeAttribute('src');
    }

    syncResolvedImageState();
  });
}

function getPalBySlug(slug) {
  const normalizedSlug = normalizeAssetSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  if (typeof PAL_DATA !== 'undefined') {
    const palMatch = Object.values(PAL_DATA).find((pal) => pal.slug === normalizedSlug || pal.id === normalizedSlug);
    if (palMatch) {
      return palMatch;
    }
  }

  if (typeof PALS === 'undefined') {
    return null;
  }

  return PALS.find((pal) => pal.slug === normalizedSlug || pal.id === normalizedSlug) || null;
}

function toRelativeAssetPath(assetPath) {
  if (!assetPath) {
    return null;
  }

  return `../${String(assetPath)
    .trim()
    .replace(/^\.\.\//, '')
    .replace(/^\//, '')}`;
}

function dedupeAssetCandidates(candidates) {
  const seen = new Set();

  return candidates.filter((candidate) => {
    if (!candidate || !candidate.src || seen.has(candidate.src)) {
      return false;
    }

    seen.add(candidate.src);
    return true;
  });
}

function loadImageFromCandidates(candidates, defaultKind = 'generic') {
  return new Promise((resolve) => {
    if (!candidates.length || typeof Image === 'undefined') {
      resolve({ src: null, kind: defaultKind, usedFallback: false });
      return;
    }

    const tryCandidate = (index) => {
      if (index >= candidates.length) {
        resolve({ src: null, kind: defaultKind, usedFallback: true });
        return;
      }

      const candidate = candidates[index];
      const probe = new Image();
      probe.onload = () => resolve({ src: candidate.src, kind: candidate.kind || defaultKind, usedFallback: index > 0 });
      probe.onerror = () => tryCandidate(index + 1);
      probe.src = candidate.src;
    };

    tryCandidate(0);
  });
}

function getStaticAssetCandidates(assetPath, fallbackPaths = [], kind = 'generic') {
  return dedupeAssetCandidates([
    assetPath,
    ...fallbackPaths,
  ].map((candidatePath) => {
    const src = toRelativeAssetPath(candidatePath);
    return src ? { src, kind } : null;
  }));
}

function getAssetCandidates(slug, type = 'portrait') {
  const normalizedSlug = normalizeAssetSlug(slug);
  const directAssetPath = String(slug || '').includes('/') ? toRelativeAssetPath(slug) : null;
  const pal = getPalBySlug(normalizedSlug);
  const basePortraitPath = normalizedSlug ? `../assets/pals/base-pals/${normalizedSlug}.png` : null;
  const palShipLibraryPath = normalizedSlug ? `../assets/ships/pal-ships/${normalizedSlug}-ship-front.png` : null;
  const folderShipPath = normalizedSlug ? `../assets/pals/${normalizedSlug}/${normalizedSlug}-ship-front.png` : null;
  const flatShipPath = normalizedSlug ? `../assets/pals/${normalizedSlug}-ship-front.png` : null;
  const folderPortraitPath = normalizedSlug ? `../assets/pals/${normalizedSlug}/${normalizedSlug}-og.png` : null;
  const flatPortraitPath = normalizedSlug ? `../assets/pals/${normalizedSlug}-og.png` : null;

  if (!normalizedSlug) {
    return directAssetPath ? [{ src: directAssetPath, kind: type }] : [];
  }

  if (type === 'item') {
    const itemBlueprint = typeof ITEM_CATALOG === 'undefined'
      ? null
      : ITEM_CATALOG.find((item) => item.id === normalizedSlug || normalizeAssetSlug(item.image_ref) === normalizedSlug);

    return dedupeAssetCandidates([
      { src: directAssetPath, kind: 'item' },
      { src: toRelativeAssetPath(itemBlueprint && itemBlueprint.image_ref), kind: 'item' },
      { src: `../assets/ui/items/${normalizedSlug}.png`, kind: 'item' },
    ]);
  }

  if (type === 'ship') {
    return dedupeAssetCandidates([
      { src: directAssetPath, kind: 'ship' },
      { src: toRelativeAssetPath(pal && pal.ship_image_ref), kind: 'ship' },
      { src: toRelativeAssetPath(pal && pal.image), kind: 'ship' },
      { src: `../assets/ui/ships/${normalizedSlug}_ship.png`, kind: 'ship' },
      { src: palShipLibraryPath, kind: 'ship' },
      { src: folderShipPath, kind: 'ship' },
      { src: flatShipPath, kind: 'ship' },
    ]);
  }

  return dedupeAssetCandidates([
    { src: directAssetPath, kind: 'portrait' },
    { src: toRelativeAssetPath(pal && pal.portrait_image_ref), kind: 'portrait' },
    { src: `../assets/ui/pals/${normalizedSlug}_portrait.png`, kind: 'portrait' },
    { src: basePortraitPath, kind: 'portrait' },
    { src: toRelativeAssetPath(pal && pal.ship_image_ref), kind: 'ship' },
    { src: `../assets/ui/ships/${normalizedSlug}_ship.png`, kind: 'ship' },
    { src: toRelativeAssetPath(pal && pal.image), kind: 'ship' },
    { src: palShipLibraryPath, kind: 'ship' },
    { src: folderShipPath, kind: 'ship' },
    { src: flatShipPath, kind: 'ship' },
    { src: folderPortraitPath, kind: 'portrait' },
    { src: flatPortraitPath, kind: 'portrait' },
  ]);
}

function bindStaticAssetImage(image, frame, placeholder, assetPath, fallbackPaths = []) {
  if (!image || !frame || !placeholder) {
    return;
  }

  const requestId = String(Date.now() + Math.random());
  image.dataset.assetRequestId = requestId;

  const syncResolvedImageState = () => {
    updateImageState(frame, image, placeholder);
  };

  image.onload = syncResolvedImageState;
  image.onerror = () => {
    frame.classList.remove('has-image');
    image.hidden = true;
    placeholder.hidden = false;
    updateImageState(frame, image, placeholder);
  };

  image.hidden = true;

  loadImageFromCandidates(getStaticAssetCandidates(assetPath, fallbackPaths)).then((result) => {
    if (image.dataset.assetRequestId !== requestId) {
      return;
    }

    const showImage = Boolean(result.src);
    frame.classList.toggle('has-image', showImage);
    placeholder.hidden = showImage;
    image.hidden = !showImage;

    if (showImage) {
      image.src = result.src;
    } else {
      image.removeAttribute('src');
    }

    syncResolvedImageState();
  });
}

function getPalBrandAssetPath(palId) {
  if (!palId) {
    return 'assets/site-ui/banner-default-2.png';
  }

  if (palId === 'ahote') {
    return 'assets/site-ui/ahote-logo.png';
  }

  if (palId === 'brutus') {
    return 'assets/site-ui/brutus-logo.png';
  }

  return `assets/site-ui/${palId}-logo-pattern.png`;
}

function applyScreenBrandArt(root, palId) {
  if (!root) {
    return;
  }

  root.style.setProperty('--screen-brand-image', `url("${toRelativeAssetPath(getPalBrandAssetPath(palId))}")`);
}

function getCloneDossierAssetData(state, pal, variant) {
  if (variant) {
    const tierMap = {
      stable: 'assets/cloning/cloning-explanation-6.png',
      minor: 'assets/cloning/cloning-explanation-4.png',
      major: 'assets/cloning/cloning-explanation-9.png',
      severe: 'assets/cloning/cloning-explanation-11.png',
      void: 'assets/cloning/cloning-explanation-13.png',
    };

    return {
      assetPath: tierMap[variant.tier] || 'assets/cloning/cloning-explanation-8.png',
      fallbackPaths: ['assets/cloning/cloning-explanation-8.png', 'assets/cloning/cloning-explanation-3.png'],
      copy: variant.note || `${pal.name} produced a fresh disagreement with the source material.`,
      note: `REVEAL // ${(variant.tier || 'stable').toUpperCase()}`,
    };
  }

  if (state.clone.activeCycle) {
    return {
      assetPath: 'assets/cloning/cloning-explanation-3.png',
      fallbackPaths: ['assets/cloning/cloning-explanation-2.png'],
      copy: `Cycle active. ${pal.name} and the chamber are negotiating a new error state.`,
      note: 'CYCLE ACTIVE',
    };
  }

  if ((state.clone.history || []).length) {
    return {
      assetPath: 'assets/cloning/cloning-explanation-7.png',
      fallbackPaths: ['assets/cloning/cloning-explanation-5.png'],
      copy: `Archive populated. ${pal.name}'s lineage already contains documented drift.`,
      note: 'ARCHIVE READY',
    };
  }

  return {
    assetPath: 'assets/cloning/cloning-explanation-1.png',
    fallbackPaths: ['assets/cloning/cloning-explanation-2.png'],
    copy: `No stored clones yet. The chamber is still pretending this is a controlled process.`,
    note: 'BASELINE',
  };
}

function getLabAdventureAssetData(pal, basePal) {
  const adventureMap = {
    brutus: {
      assetPath: 'assets/gifs/b-idle.gif',
      fallbackPaths: [
        'assets/adventure/campaign/playback/brutus/background/moon-brau.png',
        'assets/adventure/campaign/playback/brutus/background/sky-bg-0.png',
      ],
      copy: 'Busru playback recovered. Brutus appears to be moving only because the file insists on it.',
      tag: 'BUSRU CAMPAIGN',
    },
    elbjorg: {
      assetPath: 'assets/adventure/campaign/playback/elbjorg/background-coin-catcher/eadin.png',
      fallbackPaths: [
        'assets/adventure/campaign/playback/elbjorg/background-coin-catcher/flower-bg-8.png',
        'assets/adventure/campaign/playback/elbjorg/background-coin-catcher/sky-bg-1.png',
      ],
      copy: 'Einlin field footage recovered. Elbjorg still chooses fortified scenery over comfort.',
      tag: 'EINLIN PLAYBACK',
    },
    centrama: {
      assetPath: 'assets/adventure/campaign/playback/centrama/background/moon-carea.png',
      fallbackPaths: [],
      copy: 'Coonsa telemetry captured one stable frame. Even the moon looks uncertain.',
      tag: 'COONSA FEED',
    },
    veruca: {
      assetPath: 'assets/adventure/campaign/playback/veruca/background/vix.png',
      fallbackPaths: [],
      copy: 'Vaxa archive stills found. The moon remains judgmental in high resolution.',
      tag: 'VAXA FEED',
    },
  };

  const directMatch = adventureMap[pal.id] || (basePal && adventureMap[basePal.id]);
  if (directMatch) {
    return directMatch;
  }

  const orbitFallback = (typeof PLANETS === 'undefined' ? [] : PLANETS).find((planet) => planet.name === pal.planet || planet.id === String(pal.planet || '').toLowerCase());
  return {
    assetPath: orbitFallback && orbitFallback.image ? orbitFallback.image : 'assets/site-ui/banner-default-2.png',
    fallbackPaths: ['assets/site-ui/banner-default-2.png'],
    copy: `${pal.name}'s campaign files are incomplete, so the lab fell back to orbital records instead.`,
    tag: orbitFallback ? `${orbitFallback.name.toUpperCase()} ORBIT` : 'ARCHIVE FALLBACK',
  };
}

/**
 * Resolves the visual state name for a Pal based on ledger flags + frame classes.
 * Returns one of: 'ghost', 'death', 'icky-1', 'icky-2', 'icky-3',
 * 'sleep', 'poke', 'happy', 'stare', or 'default'.
 * Priority order: persistent states (ghost, death, plague) take precedence over
 * transient frame-class states (poke, happy, sleep, stare).
 */
function resolveActivePalSpriteStateName(activeLedger, frame) {
  if (!activeLedger) {
    return 'default';
  }

  if (activeLedger.isGhost) {
    return 'ghost';
  }

  if (activeLedger.isDying) {
    return 'death';
  }

  // Plague stage derived from plague value (0-100 -> 0/1/2/3)
  if (typeof getPlagueStage === 'function') {
    const plagueValue = activeLedger.plague || 0;
    const plagueStage = getPlagueStage(plagueValue);
    if (plagueStage === 1) return 'icky-1';
    if (plagueStage === 2) return 'icky-2';
    if (plagueStage === 3) return 'icky-3';
  }

  // Transient frame-class states (set by needs.js, poke.js, etc.)
  if (frame && frame.classList) {
    if (frame.classList.contains('is-poked')) return 'poke';
    if (frame.classList.contains('is-happy')) return 'happy';
    if (frame.classList.contains('is-sleeping')) return 'sleep';
    if (frame.classList.contains('is-staring')) return 'stare';
  }

  return 'default';
}

/**
 * Builds the candidate path list for a state-aware Pal portrait.
 * Tries the state-specific PNG first (e.g. ahote-sleep.png), falls back to
 * the base PNG (e.g. ahote.png) if the state-specific file does not exist.
 * Returns deduped list of {src, kind} objects.
 */
function buildActivePalSpriteCandidates(palId, stateName) {
  if (!palId) {
    return [];
  }

  const candidates = [];

  // Try state-specific PNG first (skip for default state)
  if (stateName && stateName !== 'default') {
    candidates.push({
      src: '../assets/pals/base-pals/' + palId + '-' + stateName + '.png',
      kind: 'portrait',
    });
  }

  // Always fall back to base portrait
  candidates.push({
    src: '../assets/pals/base-pals/' + palId + '.png',
    kind: 'portrait',
  });

  return dedupeAssetCandidates(candidates);
}

/**
 * Sets the Pal portrait image src based on the active Pal's current state.
 * Called by renderHome and renderCare. Uses an async candidate-loading pattern
 * with a requestId to handle race conditions when state changes rapidly.
 * Falls back to the base portrait PNG when state-specific files do not exist
 * (e.g. for Pals other than Ahote, where only the base PNG is drawn).
 */
function bindActivePalSpriteImage(image, frame, placeholder, palId, state, shipNote) {
  if (!image || !frame || !placeholder || !palId || !state) {
    return;
  }

  const activeLedger = (state.palMoodLedger || {})[palId] || {};
  const stateName = resolveActivePalSpriteStateName(activeLedger, frame);

  // Short-circuit: skip the work entirely if nothing has changed since last render.
  // renderCare runs every CARE_REFRESH_INTERVAL ms (1000ms) - without this guard,
  // we re-load the image every second, causing visible flash + disrupting CSS
  // animations like the eyelid blink owned by poke.js.
  const stateKey = palId + ':' + stateName;
  if (image.dataset.activePalStateKey === stateKey) {
    return;
  }

  const candidates = buildActivePalSpriteCandidates(palId, stateName);
  if (!candidates.length) {
    return;
  }

  // Mark the new state-key BEFORE the async load. If a later render fires while
  // this load is in-flight with a different stateKey, the .then() guard below
  // will see the mismatch and abort.
  image.dataset.activePalStateKey = stateKey;
  const requestId = String(Date.now() + Math.random());
  image.dataset.assetRequestId = requestId;

  loadImageFromCandidates(candidates, 'portrait').then((result) => {
    // Abort if a newer request superseded this one
    if (image.dataset.assetRequestId !== requestId) {
      return;
    }

    const showImage = Boolean(result && result.src);
    frame.classList.toggle('has-image', showImage);
    placeholder.hidden = showImage;
    image.hidden = !showImage;

    if (showImage) {
      // Defensive: only assign src if it actually differs, to avoid spurious
      // browser repaints even in edge cases where stateKey somehow matched.
      if (image.src !== result.src) {
        image.src = result.src;
      }
    } else {
      // No candidate loaded - clear src AND clear the state-key so the next
      // call retries (we don't want to permanently cache a failed lookup).
      image.removeAttribute('src');
      delete image.dataset.activePalStateKey;
    }

    if (typeof updateImageState === 'function') {
      updateImageState(frame, image, placeholder);
    }
  });
}
