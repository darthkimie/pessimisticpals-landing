function updatePalTrust(state, todayKey) {
  var nextLedger = Object.assign({}, state.palMoodLedger);
  var ownedPals = state.ownedPals || [];

  ownedPals.forEach(function(palId) {
    var entry = nextLedger[palId];
    if (!entry || entry.isDead) return;

    var trust = entry.trust || 0;
    var consecutiveCaredays = entry.consecutiveCaredays || 0;
    var lastSessionDateKey = entry.lastSessionDateKey || null;
    var alreadyCaredToday = entry.lastCareDateKey === todayKey;

    var isReturningAfterAbsence = false;
    if (lastSessionDateKey && lastSessionDateKey !== todayKey) {
      var daysSinceLastSession = getDaysBetweenDateKeys(lastSessionDateKey, todayKey);
      if (daysSinceLastSession >= ABSENCE_THRESHOLD_DAYS) {
        isReturningAfterAbsence = true;
      }
    }

    if (!alreadyCaredToday) {
      var isGoodCareDay = entry.hunger > 40 && entry.boredom > 40 && entry.mood > 30;
      var isNearDeath = entry.hunger <= 20 || entry.mood <= 20;
      var wasPerforming = (entry.performingFlagCount || 0) >= 2;

      if (isNearDeath) {
        var loss = TRUST_LOSS_NEAR_DEATH;
        if (trust >= TRUST_VULNERABLE_MIN) {
          loss = Math.ceil(loss * TRUST_LOSS_MULTIPLIER_VULNERABLE);
        }
        trust = clampNumber(trust - loss, 0, 100);
        consecutiveCaredays = 0;
      } else if (isGoodCareDay) {
        consecutiveCaredays += 1;

        var baseGain = TRUST_CONSISTENCY_TIERS.establishing.gain;
        if (consecutiveCaredays >= TRUST_CONSISTENCY_TIERS.steady.minDays) {
          baseGain = TRUST_CONSISTENCY_TIERS.steady.gain;
        } else if (consecutiveCaredays >= TRUST_CONSISTENCY_TIERS.building.minDays) {
          baseGain = TRUST_CONSISTENCY_TIERS.building.gain;
        }

        if (wasPerforming) {
          baseGain = Math.max(1, Math.floor(baseGain / 2));
        }

        if (isReturningAfterAbsence && !wasPerforming) {
          baseGain = baseGain + RETURN_TRUST_BONUS;
        }

        trust = clampNumber(trust + baseGain, 0, 100);
      } else {
        consecutiveCaredays = 0;
      }
    }

    nextLedger[palId] = Object.assign({}, entry, {
      trust: trust,
      consecutiveCaredays: consecutiveCaredays,
      lastCareDateKey: todayKey,
      lastSessionDateKey: todayKey,
      isReturningAfterAbsence: isReturningAfterAbsence,
      performingFlagCount: 0,
      careActionTimestamps: [],
    });
  });

  return Object.assign({}, state, { palMoodLedger: nextLedger });
}

function getPalTrustTier(palId, state) {
  var entry = state.palMoodLedger[palId];
  if (!entry) return 'cold';
  var trust = entry.trust || 0;
  if (trust >= TRUST_DIALOGUE_TIERS.vulnerable.min) return 'vulnerable';
  if (trust >= TRUST_DIALOGUE_TIERS.bonded.min) return 'bonded';
  if (trust >= TRUST_DIALOGUE_TIERS.open.min) return 'open';
  if (trust >= TRUST_DIALOGUE_TIERS.warming.min) return 'warming';
  return 'cold';
}

function resolveRelationshipMode(entry) {
  if (entry.relationshipMode === 'withdrawn') return 'withdrawn';
  const score = entry.relationshipScore || 0;
  if (score >= RELATIONSHIP_THRESHOLDS.bonded.min) return 'bonded';
  if (score >= RELATIONSHIP_THRESHOLDS.invested.min) return 'invested';
  if (score >= RELATIONSHIP_THRESHOLDS.present.min) return 'present';
  return 'observing';
}

function syncRelationshipMode(entry) {
  return {
    ...entry,
    relationshipMode: resolveRelationshipMode(entry),
  };
}

