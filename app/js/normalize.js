// pessimistic pals - state normalization functions

function normalizeTask(task, index) {
  if (!task || typeof task !== 'object') {
    return createTask(`Task ${index + 1}`);
  }

  return {
    id: typeof task.id === 'string' ? task.id : createId('task'),
    title: typeof task.title === 'string' && task.title.trim() ? task.title.trim() : `Task ${index + 1}`,
    completed: Boolean(task.completed),
    rewardClaimed: Boolean(task.rewardClaimed || task.completedAt),
    createdAt: typeof task.createdAt === 'number' ? task.createdAt : Date.now(),
    completedAt: typeof task.completedAt === 'number' ? task.completedAt : null,
    source: task.source === 'calendar' || task.source === 'ghost' ? task.source : 'manual',
    calendarEventId: typeof task.calendarEventId === 'string' ? task.calendarEventId : null,
    calendarOccurrenceDate: typeof task.calendarOccurrenceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.calendarOccurrenceDate)
      ? task.calendarOccurrenceDate
      : null,
    intensity: clampNumber(Number(task.intensity) || 0, 0, 5),
    socialWeight: clampNumber(Number(task.socialWeight) || 0, 0, 5),
    energyCost: clampNumber(Number(task.energyCost) || 0, 0, 5),
    dreadLevel: clampNumber(Number(task.dreadLevel) || 0, 0, 5),
    interferenceNote: typeof task.interferenceNote === 'string' ? task.interferenceNote : null,
    ghostPalId: typeof task.ghostPalId === 'string' ? task.ghostPalId : null,
    ghostPalName: typeof task.ghostPalName === 'string' ? task.ghostPalName : null,
    ghostExpiresAt: typeof task.ghostExpiresAt === 'number' ? task.ghostExpiresAt : null,
    ghostItemFlavor: typeof task.ghostItemFlavor === 'string' ? task.ghostItemFlavor : null,
  };
}

function seedHabitHistoryFromDays(habitDays) {
  const keys = getRecentDateKeys(7);
  const history = {};

  keys.forEach((dateKey, index) => {
    if (Array.isArray(habitDays) && habitDays[index]) {
      history[dateKey] = true;
    }
  });

  return history;
}

function normalizeHabitHistory(history, legacyHabitDays) {
  const source = history && typeof history === 'object' ? history : seedHabitHistoryFromDays(legacyHabitDays);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const cutoffKey = getLocalDateKey(cutoff);
  const normalized = {};

  Object.entries(source).forEach(([dateKey, completed]) => {
    if (completed && /^\d{4}-\d{2}-\d{2}$/.test(dateKey) && dateKey >= cutoffKey) {
      normalized[dateKey] = true;
    }
  });

  return normalized;
}

const HABIT_WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function buildDefaultPalMoodLedger() {
  return (typeof PALS === 'undefined' ? [] : PALS).reduce((ledger, pal) => {
    ledger[pal.id] = {
      palId: pal.id,
      mood: 42,
      hunger: 72,
      boredom: 64,
      plague: 10,
      trust: 10,
      consecutiveCaredays: 0,
      lastCareDateKey: null,
      careActionTimestamps: [],
      lastSessionDateKey: null,
      isReturningAfterAbsence: false,
      performingFlagCount: 0,
      isDead: false,
      neglectDays: 0,
      lastTaskCompletionDate: null,
      lastMoodSyncDate: null,
      latestReaction: null,
      relationshipMode: 'observing',
      relationshipScore: 0,
      sessionTimestamps: [],
      lastCareScreenOpenTime: null,
      lastCareActionSequence: [],
      taskCategoriesCompleted: {},
      consecutiveTaskCounts: [],
      dialogueDismissedWithoutView: 0,
      uniqueEventFired: false,
      withdrawnPattern: null,
      xioLeadTimeViolations: 0,
      wintaReturnGloomPending: false,
    };
    return ledger;
  }, {});
}

