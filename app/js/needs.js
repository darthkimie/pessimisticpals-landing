function getMoodDisplayState(mood) {
  if (mood < 25) {
    return 'despairing';
  }

  if (mood < 50) {
    return 'gloomy';
  }

  if (mood < 70) {
    return 'unbothered';
  }

  return 'reluctantly okay';
}

function applyOwnedPalDecay(state, now = Date.now()) {
  const baseline = typeof state.care.lastNeedUpdate === 'number' ? state.care.lastNeedUpdate : now;
  const elapsedMs = Math.max(0, now - baseline);

  if (elapsedMs < 15000) {
    return {
      ...state,
      care: {
        ...state.care,
        lastNeedUpdate: baseline,
      },
    };
  }

  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const nextLedger = {
    ...state.palMoodLedger,
  };

  (state.ownedPals || []).forEach((palId) => {
    const pal = getPalById(palId);
    const entry = nextLedger[palId];

    if (!pal || !entry || entry.isDead) {
      return;
    }

    const bestPalName = pal.bestPal || null;
    const bestPalEntry = bestPalName
      ? (typeof PALS !== 'undefined' ? [] : PALS).find(
        (p) => p.name === bestPalName && (state.ownedPals || []).includes(p.id)
      )
      : null;
    const companionBonus = bestPalEntry ? 0.15 : 0;
    const pessimismFactor = 1 + ((pal.pessimism || 0) / 20);
    const hasContagiousPal = (state.ownedPals || []).some((otherId) => {
      if (otherId === palId) return false;
      const otherEntry = state.palMoodLedger[otherId];
      return otherEntry && !otherEntry.isDead && getPlagueStage(otherEntry.plague || 0) >= 2;
    });

    const plagueBaseRate = (state.constellations && state.constellations.elbjorg)
      ? NEED_DECAY_PER_HOUR.plague * 0.8
      : NEED_DECAY_PER_HOUR.plague;

    const plagueRate = hasContagiousPal
      ? plagueBaseRate * PLAGUE_CONTAGION_MULTIPLIER
      : plagueBaseRate;
    // Still Water effect - skip decay if active for this pal
    const stillWaterUntil = entry.stillWaterUntil || 0;
    if (stillWaterUntil > now) {
      return;
    }
    nextLedger[palId] = {
      ...entry,
      hunger: clampNumber(entry.hunger - elapsedHours * NEED_DECAY_PER_HOUR.hunger * pessimismFactor * (1 - companionBonus), 0, 100),
      boredom: clampNumber(entry.boredom - elapsedHours * NEED_DECAY_PER_HOUR.boredom * pessimismFactor * (1 - companionBonus), 0, 100),
      mood: clampNumber(entry.mood - elapsedHours * NEED_DECAY_PER_HOUR.mood * pessimismFactor * (1 - companionBonus), 0, MAX_RELUCTANT_MOOD),
      plague: clampNumber(entry.plague + elapsedHours * plagueRate, 0, 100),
      lastMoodSyncDate: getLocalDateKey(new Date(now)),
    };
  });

  // Activity events emitted during this decay tick. Appended at the end so
  // we keep state shape changes co-located with the activityLog mutation.
  const activityEvents = [];
  const wasDistressed = {};
  Object.keys(state.palMoodLedger || {}).forEach((id) => {
    const e = state.palMoodLedger[id];
    if (!e) return;
    wasDistressed[id] = !e.isDead && ((e.hunger || 0) <= 30 || (e.mood || 0) <= 30 || (e.plague || 0) >= 60);
  });

  // Auto-eat (scaffolding): once decay is applied, any pal whose hunger has
  // dropped below AUTO_EAT_THRESHOLD will consume stocked pantry items on
  // their own until they reach a target in [AUTO_EAT_TARGET_MIN, AUTO_EAT_TARGET_MAX].
  const AUTO_EAT_THRESHOLD = 50;
  const AUTO_EAT_TARGET_MIN = 75;
  const AUTO_EAT_TARGET_MAX = 85;
  const EMPTY_SUPPLY_HINT_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
  const nextPantry = { ...(state.palPantry || {}) };
  let pantryChanged = false;
  // Track running gloom balance so consecutive auto-shops in the same tick
  // don't all read the original gloom amount.
  let gloomBalance = (state.gloom || 0);
  const todayKey = (typeof getLocalDateKey === 'function')
    ? getLocalDateKey(new Date(now))
    : '';
  const PANTRY_AUTO_COST = (typeof PANTRY_TRIP_COST !== 'undefined') ? PANTRY_TRIP_COST : 30;
  const TOYBOX_AUTO_COST = (typeof TOYBOX_TRIP_COST !== 'undefined') ? TOYBOX_TRIP_COST : 40;
  Object.keys(nextLedger).forEach((palId) => {
    const fed = nextLedger[palId];
    if (!fed || fed.isDead) return;
    if ((fed.hunger || 0) > AUTO_EAT_THRESHOLD) return;
    let palRows = Array.isArray(nextPantry[palId]) ? nextPantry[palId] : [];

    // Auto-shop pantry on empty (per-pal opt-in + budget gated).
    if (!palRows.length && fed.autoShopEnabled && typeof getDailyShopRotation === 'function') {
      const dailyBudget = Math.max(0, Number(fed.autoShopDailyBudget) || 0);
      const rolloverEntry = (fed.autoShopSpentDate !== todayKey)
        ? { ...fed, autoShopSpentDate: todayKey, autoShopSpentToday: 0 }
        : fed;
      const spentToday = Math.max(0, Number(rolloverEntry.autoShopSpentToday) || 0);
      const canAffordBudget = dailyBudget - spentToday >= PANTRY_AUTO_COST;
      const canAffordGloom = gloomBalance >= PANTRY_AUTO_COST;
      const rotation = getDailyShopRotation('food', todayKey);
      if (canAffordBudget && canAffordGloom && rotation.length) {
        const preferred = rotation.filter((f) => Array.isArray(f.palPreference) && f.palPreference.indexOf(palId) !== -1);
        const haulSize = Math.min(2, rotation.length);
        const picks = [];
        for (let i = 0; i < haulSize; i++) {
          const pool = (preferred.length && Math.random() < 0.6) ? preferred : rotation;
          picks.push(pool[Math.floor(Math.random() * pool.length)]);
        }
        const restocked = [];
        picks.forEach((food) => {
          const found = restocked.find((r) => r.itemId === food.id);
          if (found) { found.qty += 1; } else { restocked.push({ itemId: food.id, qty: 1 }); }
        });
        nextPantry[palId] = restocked;
        palRows = restocked;
        pantryChanged = true;
        gloomBalance -= PANTRY_AUTO_COST;
        nextLedger[palId] = {
          ...rolloverEntry,
          autoShopSpentToday: spentToday + PANTRY_AUTO_COST,
        };
        const palName = (typeof getPalById === 'function') && getPalById(palId) ? getPalById(palId).name : palId;
        const haulSummary = picks.map((f) => f.name).join(', ');
        activityEvents.push({
          palId: palId,
          type: 'shop',
          ts: now,
          system: palName + ' auto-shopped pantry: ' + haulSummary + '.',
          quote: 'Restocking on their own.',
          deltas: { gloom: -PANTRY_AUTO_COST },
          link: 'care',
        });
      }
    }

    if (!palRows.length) {
      // Pantry empty — emit a hint at most once per cooldown window so the
      // user can see WHY auto-eat isn't firing.
      const lastWarn = fed.lastEmptyPantryWarn || 0;
      if (now - lastWarn >= EMPTY_SUPPLY_HINT_COOLDOWN_MS) {
        nextLedger[palId] = { ...fed, lastEmptyPantryWarn: now };
        const palName = (typeof getPalById === 'function') && getPalById(palId) ? getPalById(palId).name : palId;
        activityEvents.push({
          palId: palId,
          type: 'distress',
          ts: now,
          system: palName + ' is hungry but the pantry is empty.',
          quote: 'Send them shopping.',
          link: 'care',
        });
      }
      return;
    }
    const pickedRow = (typeof pickFoodToEat === 'function')
      ? pickFoodToEat({ palPantry: nextPantry }, palId)
      : palRows.find((row) => row && row.qty > 0);
    if (!pickedRow) return;
    // Eat repeatedly until hunger reaches the target window or pantry runs
    // dry. Each loop picks the next available item via the same selector so
    // preferences keep applying.
    const target = AUTO_EAT_TARGET_MIN + Math.floor(Math.random() * (AUTO_EAT_TARGET_MAX - AUTO_EAT_TARGET_MIN + 1));
    let workingRows = palRows.slice();
    let workingHunger = fed.hunger || 0;
    const eatenLog = [];
    let lastFood = null;
    let safety = 12; // hard cap to avoid runaway loops
    while (workingHunger < target && safety-- > 0) {
      const nextPick = (typeof pickFoodToEat === 'function')
        ? pickFoodToEat({ palPantry: { ...nextPantry, [palId]: workingRows } }, palId)
        : workingRows.find((row) => row && row.qty > 0);
      if (!nextPick) break;
      const eatenFood = (typeof getFoodById === 'function') ? getFoodById(nextPick.itemId) : null;
      if (!eatenFood) break;
      workingRows = workingRows
        .map((row) => row.itemId === nextPick.itemId ? { ...row, qty: row.qty - 1 } : row)
        .filter((row) => row && row.qty > 0);
      workingHunger = clampNumber(workingHunger + (eatenFood.hungerRestore || 0), 0, 100);
      eatenLog.push(eatenFood);
      lastFood = eatenFood;
    }
    if (!lastFood) return;
    nextPantry[palId] = workingRows;
    pantryChanged = true;
    const beforeHunger = fed.hunger || 0;
    const afterHunger = workingHunger;
    nextLedger[palId] = {
      ...fed,
      hunger: afterHunger,
      lastAutoEat: { itemId: lastFood.id, name: lastFood.name, at: now },
    };
    const palName = (typeof getPalById === 'function') && getPalById(palId) ? getPalById(palId).name : palId;
    const summary = eatenLog.length === 1
      ? lastFood.name
      : eatenLog.map((f) => f.name).join(', ');
    activityEvents.push({
      palId: palId,
      type: 'food',
      ts: now,
      system: palName + ' ate ' + summary + '.',
      quote: lastFood.quote || '',
      itemId: lastFood.id,
      itemSlug: lastFood.slug || '',
      deltas: { hunger: Math.round(afterHunger - beforeHunger) },
    });
  });

  // Auto-play (scaffolding): if boredom drops below AUTO_PLAY_THRESHOLD and
  // the pal owns a toy, they grab one (preferred first) and play repeatedly
  // (toys are durable) until boredom reaches the target window.
  const AUTO_PLAY_THRESHOLD = 50;
  const AUTO_PLAY_TARGET_MIN = 75;
  const AUTO_PLAY_TARGET_MAX = 85;
  const nextToybox = { ...(state.palToybox || {}) };
  let toyboxChanged = false;
  Object.keys(nextLedger).forEach((palId) => {
    const ent = nextLedger[palId];
    if (!ent || ent.isDead) return;
    if ((ent.boredom || 0) > AUTO_PLAY_THRESHOLD) return;
    let ids = Array.isArray(nextToybox[palId]) ? nextToybox[palId] : [];

    // Auto-shop toybox on empty (per-pal opt-in + budget gated).
    if (!ids.length && ent.autoShopEnabled && typeof getDailyShopRotation === 'function') {
      const dailyBudget = Math.max(0, Number(ent.autoShopDailyBudget) || 0);
      const rolloverEntry = (ent.autoShopSpentDate !== todayKey)
        ? { ...ent, autoShopSpentDate: todayKey, autoShopSpentToday: 0 }
        : ent;
      const spentToday = Math.max(0, Number(rolloverEntry.autoShopSpentToday) || 0);
      const canAffordBudget = dailyBudget - spentToday >= TOYBOX_AUTO_COST;
      const canAffordGloom = gloomBalance >= TOYBOX_AUTO_COST;
      const rotation = getDailyShopRotation('toy', todayKey);
      if (canAffordBudget && canAffordGloom && rotation.length) {
        const preferred = rotation.filter((t) => Array.isArray(t.palPreference) && t.palPreference.indexOf(palId) !== -1);
        const pool = (preferred.length && Math.random() < 0.6) ? preferred : rotation;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (pick) {
          nextToybox[palId] = [pick.id];
          ids = [pick.id];
          toyboxChanged = true;
          gloomBalance -= TOYBOX_AUTO_COST;
          nextLedger[palId] = {
            ...rolloverEntry,
            autoShopSpentToday: spentToday + TOYBOX_AUTO_COST,
          };
          const palName = (typeof getPalById === 'function') && getPalById(palId) ? getPalById(palId).name : palId;
          activityEvents.push({
            palId: palId,
            type: 'shop',
            ts: now,
            system: palName + ' auto-shopped a toy: ' + pick.name + '.',
            quote: 'Boredom solved (briefly).',
            itemId: pick.id,
            itemSlug: pick.slug || '',
            deltas: { gloom: -TOYBOX_AUTO_COST },
            link: 'care',
          });
        }
      }
    }

    if (!ids.length) {
      const lastWarn = ent.lastEmptyToyboxWarn || 0;
      if (now - lastWarn >= EMPTY_SUPPLY_HINT_COOLDOWN_MS) {
        nextLedger[palId] = { ...ent, lastEmptyToyboxWarn: now };
        const palName = (typeof getPalById === 'function') && getPalById(palId) ? getPalById(palId).name : palId;
        activityEvents.push({
          palId: palId,
          type: 'distress',
          ts: now,
          system: palName + ' is bored but the toybox is empty.',
          quote: 'Send them shopping.',
          link: 'care',
        });
      }
      return;
    }
    const toy = (typeof pickToyToPlay === 'function')
      ? pickToyToPlay({ palToybox: nextToybox }, palId)
      : ((typeof getToyById === 'function') ? getToyById(ids[0]) : null);
    if (!toy) return;
    // Play repeatedly (toys are durable) until boredom reaches the target.
    const target = AUTO_PLAY_TARGET_MIN + Math.floor(Math.random() * (AUTO_PLAY_TARGET_MAX - AUTO_PLAY_TARGET_MIN + 1));
    const beforeBoredom = ent.boredom || 0;
    let workingBoredom = beforeBoredom;
    let lastToy = null;
    let safety = 12;
    while (workingBoredom < target && safety-- > 0) {
      const nextToy = (typeof pickToyToPlay === 'function')
        ? pickToyToPlay({ palToybox: nextToybox }, palId)
        : toy;
      if (!nextToy) break;
      workingBoredom = clampNumber(workingBoredom + (nextToy.moodRestore || 0), 0, 100);
      lastToy = nextToy;
      if (!nextToy.moodRestore) break; // avoid infinite loop on 0-restore toys
    }
    if (!lastToy) lastToy = toy;
    const afterBoredom = workingBoredom;
    nextLedger[palId] = {
      ...ent,
      boredom: afterBoredom,
      lastAutoPlay: { itemId: lastToy.id, name: lastToy.name, at: now },
    };
    const palName = (typeof getPalById === 'function') && getPalById(palId) ? getPalById(palId).name : palId;
    activityEvents.push({
      palId: palId,
      type: 'toy',
      ts: now,
      system: palName + ' played with ' + lastToy.name + '.',
      quote: lastToy.quote || '',
      itemId: lastToy.id,
      itemSlug: lastToy.slug || '',
      deltas: { boredom: Math.round(afterBoredom - beforeBoredom) },
    });
  });

  // Distress crossings (entered or recovered) for any owned, alive pal.
  Object.keys(nextLedger).forEach((palId) => {
    const ent = nextLedger[palId];
    if (!ent || ent.isDead) return;
    const isNow = (ent.hunger || 0) <= 30 || (ent.mood || 0) <= 30 || (ent.plague || 0) >= 60;
    const wasBefore = !!wasDistressed[palId];
    if (isNow === wasBefore) return;
    const palName = (typeof getPalById === 'function') && getPalById(palId) ? getPalById(palId).name : palId;
    if (isNow) {
      const reason = (ent.plague || 0) >= 60 ? 'plague rising'
        : (ent.hunger || 0) <= 30 ? 'starving'
        : 'low mood';
      activityEvents.push({
        palId: palId,
        type: 'distress',
        ts: now,
        system: palName + ' is in distress (' + reason + ').',
      });
    } else {
      activityEvents.push({
        palId: palId,
        type: 'relief',
        ts: now,
        system: palName + ' is no longer distressed.',
      });
    }
  });

  const activeEntry = state.activePal ? nextLedger[state.activePal] : null;
  const nextNeeds = activeEntry
    ? normalizeNeeds({
      hunger: activeEntry.hunger,
      boredom: activeEntry.boredom,
      mood: activeEntry.mood,
      plague: activeEntry.plague,
    })
    : state.needs;

  let nextState = {
    ...state,
    gloom: gloomBalance,
    palMoodLedger: nextLedger,
    palPantry: pantryChanged ? nextPantry : (state.palPantry || {}),
    palToybox: toyboxChanged ? nextToybox : (state.palToybox || {}),
    needs: nextNeeds,
    plagued: nextNeeds.plague >= PLAGUE_THRESHOLD,
    care: {
      ...state.care,
      lastNeedUpdate: now,
    },
  };
  if (activityEvents.length && typeof appendActivityToState === 'function') {
    activityEvents.forEach((ev) => { nextState = appendActivityToState(nextState, ev); });
  }
  return nextState;
}

function getPlagueStage(plagueValue) {
  if (plagueValue >= PLAGUE_STAGE_3) return 3;
  if (plagueValue >= PLAGUE_STAGE_2) return 2;
  if (plagueValue >= PLAGUE_STAGE_1) return 1;
  return 0;
}

function getPlagueStageLabel(plagueValue) {
  const stage = getPlagueStage(plagueValue);
  return {
    0: 'Clear',
    1: 'Icky Chill',
    2: 'Icky Fever',
    3: 'Full Ickysoul',
  }[stage];
}