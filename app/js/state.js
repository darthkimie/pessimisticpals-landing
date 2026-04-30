let appState;
let audioDeck = null;
let audioEffectsLastTriggeredAt = 0;

function applyActivePalSelection(currentState, palId) {
  const existingLedgerEntry = (currentState.palMoodLedger && currentState.palMoodLedger[palId]) || getDefaultPalMoodEntry(palId);
  const wasNewlyAdopted = !((currentState.ownedPals || []).includes(palId));
  let nextState = {
    ...currentState,
    activePal: palId,
    ownedPals: [...new Set([...(currentState.ownedPals || []), palId])],
    unlockedPals: [...new Set([...(currentState.unlockedPals || []), palId])],
    palMoodLedger: {
      ...currentState.palMoodLedger,
      [palId]: existingLedgerEntry.firstAssignedAt
        ? existingLedgerEntry
        : {
          ...existingLedgerEntry,
          firstAssignedAt: Date.now(),
        },
    },
  };

  if (currentState.constellations && currentState.constellations.centrama) {
    const ledgerEntry = nextState.palMoodLedger && nextState.palMoodLedger[palId];
    if (ledgerEntry && ledgerEntry.trust <= 10) {
      nextState = {
        ...nextState,
        palMoodLedger: {
          ...nextState.palMoodLedger,
          [palId]: { ...ledgerEntry, trust: 20 },
        },
      };
    }
  }

  if (palId === 'winta') {
    const wintaEntry = nextState.palMoodLedger.winta || getDefaultPalMoodEntry('winta');
    if (wintaEntry.wintaReturnGloomPending) {
      nextState = {
        ...nextState,
        gloom: nextState.gloom + 5,
        palMoodLedger: {
          ...nextState.palMoodLedger,
          winta: {
            ...wintaEntry,
            relationshipScore: clampNumber((wintaEntry.relationshipScore || 0) + 5, 0, 100),
            wintaReturnGloomPending: false,
          },
        },
      };
    }
  }

  nextState = checkUniqueBondedEvent(nextState, palId, currentState.activePal);

  if (wasNewlyAdopted && typeof appendActivityToState === 'function') {
    var pal = (typeof getPalById === 'function') ? getPalById(palId) : null;
    nextState = appendActivityToState(nextState, {
      palId: palId,
      type: 'threshold',
      system: (pal ? pal.name : palId) + ' joined the roster.',
      quote: 'A new entry in the care loop.',
      link: 'care',
    });
  }

  return nextState;
}

function prepareSessionState(state, date = new Date()) {
  const todayKey = getLocalDateKey(date);
  const previousOpenDate = state.meta.lastOpenDate;
  const openCountToday = previousOpenDate === todayKey ? state.meta.openCountToday + 1 : 1;
  const progressAnchorDate = getProgressAnchorDate(state);
  const brokeStreak = state.streak > 0 && progressAnchorDate && progressAnchorDate < getYesterdayKey();
  const openDateHistory = previousOpenDate === todayKey
    ? state.meta.openDateHistory
    : [...state.meta.openDateHistory, todayKey].slice(-21);

  let nextState = {
    ...state,
    meta: {
      ...state.meta,
      firstOpenDate: state.meta.firstOpenDate || todayKey,
      lastOpenDate: todayKey,
      openCount: state.meta.openCount + 1,
      openCountToday,
      openDateHistory,
      lastStreakBreakDate: brokeStreak ? todayKey : state.meta.lastStreakBreakDate,
    },
    streak: brokeStreak ? 0 : state.streak,
  };

  nextState = syncSeasonalEventState(nextState, date);
  nextState = syncPalNeglectAndMood(nextState, todayKey);
  nextState = updatePalTrust(nextState, todayKey);
  nextState = updateRelationshipOnSession(nextState, todayKey);
  nextState = checkUniqueBondedEvent(nextState, nextState.activePal);
  if (previousOpenDate !== todayKey) {
    nextState = updatePalCompatibility(nextState);
    const completed = getCompletedConstellations(nextState);
    const nextConstellations = { ...nextState.constellations };
    completed.forEach((palId) => {
      if (!nextConstellations[palId]) {
        nextConstellations[palId] = { unlockedDate: todayKey };
      }
    });
    nextState = { ...nextState, constellations: nextConstellations };
    nextState = applyCalendarOverduePressure(nextState, date);
  }
  nextState = rollDailyDisappointment(nextState, date);
  nextState = evaluateAntiAchievements(nextState, { type: 'app_open' });
  nextState = {
    ...nextState,
    tasks: nextState.tasks.filter((task) =>
      !(task.source === 'ghost' && task.ghostExpiresAt && Date.now() > task.ghostExpiresAt && !task.completed)
    ),
  };
  return nextState;
}