function getDefaultPalMoodEntry(palId) {
  return buildDefaultPalMoodLedger()[palId] || {
    palId,
    mood: 42,
    hunger: 72,
    boredom: 64,
    plague: 10,
    trust: 10,
    consecutiveCaredays: 0,
    lastCareDateKey: null,
    careActionTimestamps: [],
    lastSessionDateKey: null,
    isReturningAfterAbsence: false,
    performingFlagCount: 0,
    isDead: false,
    neglectDays: 0,
    lastTaskCompletionDate: null,
    lastMoodSyncDate: null,
    latestReaction: null,
    relationshipMode: 'observing',
    relationshipScore: 0,
    sessionTimestamps: [],
    lastCareScreenOpenTime: null,
    lastCareActionSequence: [],
    taskCategoriesCompleted: {},
    consecutiveTaskCounts: [],
    dialogueDismissedWithoutView: 0,
    uniqueEventFired: false,
    withdrawnPattern: null,
    xioLeadTimeViolations: 0,
    wintaReturnGloomPending: false,
  };
}

function normalizeRewardLogEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  return {
    id: typeof entry.id === 'string' ? entry.id : createId('reward'),
    date: typeof entry.date === 'string' ? entry.date : getLocalDateKey(),
    rewardType: typeof entry.rewardType === 'string' ? entry.rewardType : 'nothing',
    label: typeof entry.label === 'string' ? entry.label : 'Literally Nothing',
    amount: typeof entry.amount === 'number' ? entry.amount : 0,
    itemId: typeof entry.itemId === 'string' ? entry.itemId : null,
    quip: typeof entry.quip === 'string' ? entry.quip : 'The record is disappointingly incomplete.',
    eventId: typeof entry.eventId === 'string' ? entry.eventId : null,
  };
}

function normalizeInventoryItem(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  return {
    id: typeof item.id === 'string' ? item.id : createId('item'),
    catalogId: typeof item.catalogId === 'string' ? item.catalogId : null,
    name: typeof item.name === 'string' ? item.name : 'Unnamed Relic',
    image_ref: typeof item.image_ref === 'string' ? item.image_ref : '',
    flavor_text: typeof item.flavor_text === 'string' ? item.flavor_text : 'It persists without improving matters.',
    provenance: typeof item.provenance === 'string' ? item.provenance : '',
    rarity: ITEM_RARITY_ORDER[item.rarity] ? item.rarity : 'common',
    date_acquired: typeof item.date_acquired === 'string' ? item.date_acquired : getLocalDateKey(),
    source: typeof item.source === 'string' ? item.source : 'archive',
    event_id: typeof item.event_id === 'string' ? item.event_id : null,
  };
}

function normalizeDailyDisappointmentState(dailyDisappointment) {
  const normalized = {
    ...DEFAULT_DAILY_DISAPPOINTMENT_STATE,
    ...(dailyDisappointment || {}),
  };

  normalized.lastSpinDate = typeof normalized.lastSpinDate === 'string' ? normalized.lastSpinDate : null;
  normalized.latestResult = normalizeRewardLogEntry(normalized.latestResult);
  normalized.rewardLog = Array.isArray(normalized.rewardLog)
    ? normalized.rewardLog.map(normalizeRewardLogEntry).filter(Boolean).slice(0, DAILY_DISAPPOINTMENT_LOG_LIMIT)
    : [];

  return normalized;
}

function normalizeAntiAchievementState(antiAchievements) {
  const normalized = {
    ...DEFAULT_ANTI_ACHIEVEMENT_STATE,
    ...(antiAchievements || {}),
  };

  normalized.unlockedIds = Array.isArray(normalized.unlockedIds) ? [...new Set(normalized.unlockedIds)] : [];
  normalized.unlockLog = Array.isArray(normalized.unlockLog)
    ? normalized.unlockLog.filter((entry) => entry && typeof entry === 'object').slice(0, TROPHY_LOG_LIMIT)
    : [];

  return normalized;
}

function normalizeMetaState(meta) {
  const normalized = {
    ...DEFAULT_META_STATE,
    ...(meta || {}),
  };

  normalized.lastProgressDate = typeof normalized.lastProgressDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(normalized.lastProgressDate)
    ? normalized.lastProgressDate
    : null;
  normalized.firstDivergenceDate = typeof normalized.firstDivergenceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(normalized.firstDivergenceDate)
    ? normalized.firstDivergenceDate
    : null;
  normalized.lastGiftDate = typeof normalized.lastGiftDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(normalized.lastGiftDate)
    ? normalized.lastGiftDate
    : null;
  normalized.lastVisitTimestamp = typeof normalized.lastVisitTimestamp === 'number'
    ? normalized.lastVisitTimestamp
    : null;
  normalized.longestStreak = Math.max(0, Number(normalized.longestStreak) || 0);

  normalized.openDateHistory = Array.isArray(normalized.openDateHistory)
    ? [...new Set(normalized.openDateHistory.filter((dateKey) => /^\d{4}-\d{2}-\d{2}$/.test(dateKey)))].slice(-21)
    : [];
  normalized.giftLog = Array.isArray(normalized.giftLog)
    ? normalized.giftLog.filter((entry) => entry && typeof entry === 'object').slice(0, 30)
    : [];
  normalized.audioEnabled = Boolean(normalized.audioEnabled);
  normalized.audioVolume = clampNumber(Number(normalized.audioVolume) || DEFAULT_AUDIO_VOLUME, 0, 1);
  normalized.uiVolume = clampNumber(typeof normalized.uiVolume === 'number' ? normalized.uiVolume : 0.6, 0, 1);
  normalized.audioTrackId = AUDIO_TRACKS.some((track) => track.id === normalized.audioTrackId)
    ? normalized.audioTrackId
    : AUDIO_TRACKS[0].id;

  return normalized;
}