function recordCareActionTimestamp(state, palId) {
  var entry = (state.palMoodLedger && state.palMoodLedger[palId]) || {};
  var todayKey = getLocalDateKey();
  var timestamps = Array.isArray(entry.careActionTimestamps) ? entry.careActionTimestamps.slice() : [];

  if (entry.lastCareDateKey !== todayKey) {
    timestamps = timestamps.filter(function(timestamp) {
      return getLocalDateKey(new Date(timestamp)) === todayKey;
    });
  }

  var now = Date.now();
  timestamps.push(now);

  var recentCount = 0;
  for (var i = timestamps.length - 1; i >= 0; i -= 1) {
    if (now - timestamps[i] < CARE_ACTION_SPAM_WINDOW_MS) {
      recentCount += 1;
    } else {
      break;
    }
  }

  var isPerforming = recentCount >= CARE_ACTION_SPAM_THRESHOLD;
  var performingFlagCount = (entry.performingFlagCount || 0) + (isPerforming ? 1 : 0);

  return {
    careActionTimestamps: timestamps,
    performingFlagCount: performingFlagCount,
    isPerforming: isPerforming,
    trustWorthy: timestamps.length <= CARE_ACTIONS_TRUST_CAP_PER_DAY,
  };
}

function evaluatePalRelationalNeed(palId, state, todayKey) {
  const entry = state.palMoodLedger[palId] || {};

  switch (palId) {
    case 'ahote': {
      const categories = entry.taskCategoriesCompleted || {};
      const uniqueCatCount = Object.keys(categories).filter((key) => categories[key] > 0).length;
      return {
        advance: uniqueCatCount >= 3,
        violate: uniqueCatCount <= 1 && Object.values(categories).reduce((sum, value) => sum + value, 0) >= 5,
      };
    }
    case 'brutus': {
      const timestamps = entry.sessionTimestamps || [];
      if (timestamps.length < 3) return { advance: false, violate: false };
      const hours = timestamps.map((timestamp) => new Date(timestamp).getHours());
      const average = hours.reduce((sum, hour) => sum + hour, 0) / hours.length;
      const variance = hours.reduce((sum, hour) => sum + Math.pow(hour - average, 2), 0) / hours.length;
      return {
        advance: variance < 9 && timestamps.length >= 5,
        violate: variance >= 25 && timestamps.length >= 5,
      };
    }
    case 'centrama': {
      const counts = entry.consecutiveTaskCounts || [];
      if (counts.length < 3) return { advance: false, violate: false };
      const average = counts.reduce((sum, count) => sum + count, 0) / counts.length;
      const variance = counts.reduce((sum, count) => sum + Math.pow(count - average, 2), 0) / counts.length;
      return {
        advance: variance < 4 && counts.length >= 5,
        violate: variance >= 16 && counts.length >= 5,
      };
    }
    case 'doolin': {
      const skips = entry.dialogueDismissedWithoutView || 0;
      return {
        advance: skips === 0,
        violate: skips >= WITHDRAWN_VIOLATION_THRESHOLD,
      };
    }
    case 'elbjorg': {
      const openTime = entry.lastCareScreenOpenTime;
      const lastAction = state.care.lastNeedUpdate;
      if (!openTime || !lastAction) return { advance: false, violate: false };
      const gap = lastAction - openTime;
      return {
        advance: gap >= 3000,
        violate: gap < 500 && gap > 0,
      };
    }
    case 'veruca': {
      const sequence = entry.lastCareActionSequence || [];
      const isRitual = sequence.length >= 3 && sequence.every((action) => action === sequence[0]);
      const isAntiRitual = sequence.length >= 3 && new Set(sequence).size === sequence.length;
      return {
        advance: isRitual,
        violate: isAntiRitual,
      };
    }
    case 'winta':
      return { advance: false, violate: false };
    case 'xio': {
      const events = (state.calendar && state.calendar.events) || [];
      const lastMinuteEvents = events.filter((event) => {
        if (!event.date || !event.startTime) return false;
        const eventStart = new Date(`${event.date}T${event.startTime}`).getTime();
        const createdAt = event.createdAt || 0;
        const leadTime = eventStart - createdAt;
        return leadTime < 2 * 60 * 60 * 1000;
      });
      const violations = entry.xioLeadTimeViolations || 0;
      return {
        advance: lastMinuteEvents.length === 0 && events.length > 0,
        violate: violations >= WITHDRAWN_VIOLATION_THRESHOLD,
      };
    }
    default:
      return { advance: false, violate: false };
  }
}

function applyRecoveryGesture(state, palId, gestureType) {
  const entry = state.palMoodLedger[palId] || {};
  if (entry.relationshipMode !== 'withdrawn') return state;

  const recoveryMap = {
    ahote: 'new_category',
    brutus: 'seven_sessions',
    centrama: 'low_variance',
    doolin: 'sixty_seconds',
    elbjorg: 'time_only',
    veruca: 'ritual',
    winta: 'milestone_active',
    xio: 'lead_time_clean',
  };

  if (recoveryMap[palId] !== gestureType) return state;

  const recovered = {
    ...entry,
    relationshipMode: 'present',
    relationshipScore: RELATIONSHIP_THRESHOLDS.present.min,
    withdrawnPattern: null,
  };

  return {
    ...state,
    palMoodLedger: {
      ...state.palMoodLedger,
      [palId]: recovered,
    },
  };
}