function ensureStateIntegrity(state) {
  const merged = {
    ...DEFAULT_STATE,
    ...(state || {}),
    dailyDisappointment: {
      ...DEFAULT_DAILY_DISAPPOINTMENT_STATE,
      ...((state && state.dailyDisappointment) || {}),
    },
    antiAchievements: {
      ...DEFAULT_ANTI_ACHIEVEMENT_STATE,
      ...((state && state.antiAchievements) || {}),
    },
    seasonalEvent: {
      ...DEFAULT_SEASONAL_EVENT_STATE,
      ...((state && state.seasonalEvent) || {}),
    },
    calendar: {
      ...DEFAULT_CALENDAR_STATE,
      ...((state && state.calendar) || {}),
    },
    homeCollapsed: {
      ...((state && state.homeCollapsed) || {}),
    },
    meta: {
      ...DEFAULT_META_STATE,
      ...((state && state.meta) || {}),
    },
    dailyCheckIn: {
      ...DEFAULT_STATE.dailyCheckIn,
      ...((state && state.dailyCheckIn) || {}),
    },
    needs: {
      ...DEFAULT_STATE.needs,
      ...((state && state.needs) || {}),
    },
    care: {
      ...DEFAULT_CARE_STATE,
      ...((state && state.care) || {}),
    },
  };

  merged.meta.onboardingSeen = Boolean(merged.meta.onboardingSeen ?? false);
  merged.meta.firstHomeSeen = Boolean(merged.meta.firstHomeSeen ?? false);

  merged.tasks = Array.isArray(merged.tasks) && merged.tasks.length
    ? merged.tasks.map(normalizeTask)
    : getStarterTasks();

  merged.unlockedPals = Array.isArray(merged.unlockedPals) ? [...new Set(merged.unlockedPals)] : [];
  merged.activePal = typeof merged.activePal === 'string' && getPalById(merged.activePal) ? merged.activePal : null;
  merged.ownedPals = Array.isArray(merged.ownedPals)
    ? [...new Set(merged.ownedPals.filter((palId) => typeof palId === 'string' && getPalById(palId) && !getPalById(palId).placeholder))]
    : [];
  merged.palCompatibility = merged.palCompatibility && typeof merged.palCompatibility === 'object'
    ? merged.palCompatibility
    : {};
  merged.constellations = merged.constellations && typeof merged.constellations === 'object'
    ? merged.constellations
    : {};
  merged.deathRecord = Array.isArray(merged.deathRecord) ? merged.deathRecord : [];
  if (merged.activePal && !merged.ownedPals.includes(merged.activePal)) {
    merged.ownedPals.unshift(merged.activePal);
  }
  merged.inventory = Array.isArray(merged.inventory)
    ? merged.inventory.map(normalizeInventoryItem).filter(Boolean).slice(0, ITEM_LOG_LIMIT)
    : [];
  merged.habitHistory = normalizeHabitHistory(merged.habitHistory, merged.habitDays);
  merged.habitDays = Array.isArray(merged.habitDays) && merged.habitDays.length === 7
    ? getHabitWindow(merged.habitHistory, 7).map((entry) => entry.completed)
    : getHabitWindow(merged.habitHistory, 7).map((entry) => entry.completed);
  merged.homeCollapsed = normalizeHomeCollapsedState(merged.homeCollapsed);
  merged.xp = Math.max(0, Number(merged.xp) || 0);
  merged.dailyDisappointment = normalizeDailyDisappointmentState(merged.dailyDisappointment);
  merged.antiAchievements = normalizeAntiAchievementState(merged.antiAchievements);
  merged.seasonalEvent = normalizeSeasonalEventState(merged.seasonalEvent);
  merged.calendar = normalizeCalendarState(merged.calendar);
  merged.meta = normalizeMetaState(merged.meta);
  if (!state || !state.meta || state.meta.longestStreak === undefined) merged.meta.longestStreak = merged.streak || 0;
  if (!state || !state.meta || typeof state.meta.lastVisitTimestamp !== 'number') merged.meta.lastVisitTimestamp = Date.now();
  merged.meta.secondPalUnlockSeen = Boolean(merged.meta.secondPalUnlockSeen ?? false);
  if (!merged.meta.lastGiftDate) merged.meta.lastGiftDate = null;
  if (!Array.isArray(merged.meta.giftLog)) merged.meta.giftLog = [];
  if (typeof merged.meta.lastTaskRewardDate !== 'string') merged.meta.lastTaskRewardDate = null;
  if (typeof merged.meta.lastCalendarRewardDate !== 'string') merged.meta.lastCalendarRewardDate = null;
  if (!Array.isArray(merged.meta.recentTaskCreations)) merged.meta.recentTaskCreations = [];
  merged.needs = normalizeNeeds(merged.needs);
  merged.plagued = Boolean(merged.plagued) || merged.needs.plague >= PLAGUE_THRESHOLD;
  merged.care.lastNeedUpdate = typeof merged.care.lastNeedUpdate === 'number' ? merged.care.lastNeedUpdate : Date.now();
  merged.care.reactionType = typeof merged.care.reactionType === 'string' ? merged.care.reactionType : 'idle';
  merged.care.dialogue = typeof merged.care.dialogue === 'string' ? merged.care.dialogue : null;
  merged.care.lockoutUntil = typeof merged.care.lockoutUntil === 'number' ? merged.care.lockoutUntil : null;
  merged.care.nextSpinGuaranteed = Boolean(merged.care.nextSpinGuaranteed);
  merged.care.dialogueSilentUntil = typeof merged.care.dialogueSilentUntil === 'number' ? merged.care.dialogueSilentUntil : null;
  merged.care.lastOracleResult = merged.care.lastOracleResult && typeof merged.care.lastOracleResult === 'object'
    ? merged.care.lastOracleResult
    : null;
  merged.clone = normalizeCloneState(merged.clone);
  merged.clone.clonePair = normalizeClonePair(merged.clone.clonePair, merged);
  merged.activeCloneId = typeof merged.activeCloneId === 'string'
    ? merged.activeCloneId
    : null;
  merged.palMoodLedger = normalizePalMoodLedger(merged.palMoodLedger, merged);
  merged.palOutfits = (merged.palOutfits && typeof merged.palOutfits === 'object' && !Array.isArray(merged.palOutfits))
    ? merged.palOutfits
    : {};
  // palWardrobeOwned: per-pal list of outfit IDs the pal has acquired via shopping.
  // Migration: if uninitialized but the pal already has an equipped outfit, grant it.
  if (!merged.palWardrobeOwned || typeof merged.palWardrobeOwned !== 'object' || Array.isArray(merged.palWardrobeOwned)) {
    merged.palWardrobeOwned = {};
  }
  Object.keys(merged.palOutfits || {}).forEach(function(palId) {
    var equippedId = merged.palOutfits[palId];
    if (!equippedId) return;
    if (!Array.isArray(merged.palWardrobeOwned[palId])) {
      merged.palWardrobeOwned[palId] = [];
    }
    if (merged.palWardrobeOwned[palId].indexOf(equippedId) === -1) {
      merged.palWardrobeOwned[palId].push(equippedId);
    }
  });
  // palPantry: per-pal stockable food inventory. Each value is an array of
  // `{ itemId, qty }` rows. Stripped of zero/invalid entries on every load.
  if (!merged.palPantry || typeof merged.palPantry !== 'object' || Array.isArray(merged.palPantry)) {
    merged.palPantry = {};
  }
  Object.keys(merged.palPantry).forEach(function(palId) {
    var rows = merged.palPantry[palId];
    if (!Array.isArray(rows)) {
      merged.palPantry[palId] = [];
      return;
    }
    merged.palPantry[palId] = rows
      .filter(function(row) { return row && typeof row.itemId === 'string' && (row.qty || 0) > 0; })
      .map(function(row) { return { itemId: row.itemId, qty: Math.max(0, Math.floor(row.qty)) }; });
  });
  // palToybox: per-pal owned toy IDs (durable). Each value is an array of
  // string toy IDs; duplicates and unknown IDs are stripped on load.
  if (!merged.palToybox || typeof merged.palToybox !== 'object' || Array.isArray(merged.palToybox)) {
    merged.palToybox = {};
  }
  Object.keys(merged.palToybox).forEach(function(palId) {
    var ids = merged.palToybox[palId];
    if (!Array.isArray(ids)) {
      merged.palToybox[palId] = [];
      return;
    }
    var seen = {};
    merged.palToybox[palId] = ids.filter(function(id) {
      if (typeof id !== 'string' || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  });
  // activityLog: chronological pal-event feed. Each entry is
  // { id, ts, palId, type, system, quote?, deltas?, itemId?, itemSlug?, link? }.
  // Pruned on load to last 7 days and capped at 500 entries.
  if (!Array.isArray(merged.activityLog)) {
    merged.activityLog = [];
  }
  var ACTIVITY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
  var ACTIVITY_HARD_CAP = 500;
  var activityCutoff = Date.now() - ACTIVITY_RETENTION_MS;
  merged.activityLog = merged.activityLog
    .filter(function(entry) {
      return entry
        && typeof entry === 'object'
        && typeof entry.type === 'string'
        && typeof entry.ts === 'number'
        && entry.ts >= activityCutoff;
    })
    .slice(-ACTIVITY_HARD_CAP);
  merged.spunToday = merged.lastSpinDate === getLocalDateKey();
  merged.version = APP_VERSION;

  if (merged.activePal && !merged.unlockedPals.includes(merged.activePal)) {
    merged.unlockedPals.push(merged.activePal);
  }

  return merged;
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return ensureStateIntegrity(saved ? JSON.parse(saved) : DEFAULT_STATE);
  } catch {
    return ensureStateIntegrity(DEFAULT_STATE);
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ensureStateIntegrity(state)));
}

function setAppState(nextStateOrUpdater) {
  const nextState = typeof nextStateOrUpdater === 'function'
    ? nextStateOrUpdater(appState)
    : nextStateOrUpdater;

  appState = ensureStateIntegrity(nextState);
  saveState(appState);
  return appState;
}

function getState() {
  return appState;
}