function normalizeHomeCollapsedState(homeCollapsed) {
  const source = homeCollapsed && typeof homeCollapsed === 'object' ? homeCollapsed : {};

  return Object.keys(HOME_COLLAPSED_DEFAULTS).reduce((normalized, panelId) => {
    normalized[panelId] = typeof source[panelId] === 'boolean'
      ? source[panelId]
      : HOME_COLLAPSED_DEFAULTS[panelId];
    return normalized;
  }, {});
}

function normalizeCalendarInteraction(interaction) {
  if (!interaction || typeof interaction !== 'object') {
    return null;
  }

  return {
    type: typeof interaction.type === 'string' ? interaction.type : 'created',
    message: typeof interaction.message === 'string' ? interaction.message : 'The calendar has recorded an incident.',
    date: typeof interaction.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(interaction.date) ? interaction.date : getLocalDateKey(),
    eventId: typeof interaction.eventId === 'string' ? interaction.eventId : null,
    timestamp: typeof interaction.timestamp === 'number' ? interaction.timestamp : Date.now(),
  };
}

function normalizeCalendarCompletionEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  if (typeof entry.eventId !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(String(entry.date || ''))) {
    return null;
  }

  return {
    eventId: entry.eventId,
    date: entry.date,
    completedAt: typeof entry.completedAt === 'number' ? entry.completedAt : Date.now(),
  };
}

function normalizeCalendarEvent(event) {
  if (!event || typeof event !== 'object') {
    return null;
  }

  const category = CALENDAR_CATEGORY_META[event.category] ? event.category : 'focus';
  const recurrence = CALENDAR_RECURRENCE_LABELS[event.recurrence] ? event.recurrence : 'none';
  const allDay = Boolean(event.allDay);
  const startTime = typeof event.startTime === 'string' ? event.startTime : '';
  const endTime = typeof event.endTime === 'string' ? event.endTime : '';

  return {
    id: typeof event.id === 'string' ? event.id : createId('calendar'),
    title: typeof event.title === 'string' && event.title.trim() ? event.title.trim() : 'Untitled Event',
    date: typeof event.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(event.date) ? event.date : getLocalDateKey(),
    startTime: allDay ? '' : startTime,
    endTime: allDay ? '' : endTime,
    allDay,
    category,
    recurrence,
    notes: typeof event.notes === 'string' ? event.notes.trim() : '',
    intensity: clampNumber(Number(event.intensity) || 0, 0, 5),
    socialWeight: clampNumber(Number(event.socialWeight) || 0, 0, 5),
    energyCost: clampNumber(Number(event.energyCost) || 0, 0, 5),
    dreadLevel: clampNumber(Number(event.dreadLevel) || 0, 0, 5),
    seasonalEventId: typeof event.seasonalEventId === 'string' ? event.seasonalEventId : null,
    source: event.source === 'library' ? 'library' : 'manual',
    createdAt: typeof event.createdAt === 'number' ? event.createdAt : Date.now(),
    updatedAt: typeof event.updatedAt === 'number' ? event.updatedAt : Date.now(),
  };
}