function updateRelationshipOnSession(state, todayKey) {
  const palId = state.activePal;
  if (!palId) return state;

  const entry = state.palMoodLedger[palId];
  if (!entry || entry.isDead) return state;

  const now = Date.now();
  const sessionTimestamps = [...(entry.sessionTimestamps || []), now].slice(-7);
  const todayCompleted = (state.tasks || [])
    .filter((task) => task.completed && task.completedAt && getLocalDateKey(new Date(task.completedAt)) === todayKey)
    .length;
  const consecutiveTaskCounts = [...(entry.consecutiveTaskCounts || []), todayCompleted].slice(-7);
  const { advance, violate } = evaluatePalRelationalNeed(palId, state, todayKey);

  let score = entry.relationshipScore || 0;
  let relationshipMode = entry.relationshipMode;
  let withdrawnPattern = entry.withdrawnPattern;
  const isNearDeath = entry.hunger <= 20 || entry.mood <= 20 || entry.plague >= 80;

  if (relationshipMode !== 'withdrawn') {
    if (advance) {
      score = clampNumber(score + RELATIONSHIP_SCORE.goodSession, 0, 100);
    } else {
      score = clampNumber(score + RELATIONSHIP_SCORE.consistentSession, 0, 100);
    }

    if (violate) {
      score = clampNumber(score + RELATIONSHIP_SCORE.needViolation, 0, 100);
      if (score < RELATIONSHIP_THRESHOLDS.present.min && relationshipMode !== 'observing') {
        relationshipMode = 'withdrawn';
        withdrawnPattern = palId;
      }
    }
  }

  if (isNearDeath) {
    score = clampNumber(score + RELATIONSHIP_SCORE.nearDeathPenalty, 0, 100);
  }

  let nextState = {
    ...state,
    palMoodLedger: {
      ...state.palMoodLedger,
      [palId]: syncRelationshipMode({
        ...entry,
        relationshipScore: score,
        relationshipMode,
        sessionTimestamps,
        consecutiveTaskCounts,
        withdrawnPattern,
      }),
    },
  };

  const nextEntry = nextState.palMoodLedger[palId] || {};
  if (entry.relationshipMode === 'withdrawn') {
    if (palId === 'brutus' && sessionTimestamps.length >= 7) {
      nextState = applyRecoveryGesture(nextState, 'brutus', 'seven_sessions');
    }
    if (palId === 'centrama' && advance) {
      nextState = applyRecoveryGesture(nextState, 'centrama', 'low_variance');
    }
    if (palId === 'veruca' && advance) {
      nextState = applyRecoveryGesture(nextState, 'veruca', 'ritual');
    }
    if (palId === 'elbjorg') {
      const healedScore = clampNumber((nextEntry.relationshipScore || 0) + 2, 0, 100);
      nextState = {
        ...nextState,
        palMoodLedger: {
          ...nextState.palMoodLedger,
          elbjorg: {
            ...nextState.palMoodLedger.elbjorg,
            relationshipScore: healedScore,
          },
        },
      };
      if (healedScore >= RELATIONSHIP_THRESHOLDS.present.min) {
        nextState = applyRecoveryGesture(nextState, 'elbjorg', 'time_only');
      }
    }
  }

  return nextState;
}

const UNIQUE_BONDED_EVENTS = {
  ahote: {
    trigger: (state, entry) => entry.relationshipMode === 'bonded' && entry.sessionTimestamps.length >= 7,
    line: 'Oh wait - you came back again. I was not tracking that. I was not. ...I was.',
  },
  brutus: {
    trigger: (state, entry) => entry.relationshipMode === 'bonded'
      && state.meta.lastStreakBreakDate
      && state.meta.lastOpenDate === getLocalDateKey()
      && state.meta.openCountToday === 1,
    line: 'You came back.',
  },
  centrama: {
    trigger: (state, entry) => {
      const tasks = state.tasks || [];
      const todayKey = getLocalDateKey();
      const addedToday = tasks.filter((task) => task.createdAt && getLocalDateKey(new Date(task.createdAt)) === todayKey).length;
      return entry.relationshipMode === 'bonded' && addedToday === 0;
    },
    line: 'I stopped adding things to the list today. I thought you should know I noticed that I did that.',
  },
  doolin: {
    trigger: (state, entry) => {
      const todayCompleted = (state.tasks || [])
        .filter((task) => task.completed && task.completedAt && getLocalDateKey(new Date(task.completedAt)) === getLocalDateKey())
        .length;
      return entry.relationshipMode === 'bonded' && todayCompleted === 0;
    },
    line: 'Today you showed up and did nothing and I found that less irritating than usual. I will not be explaining this.',
  },
  elbjorg: {
    trigger: (state, entry) => {
      const hasGhostTask = (state.tasks || []).some((task) => task.source === 'ghost' && task.completed);
      return entry.relationshipMode === 'bonded' && hasGhostTask;
    },
    line: 'You finished that. I saw that you finished that.',
  },
  veruca: {
    trigger: (state, entry) => {
      const todayActions = entry.lastCareActionSequence || [];
      return entry.relationshipMode === 'bonded' && todayActions.length === 0 && entry.lastCareDateKey === getLocalDateKey();
    },
    line: 'You checked on me and did not fix anything. That was actually fine.',
  },
  winta: {
    trigger: (state, entry, previousActivePal) => entry.relationshipMode === 'bonded'
      && previousActivePal !== null
      && previousActivePal !== 'winta'
      && state.activePal !== 'winta',
    line: 'I understand. I have been preparing something for when you come back.',
    returnLine: 'Here.',
  },
  xio: {
    trigger: (state, entry) => {
      const events = (state.calendar && state.calendar.events) || [];
      return entry.relationshipMode === 'bonded' && events.length >= 30;
    },
    line: 'SCHEDULED CHECK-IN // WEEKLY // LOAD: 0',
  },
};

function checkUniqueBondedEvent(state, palId, previousActivePal = null) {
  const entry = state.palMoodLedger[palId] || {};
  if (entry.uniqueEventFired || entry.relationshipMode !== 'bonded') return state;

  const eventDef = UNIQUE_BONDED_EVENTS[palId];
  if (!eventDef) return state;

  const triggered = eventDef.trigger(state, entry, previousActivePal);
  if (!triggered) return state;

  let nextState = {
    ...state,
    palMoodLedger: {
      ...state.palMoodLedger,
      [palId]: { ...entry, uniqueEventFired: true },
    },
    care: {
      ...state.care,
      dialogue: eventDef.line,
    },
  };

  if (palId === 'xio') {
    const xioEvent = {
      id: createId('cal'),
      title: 'Scheduled Check-In',
      date: getLocalDateKey(),
      allDay: false,
      startTime: '09:00',
      endTime: '09:15',
      category: 'focus',
      recurrence: 'weekly',
      notes: '',
      intensity: 0,
      socialWeight: 0,
      energyCost: 0,
      dreadLevel: 0,
      createdAt: Date.now(),
      source: 'xio_bonded',
    };
    nextState = {
      ...nextState,
      calendar: {
        ...nextState.calendar,
        events: [...(nextState.calendar.events || []), xioEvent],
      },
    };
  }

  if (palId === 'winta') {
    nextState = {
      ...nextState,
      palMoodLedger: {
        ...nextState.palMoodLedger,
        winta: {
          ...nextState.palMoodLedger.winta,
          wintaReturnGloomPending: true,
        },
      },
    };
  }

  return nextState;
}

function formatRelationshipModeLabel(mode) {
  switch (mode) {
    case 'present':
      return 'PRESENT';
    case 'invested':
      return 'INVESTED';
    case 'bonded':
      return 'BONDED';
    case 'withdrawn':
      return 'WITHDRAWN';
    case 'observing':
    default:
      return 'OBSERVING';
  }
}

function applyRelationshipModeDisplay(element, mode) {
  if (!element) {
    return;
  }

  element.textContent = formatRelationshipModeLabel(mode);
  element.className = `pal-relationship-mode mode-${mode}`;
}

function getWithdrawnDialogue(palId, entry) {
  switch (palId) {
    case 'brutus':
      return '';
    case 'centrama':
      return 'Centrama has replaced commentary with pattern recognition.';
    case 'doolin':
      return 'Doolin is waiting for you to notice the absence correctly.';
    case 'elbjorg':
      return 'Elbjorg clocked the delay before you did.';
    case 'veruca':
      return 'Veruca declines to improvise for an unreliable audience.';
    case 'winta':
      return 'Winta does not celebrate with people who arrive late to their own luck.';
    case 'xio':
      return 'Xio has filed this under preventable turbulence.';
    case 'ahote':
      return 'Ahote is tired of seeing the same kind of failure on repeat.';
    default:
      return entry && entry.withdrawnPattern ? entry.withdrawnPattern : 'Silence has become the feedback.';
  }
}