function normalizeCalendarState(calendar) {
  const normalized = {
    ...DEFAULT_CALENDAR_STATE,
    ...(calendar || {}),
  };

  normalized.selectedDate = typeof normalized.selectedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(normalized.selectedDate)
    ? normalized.selectedDate
    : getLocalDateKey();
  normalized.visibleMonth = typeof normalized.visibleMonth === 'string' && /^\d{4}-\d{2}$/.test(normalized.visibleMonth)
    ? normalized.visibleMonth
    : normalized.selectedDate.slice(0, 7);
  normalized.draftEventId = typeof normalized.draftEventId === 'string' ? normalized.draftEventId : null;
  normalized.events = Array.isArray(normalized.events)
    ? normalized.events.map(normalizeCalendarEvent).filter(Boolean).slice(0, 120)
    : [];
  normalized.completionLog = Array.isArray(normalized.completionLog)
    ? normalized.completionLog.map(normalizeCalendarCompletionEntry).filter(Boolean).slice(0, 240)
    : [];
  normalized.lastInteraction = normalizeCalendarInteraction(normalized.lastInteraction);

  return normalized;
}

function normalizeSeasonalEventState(seasonalEvent) {
  const normalized = {
    ...DEFAULT_SEASONAL_EVENT_STATE,
    ...(seasonalEvent || {}),
  };

  normalized.activeEventId = typeof normalized.activeEventId === 'string' ? normalized.activeEventId : null;
  normalized.themeToken = typeof normalized.themeToken === 'string' ? normalized.themeToken : 'default';
  normalized.lastCheckedDate = typeof normalized.lastCheckedDate === 'string' ? normalized.lastCheckedDate : null;
  return normalized;
}

function normalizePalMoodLedger(ledger, state) {
  const defaults = buildDefaultPalMoodLedger();
  const source = ledger && typeof ledger === 'object' ? ledger : {};

  Object.keys(defaults).forEach((palId) => {
    const candidate = source[palId] || {};
    defaults[palId] = {
      ...defaults[palId],
      ...candidate,
      mood: clampNumber(Number(candidate.mood ?? defaults[palId].mood), 0, MAX_RELUCTANT_MOOD),
      hunger: clampNumber(Number(candidate.hunger ?? defaults[palId].hunger), 0, 100),
      boredom: clampNumber(Number(candidate.boredom ?? defaults[palId].boredom), 0, 100),
      plague: clampNumber(Number(candidate.plague ?? defaults[palId].plague), 0, 100),
      trust: clampNumber(Number(candidate.trust ?? 10), 0, 100),
      consecutiveCaredays: Math.max(0, Number(candidate.consecutiveCaredays ?? 0) || 0),
      lastCareDateKey: typeof candidate.lastCareDateKey === 'string'
        ? candidate.lastCareDateKey
        : null,
      careActionTimestamps: Array.isArray(candidate.careActionTimestamps)
        ? candidate.careActionTimestamps.filter((timestamp) => typeof timestamp === 'number').slice(-CARE_ACTIONS_TRUST_CAP_PER_DAY * 4)
        : [],
      lastSessionDateKey: typeof candidate.lastSessionDateKey === 'string'
        ? candidate.lastSessionDateKey
        : null,
      isReturningAfterAbsence: Boolean(candidate.isReturningAfterAbsence),
      performingFlagCount: Math.max(0, Number(candidate.performingFlagCount ?? 0) || 0),
      isDead: Boolean(candidate.isDead),
      isGhost: Boolean(candidate.isGhost),
      ghostEnteredDate: typeof candidate.ghostEnteredDate === 'string' ? candidate.ghostEnteredDate : null,
      neglectDays: Math.max(0, Number(candidate.neglectDays ?? defaults[palId].neglectDays) || 0),
      lastTaskCompletionDate: typeof candidate.lastTaskCompletionDate === 'string' ? candidate.lastTaskCompletionDate : null,
      lastMoodSyncDate: typeof candidate.lastMoodSyncDate === 'string' ? candidate.lastMoodSyncDate : null,
      latestReaction: typeof candidate.latestReaction === 'string' ? candidate.latestReaction : null,
      relationshipMode: ['observing', 'present', 'invested', 'bonded', 'withdrawn']
        .includes(candidate.relationshipMode)
        ? candidate.relationshipMode
        : 'observing',
      relationshipScore: clampNumber(Number(candidate.relationshipScore ?? 0), 0, 100),
      sessionTimestamps: Array.isArray(candidate.sessionTimestamps)
        ? candidate.sessionTimestamps.slice(-7)
        : [],
      lastCareScreenOpenTime: typeof candidate.lastCareScreenOpenTime === 'number'
        ? candidate.lastCareScreenOpenTime
        : null,
      lastCareActionSequence: Array.isArray(candidate.lastCareActionSequence)
        ? candidate.lastCareActionSequence.slice(-3)
        : [],
      taskCategoriesCompleted: candidate.taskCategoriesCompleted && typeof candidate.taskCategoriesCompleted === 'object'
        ? candidate.taskCategoriesCompleted
        : {},
      consecutiveTaskCounts: Array.isArray(candidate.consecutiveTaskCounts)
        ? candidate.consecutiveTaskCounts.slice(-7)
        : [],
      dialogueDismissedWithoutView: Math.max(0, Number(candidate.dialogueDismissedWithoutView ?? 0) || 0),
      uniqueEventFired: Boolean(candidate.uniqueEventFired ?? false),
      withdrawnPattern: typeof candidate.withdrawnPattern === 'string' ? candidate.withdrawnPattern : null,
      xioLeadTimeViolations: Math.max(0, Number(candidate.xioLeadTimeViolations ?? 0) || 0),
      stillWaterUntil: typeof candidate.stillWaterUntil === 'number'
        ? candidate.stillWaterUntil
        : 0,
      wintaReturnGloomPending: Boolean(candidate.wintaReturnGloomPending ?? false),
      autoShopEnabled: Boolean(candidate.autoShopEnabled),
      autoShopDailyBudget: Math.max(0, Number(candidate.autoShopDailyBudget) || 0),
      autoShopSpentToday: Math.max(0, Number(candidate.autoShopSpentToday) || 0),
      autoShopSpentDate: typeof candidate.autoShopSpentDate === 'string' ? candidate.autoShopSpentDate : null,
    };
  });

  if (state && state.activePal && defaults[state.activePal]) {
    defaults[state.activePal].hunger = clampNumber(Number((state.needs && state.needs.hunger) ?? defaults[state.activePal].hunger), 0, 100);
    defaults[state.activePal].boredom = clampNumber(Number((state.needs && state.needs.boredom) ?? defaults[state.activePal].boredom), 0, 100);
    defaults[state.activePal].mood = clampNumber(Number((state.needs && state.needs.mood) ?? defaults[state.activePal].mood), 0, MAX_RELUCTANT_MOOD);
    defaults[state.activePal].plague = clampNumber(Number((state.needs && state.needs.plague) ?? defaults[state.activePal].plague), 0, 100);
  }

  return defaults;
}

function normalizeCloneState(clone) {
  const normalized = {
    ...DEFAULT_CLONE_STATE,
    ...(clone || {}),
  };

  normalized.activeCycle = normalized.activeCycle && typeof normalized.activeCycle === 'object'
    ? normalized.activeCycle
    : null;
  normalized.revealedVariant = normalized.revealedVariant && typeof normalized.revealedVariant === 'object'
    ? normalized.revealedVariant
    : null;
  normalized.history = Array.isArray(normalized.history)
    ? normalized.history.map((entry) => ({
      ...entry,
      cloneName: typeof entry.cloneName === 'string' ? entry.cloneName : null,
    })).slice(0, 12)
    : [];
  normalized.dialogue = typeof normalized.dialogue === 'string' ? normalized.dialogue : null;
  normalized.clonePair = normalized.clonePair && typeof normalized.clonePair === 'object'
    ? normalized.clonePair
    : { ...DEFAULT_CLONE_STATE.clonePair };

  return normalized;
}

function normalizeClonePair(pair, state) {
  const fallback = getDefaultClonePair(state);
  if (!pair || typeof pair !== 'object') {
    return fallback;
  }

  const livingOwned = new Set((state.ownedPals || []).filter((palId) => {
    const pal = getPalById(palId);
    const ledgerEntry = state.palMoodLedger && state.palMoodLedger[palId];
    return pal && !pal.placeholder && !(ledgerEntry && ledgerEntry.isDead);
  }));

  const palA = typeof pair.palA === 'string' && livingOwned.has(pair.palA)
    ? pair.palA
    : fallback.palA;
  const palB = typeof pair.palB === 'string' && livingOwned.has(pair.palB)
    ? pair.palB
    : (fallback.palB || palA);

  return {
    palA,
    palB: palB || palA,
  };
}

function normalizeNeeds(needs) {
  return {
    hunger: clampNumber(Number(needs && needs.hunger) || 0, 0, 100),
    boredom: clampNumber(Number(needs && needs.boredom) || 0, 0, 100),
    mood: clampNumber(Number(needs && needs.mood) || 0, 0, 100),
    plague: clampNumber(Number(needs && needs.plague) || 0, 0, 100),
  };
}