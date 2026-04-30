// pessimistic pals - app logic and page controllers
// constants loaded from js/constants.js

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function createTask(title) {
  return {
    id: createId('task'),
    title,
    completed: false,
    rewardClaimed: false,
    createdAt: Date.now(),
    completedAt: null,
    source: 'manual',
    calendarEventId: null,
    calendarOccurrenceDate: null,
    intensity: 0,
    socialWeight: 0,
    energyCost: 0,
    dreadLevel: 0,
  };
}

function getStarterTasks() {
  return STARTER_TASK_TITLES.map(createTask);
}

function getAvailableLibraryTasks(state) {
  var activePalId = state.activePal || '';
  var todaySeed = getLocalDateKey().replace(/-/g, '');
  var numSeed = parseInt(todaySeed, 10) || 0;
  var activeSeasonalId = (state.seasonalEvent && state.seasonalEvent.activeEventId) || null;

  var eligible = TASK_LIBRARY.filter(function(task) {
    if (task.palSpecific && task.palSpecific !== activePalId) return false;
    if (task.seasonal && task.seasonal !== activeSeasonalId) return false;
    return true;
  });

  var palTasks = eligible.filter(function(task) { return task.palSpecific === activePalId; });
  var universalTasks = eligible.filter(function(task) { return !task.palSpecific; });
  var shuffled = universalTasks.slice().sort(function(left, right) {
    var hashLeft = 0;
    var hashRight = 0;
    var index = 0;

    for (index = 0; index < left.id.length; index += 1) {
      hashLeft += left.id.charCodeAt(index) * (numSeed + index);
    }

    for (index = 0; index < right.id.length; index += 1) {
      hashRight += right.id.charCodeAt(index) * (numSeed + index);
    }

    var difference = (hashLeft % 1000) - (hashRight % 1000);
    return difference === 0 ? left.id.localeCompare(right.id) : difference;
  });

  return {
    palTasks: palTasks,
    universalTasks: shuffled.slice(0, 10),
    categories: ['all', 'micro', 'body', 'social', 'maintenance', 'mind'],
  };
}

function getRecentDateKeys(count) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - index));
    return getLocalDateKey(date);
  });
}

function getHabitWindow(history, count = 7) {
  const todayKey = getLocalDateKey();

  return getRecentDateKeys(count).map((dateKey) => {
    const date = getDateFromKey(dateKey);
    return {
      dateKey,
      label: formatTinyDateLabel(date),
      dayName: date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase(),
      completed: Boolean(history[dateKey]),
      isToday: dateKey === todayKey,
    };
  });
}

function getHabitWeekTiles(history) {
  const recentEntries = getHabitWindow(history, 7);
  const recentEntryMap = new Map(recentEntries.map((entry) => [entry.dateKey, entry]));
  const todayKey = getLocalDateKey();
  const today = getDateFromKey(todayKey);
  const weekStart = new Date(today);

  weekStart.setHours(12, 0, 0, 0);
  weekStart.setDate(today.getDate() - today.getDay());

  return HABIT_WEEKDAY_INITIALS.map((dayInitial, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);

    const dateKey = getLocalDateKey(date);
    const entry = recentEntryMap.get(dateKey);
    const isToday = dateKey === todayKey;
    const isFuture = dateKey > todayKey;
    const completed = Boolean(entry && entry.completed);

    return {
      completed,
      dateKey,
      dateNumber: date.getDate(),
      dayInitial,
      isFuture,
      isMissed: !completed && !isFuture && !isToday,
      isToday,
      label: formatTinyDateLabel(date),
      statusLabel: completed
        ? isToday ? 'Logged today' : 'Logged'
        : isToday ? 'Pending today' : isFuture ? 'Upcoming' : 'Missed',
    };
  });
}

function getHabitCompletionCount(history, count = 7) {
  return getHabitWindow(history, count).filter((entry) => entry.completed).length;
}

function getHabitStatusLine(state) {
  const todayKey = getLocalDateKey();
  return state.habitHistory[todayKey]
    ? 'Routine logged for today. Disturbing competence.'
    : 'Today\'s routine is still unclaimed.';
}

function getNextLuckdustMilestone(streak) {
  const remainder = streak % STREAK_REWARD_INTERVAL;
  return remainder === 0 ? STREAK_REWARD_INTERVAL : STREAK_REWARD_INTERVAL - remainder;
}

function getProgressAnchorDate(state) {
  return (state && state.meta && state.meta.lastProgressDate) || (state && state.dailyCheckIn && state.dailyCheckIn.date) || null;
}

function calculatePrimaryStreakAdvance(state, activityDate = getLocalDateKey()) {
  const lastProgressDate = getProgressAnchorDate(state);

  if (lastProgressDate === activityDate) {
    return {
      changed: false,
      nextStreak: state.streak,
      luckdustReward: 0,
      activityDate,
    };
  }

  const nextStreak = lastProgressDate === getPreviousDateKey(activityDate)
    ? state.streak + 1
    : 1;

  return {
    changed: true,
    nextStreak,
    luckdustReward: nextStreak % STREAK_REWARD_INTERVAL === 0 ? 1 : 0,
    activityDate,
  };
}

function getDateFromDateKey(dateKey) {
  if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }

  const parts = dateKey.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getStreakStartDate(state) {
  if (!state.streak || state.streak === 0) return getLocalDateKey();
  var d = new Date();
  d.setDate(d.getDate() - (state.streak - 1));
  return getLocalDateKey(d);
}

function getStreakDialogueTier(state) {
  var streak = state.streak || 0;
  var meta = state.meta || {};
  var isBroken = meta.lastStreakBreakDate === getLocalDateKey();

  if (isBroken) return 'broken';

  var record = meta.longestStreak || 0;
  if (streak > 0 && streak >= record) return 'record';

  if (streak === 0) return 'zero';
  if (streak <= 3) return 'low';
  if (streak <= 14) return 'mid';
  return 'high';
}

function getStreakSpecificDialogue(palId, state) {
  var tier = getStreakDialogueTier(state);
  var dialogueTable = typeof STREAK_DIALOGUE !== 'undefined' ? STREAK_DIALOGUE : {};
  var palLines = dialogueTable[palId];
  if (!palLines) return '';
  return palLines[tier] || palLines.zero || '';
}

function getMostRecentTaskCompletionDateKey(tasks) {
  const completedTask = [...tasks]
    .filter((task) => task && task.completedAt)
    .sort((left, right) => right.completedAt - left.completedAt)[0];

  return completedTask ? getLocalDateKey(new Date(completedTask.completedAt)) : null;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function applyInterferenceAnnouncement(state, palId) {
  return {
    ...state,
    care: {
      ...state.care,
      reactionType: 'interference',
      dialogue: getCareDialogue(palId, 'interference'),
      dialogueSilentUntil: Date.now() + 30000,
    },
  };
}

function getCompatibilityKey(palAId, palBId) {
  return [palAId, palBId].sort().join('::');
}

function getCompatibilityScore(state, palAId, palBId) {
  const key = getCompatibilityKey(palAId, palBId);
  return state.palCompatibility[key] || 0;
}

function updatePalCompatibility(state) {
  const ownedPals = (state.ownedPals || []).filter((id) => {
    const entry = state.palMoodLedger[id];
    return entry && !entry.isDead && entry.hunger > 20 && entry.mood > 20;
  });

  if (ownedPals.length < 2) return state;

  const nextCompatibility = { ...state.palCompatibility };

  for (let index = 0; index < ownedPals.length; index += 1) {
    for (let innerIndex = index + 1; innerIndex < ownedPals.length; innerIndex += 1) {
      const key = getCompatibilityKey(ownedPals[index], ownedPals[innerIndex]);
      const gain = (state.constellations && state.constellations.winta)
        ? COMPATIBILITY_GAIN_PER_DAY * 2
        : COMPATIBILITY_GAIN_PER_DAY;
      nextCompatibility[key] = (nextCompatibility[key] || 0) + gain;
    }
  }

  return { ...state, palCompatibility: nextCompatibility };
}

function applyNeedDecay(state, now = Date.now()) {
  const nextState = applyOwnedPalDecay(state, now);
  const activeEntry = nextState.activePal ? nextState.palMoodLedger[nextState.activePal] : null;
  const pal = getPalById(nextState.activePal);
  const newlyPlagued = !state.plagued && activeEntry && activeEntry.plague >= PLAGUE_THRESHOLD;

  return {
    ...nextState,
    needs: activeEntry
      ? normalizeNeeds({
        hunger: activeEntry.hunger,
        boredom: activeEntry.boredom,
        mood: activeEntry.mood,
        plague: activeEntry.plague,
      })
      : nextState.needs,
    plagued: activeEntry ? activeEntry.plague >= PLAGUE_THRESHOLD : nextState.plagued,
    care: {
      ...nextState.care,
      reactionType: newlyPlagued ? 'sick' : nextState.care.reactionType,
      dialogue: newlyPlagued ? getCareDialogue((pal && pal.id) || 'xio', 'sick') : nextState.care.dialogue,
    },
  };
}

function applyUniqueOracleEffect(state, effect, pal) {
  const todayKey = getLocalDateKey();
  switch (effect) {
    case 'shiny_detour': {
      const blueprint = chooseItemBlueprint('daily_disappointment', null);
      let next = blueprint ? awardInventoryItem(state, blueprint, { source: 'oracle' }) : state;
      next = {
        ...next,
        tasks: next.tasks.map((task) => ({
          ...task,
          completed: false,
          rewardClaimed: false,
          completedAt: null,
        })),
      };
      return next;
    }
    case 'quiet_dividend': {
      return {
        ...state,
        gloom: state.gloom + (TASK_REWARD * 2),
        care: {
          ...state.care,
          dialogueSilentUntil: Date.now() + 24 * 60 * 60 * 1000,
        },
      };
    }
    case 'contingency_fund': {
      const dust = Math.max(1, Math.ceil((state.streak || 0) / 10));
      return { ...state, luckdust: state.luckdust + dust };
    }
    case 'spotlight_tax': {
      return {
        ...state,
        gloom: state.gloom + 8,
        luckdust: Math.max(0, state.luckdust - 2),
      };
    }
    case 'perimeter_check': {
      const activeEntry = state.palMoodLedger[state.activePal] || {};
      return {
        ...state,
        needs: normalizeNeeds({
          ...state.needs,
          plague: 10,
          boredom: 10,
        }),
        palMoodLedger: {
          ...state.palMoodLedger,
          [state.activePal]: {
            ...activeEntry,
            plague: 10,
            boredom: 10,
          },
        },
      };
    }
    case 'honest_mirror': {
      const currentEntry = state.palMoodLedger[state.activePal] || {};
      return {
        ...state,
        needs: normalizeNeeds({ ...state.needs, mood: 65 }),
        palMoodLedger: {
          ...state.palMoodLedger,
          [state.activePal]: {
            ...currentEntry,
            mood: 65,
            trust: clampNumber((currentEntry.trust || 0) + 5, 0, 100),
          },
        },
      };
    }
    case 'scene_change': {
      const cur = state.needs;
      const vals = [
        Math.max(20, cur.hunger),
        Math.max(20, cur.boredom),
        Math.max(20, cur.mood),
      ].sort(() => Math.random() - 0.5);
      const shuffledNeeds = normalizeNeeds({
        hunger: vals[0],
        boredom: vals[1],
        mood: vals[2],
        plague: cur.plague,
      });
      return {
        ...state,
        needs: shuffledNeeds,
        palMoodLedger: {
          ...state.palMoodLedger,
          [state.activePal]: {
            ...(state.palMoodLedger[state.activePal] || {}),
            ...shuffledNeeds,
          },
        },
      };
    }
    case 'controlled_detonation': {
      let gloomGained = 0;
      const completedTasks = state.tasks.map((task) => {
        if (!task.completed && !task.rewardClaimed) {
          gloomGained += TASK_REWARD + Math.floor(getTaskLoad(task) / 2) + getCloneGloomBonus(state);
        }
        return { ...task, completed: true, rewardClaimed: true, completedAt: Date.now() };
      });
      return {
        ...state,
        gloom: state.gloom + gloomGained,
        tasks: completedTasks,
        care: {
          ...state.care,
          lockoutUntil: Date.now() + 4 * 60 * 60 * 1000,
        },
      };
    }
    case 'favorable_odds': {
      return {
        ...state,
        care: {
          ...state.care,
          nextSpinGuaranteed: true,
        },
      };
    }
    case 'still_water': {
      const STILL_WATER_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
      const stillWaterUntil = Date.now() + STILL_WATER_DURATION_MS;
      const nextLedger = { ...state.palMoodLedger };

      // Pause decay for all owned pals by recording a
      // stillWaterUntil timestamp. applyOwnedPalDecay will
      // skip elapsed time calculations until this passes.
      (state.ownedPals || []).forEach((palId) => {
        if (nextLedger[palId]) {
          nextLedger[palId] = {
            ...nextLedger[palId],
            stillWaterUntil,
          };
        }
      });

      return {
        ...state,
        palMoodLedger: nextLedger,
        care: {
          ...state.care,
          dialogue: 'The Icky went quiet. Everything stopped getting worse for a while. Even the silence seemed surprised.',
          reactionType: 'oracleGloom',
        },
      };
    }
    default:
      return state;
  }
}

function checkPalDeaths(state) {
  let changed = false;
  let pendingDeathAchievement = false;
  let pendingGhostTask = null;
  let pendingDeathActivities = [];
  const nextLedger = {
    ...state.palMoodLedger,
  };
  const remainingOwned = [];
  const nextDeathRecord = Array.isArray(state.deathRecord) ? [...state.deathRecord] : [];

  (state.ownedPals || []).forEach((palId) => {
    const entry = nextLedger[palId];
    if (!entry) {
      return;
    }

    const assignmentTimestamp = typeof entry.firstAssignedAt === 'number'
      ? entry.firstAssignedAt
      : (state.meta && state.meta.firstOpenDate ? getDateFromKey(state.meta.firstOpenDate).getTime() : null);

    if (assignmentTimestamp && Date.now() - assignmentTimestamp < 60 * 1000) {
      if (!entry.isDead) {
        remainingOwned.push(palId);
      }
      return;
    }

    const plagueStage = getPlagueStage(entry.plague || 0);
    const trustTooLow = (entry.trust || 0) < PLAGUE_CURE_STAGE_3_TRUST_MIN;
    const needCollapse = entry.hunger <= 0 && entry.mood <= 0;
    const plagueCollapse = plagueStage === 3 && trustTooLow;
    const isDying = !entry.isDead && (plagueCollapse || (!entry.isGhost && needCollapse));
    if (isDying) {
      const pal = getPalById(palId);
      nextLedger[palId] = {
        ...entry,
        isDead: true,
        latestReaction: pal ? `${pal.name} has exited the care loop.` : entry.latestReaction,
      };
      if (state.activePal && nextLedger[state.activePal] && state.activePal !== palId) {
        nextLedger[state.activePal] = {
          ...nextLedger[state.activePal],
          trust: clampNumber((nextLedger[state.activePal].trust || 0) - TRUST_LOSS_PAL_DIES, 0, 100),
          consecutiveCaredays: 0,
        };
      }
      const deathEntry = {
        palId,
        palName: pal ? pal.name : palId,
        date: getLocalDateKey(),
        cause: plagueCollapse
          ? 'The Icky stopped. The trust was not there to restart it.'
          : needCollapse
            ? 'Hunger and despair in equal measure.'
            : entry.hunger <= 0
              ? 'Hunger. They saw it coming.'
              : 'The mood collapsed before anything else could.',
        finalSequence: null,
      };
      nextDeathRecord.push(deathEntry);
      pendingDeathActivities.push({
        palId: palId,
        type: 'death',
        system: (pal ? pal.name : palId) + ' has exited the care loop.',
        quote: deathEntry.cause,
        link: 'care',
      });
      const ghostData = typeof GHOST_TASKS !== 'undefined' ? GHOST_TASKS[palId] : null;
      if (ghostData) {
        const ghostTask = {
          ...createTask(ghostData.title),
          source: 'ghost',
          ghostPalId: palId,
          ghostPalName: pal ? pal.name : palId,
          ghostExpiresAt: Date.now() + ghostData.duration_hours * 60 * 60 * 1000,
          ghostItemFlavor: ghostData.item_flavor,
          interferenceNote: `Left by ${pal ? pal.name : palId}.`,
        };
        pendingGhostTask = ghostTask;
      }
      changed = true;
      pendingDeathAchievement = true;
      return;
    }

    if (!entry.isDead) {
      remainingOwned.push(palId);
    }
  });

  if (!changed) {
    return state;
  }

  const nextActivePal = remainingOwned.includes(state.activePal) ? state.activePal : (remainingOwned[0] || null);
  const nextState = {
    ...state,
    _pendingDeathAchievement: pendingDeathAchievement,
    activePal: nextActivePal,
    ownedPals: remainingOwned,
    deathRecord: nextDeathRecord,
    tasks: [...(state.tasks || [])],
    palMoodLedger: nextLedger,
    clone: {
      ...state.clone,
    },
  };

  if (pendingGhostTask) {
    nextState.tasks = [...(nextState.tasks || []), pendingGhostTask];
  }

  nextState.clone.clonePair = normalizeClonePair(nextState.clone.clonePair, nextState);

  if (nextActivePal && nextLedger[nextActivePal]) {
    nextState.needs = normalizeNeeds({
      hunger: nextLedger[nextActivePal].hunger,
      boredom: nextLedger[nextActivePal].boredom,
      mood: nextLedger[nextActivePal].mood,
      plague: nextLedger[nextActivePal].plague,
    });
    nextState.plagued = nextState.needs.plague >= PLAGUE_THRESHOLD;
  }

  if (pendingDeathActivities.length && typeof appendActivityToState === 'function') {
    pendingDeathActivities.forEach(function(ev) {
      nextState = appendActivityToState(nextState, ev);
    });
  }

  return nextState;
}

function getCriticalPals(state) {
  return (state.ownedPals || []).filter((palId) => {
    const entry = state.palMoodLedger[palId];
    if (!entry || entry.isDead) return false;
    return entry.hunger <= 20 || entry.mood <= 20;
  });
}

function syncNeedDecay() {
  let nextState = applyNeedDecay(appState);
  var ghostChecked = checkGhostState(nextState || appState);
  if (ghostChecked !== (nextState || appState)) {
    nextState = ghostChecked;
  }
  nextState = checkPalDeaths(nextState);
  if (nextState._pendingDeathAchievement) {
    delete nextState._pendingDeathAchievement;
    nextState = evaluateAntiAchievements(nextState, { type: 'pal_death' });
  }
  return setAppState(nextState);
}

function getCareMoodLabel(state) {
  if (state.plagued) {
    return 'Ickysoul Plagued';
  }

  const score = (state.needs.hunger + state.needs.boredom + state.needs.mood + (100 - state.needs.plague)) / 4;

  if (score >= 75) {
    return 'Grudgingly Stable';
  }

  if (score >= 50) {
    return 'Holding Together';
  }

  if (score >= 28) {
    return 'Visibly Frayed';
  }

  return 'Imminently Unpleasant';
}

function getNeedTone(needKey, value) {
  if (needKey === 'plague') {
    if (value >= 75) {
      return 'is-critical';
    }

    if (value >= 45) {
      return 'is-warn';
    }

    return 'is-good';
  }

  if (value <= 25) {
    return 'is-critical';
  }

  if (value <= 60) {
    return 'is-warn';
  }

  return 'is-good';
}

function getOracleResultText(state) {
  const activeEntry = state.activePal && state.palMoodLedger ? (state.palMoodLedger[state.activePal] || {}) : {};
  if (activeEntry.isGhost) {
    return 'Signal interference has locked the Dread Oracle until restoration succeeds.';
  }

  const todayKey = getLocalDateKey();

  if (state.care.lastOracleResult && state.care.lastOracleResult.date === todayKey) {
    const result = state.care.lastOracleResult;
    const palId = state.activePal;
    const ledgerEntry = palId && state.palMoodLedger ? (state.palMoodLedger[palId] || {}) : {};
    let reactionKey = null;

    if (result.type === 'gloom') {
      reactionKey = result.amount <= 3 ? 'gloom_small' : 'gloom_large';
    } else if (result.type === 'luckdust') {
      reactionKey = 'luckdust';
    } else if (result.type === 'nothing') {
      reactionKey = 'nothing';
    } else if (result.type === 'plague') {
      reactionKey = 'plague';
    } else if (result.type === 'unique') {
      reactionKey = 'unique';
    }

    const reactions = typeof ORACLE_PAL_REACTIONS !== 'undefined' ? ORACLE_PAL_REACTIONS : null;
    const reactionGroup = reactionKey && reactions && reactions[reactionKey] ? reactions[reactionKey] : null;
    const mainReaction = reactionGroup && palId && reactionGroup[palId]
      ? reactionGroup[palId]
      : (result.text || result.label);

    const segments = [];
    const neglectReaction = reactions && reactions.neglect_penalty && palId
      ? reactions.neglect_penalty[palId]
      : null;
    const streakReaction = reactions && reactions.streak_bonus && palId
      ? reactions.streak_bonus[palId]
      : null;

    if ((ledgerEntry.neglectDays || 0) >= 3 && neglectReaction) {
      segments.push(neglectReaction);
    }

    segments.push(mainReaction);

    if ((state.streak || 0) >= 7 && result.type === 'luckdust' && streakReaction) {
      segments.push(streakReaction);
    }

    return segments.filter(Boolean).join('\n\n');
  }

  return 'The Dread Oracle is available. Expectations should remain conservative.';
}

function getOracleSegmentTone(segment) {
  if (!segment) {
    return 'nothing';
  }

  if (segment.type === 'gloom' || segment.type === 'luckdust' || segment.type === 'plague' || segment.type === 'unique') {
    return segment.type;
  }

  return 'nothing';
}

function getOracleSegmentDisplayLabel(segment) {
  if (!segment) {
    return '';
  }

  return String(segment.label || '')
    .replace('Luckdust', 'Luck')
    .replace('Ickysoul ', '')
    .toUpperCase();
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;

  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians)),
  };
}

function describeOracleSlice(centerX, centerY, radius, startAngle, endAngle) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

function buildOracle(root) {
  const oracleGraphic = root.querySelector('[data-oracle-graphic]');
  if (!oracleGraphic || typeof document === 'undefined') {
    return;
  }

  const segments = buildDynamicOracle(getState());
  if (!segments.length) {
    oracleGraphic.replaceChildren();
    oracleGraphic.dataset.built = 'true';
    oracleGraphic.dataset.segmentSignature = '';
    root.dataset.oracleSegmentIds = '';
    return;
  }

  const segmentSignature = segments.map((segment) => segment.id).join('|');
  if (oracleGraphic.dataset.built === 'true' && oracleGraphic.dataset.segmentSignature === segmentSignature) {
    return;
  }

  const svgNs = 'http://www.w3.org/2000/svg';
  const size = 240;
  const center = 120;
  const radius = 108;
  const labelRadius = 74;
  const sliceAngle = 360 / segments.length;
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('class', 'oracle-svg');
  svg.setAttribute('data-oracle-svg', 'true');
  if (root.dataset.oracleRotation) {
    svg.style.transform = `rotate(${Number(root.dataset.oracleRotation)}deg)`;
  }

  const ring = document.createElementNS(svgNs, 'circle');
  ring.setAttribute('class', 'oracle-ring');
  ring.setAttribute('cx', String(center));
  ring.setAttribute('cy', String(center));
  ring.setAttribute('r', String(radius));
  svg.appendChild(ring);

  segments.forEach((segment, index) => {
    const startAngle = index * sliceAngle;
    const endAngle = startAngle + sliceAngle;
    const midAngle = startAngle + sliceAngle / 2;
    const labelPoint = polarToCartesian(center, center, labelRadius, midAngle);

    const tone = getOracleSegmentTone(segment);
    const path = document.createElementNS(svgNs, 'path');
    path.setAttribute('d', describeOracleSlice(center, center, radius, startAngle, endAngle));
    path.setAttribute('class', `oracle-slice is-${tone}`);
    path.setAttribute('data-tone', tone);
    svg.appendChild(path);

    // Keep labels upright on the bottom half of the oracle by flipping 180°.
    const upsideDown = midAngle > 90 && midAngle < 270;
    const labelRotation = upsideDown ? midAngle + 180 : midAngle;
    const text = document.createElementNS(svgNs, 'text');
    text.setAttribute('class', `oracle-label is-${tone}`);
    text.setAttribute('x', String(labelPoint.x));
    text.setAttribute('y', String(labelPoint.y));
    text.setAttribute('transform', `rotate(${labelRotation} ${labelPoint.x} ${labelPoint.y})`);
    text.textContent = getOracleSegmentDisplayLabel(segment);
    svg.appendChild(text);
  });

  const hub = document.createElementNS(svgNs, 'circle');
  hub.setAttribute('class', 'oracle-hub');
  hub.setAttribute('cx', String(center));
  hub.setAttribute('cy', String(center));
  hub.setAttribute('r', '18');
  svg.appendChild(hub);

  oracleGraphic.replaceChildren(svg);
  oracleGraphic.dataset.built = 'true';
  oracleGraphic.dataset.segmentSignature = segmentSignature;
  root.dataset.oracleSegmentIds = segmentSignature;
}

function animateOracleConsultation(root, segmentId) {
  const oracleSvg = root.querySelector('[data-oracle-svg]');
  if (!oracleSvg) {
    return;
  }

  const activeSegmentIds = (root.dataset.oracleSegmentIds || '').split('|').filter(Boolean);
  const segmentIndex = activeSegmentIds.findIndex((id) => id === segmentId);
  if (segmentIndex < 0) {
    return;
  }

  const sliceAngle = 360 / activeSegmentIds.length;
  const currentRotation = Number(root.dataset.oracleRotation || 0);
  const normalizedCurrent = ((currentRotation % 360) + 360) % 360;
  const targetRotation = (360 - ((segmentIndex * sliceAngle) + (sliceAngle / 2))) % 360;
  let delta = targetRotation - normalizedCurrent;

  if (delta < 0) {
    delta += 360;
  }

  const nextRotation = currentRotation + 1080 + delta;
  root.dataset.oracleRotation = String(nextRotation);

  // Clear any prior winner highlight so the animation can replay.
  oracleSvg.querySelectorAll('.oracle-slice.is-winner').forEach((node) => {
    node.classList.remove('is-winner');
  });

  window.requestAnimationFrame(() => {
    oracleSvg.style.transform = `rotate(${nextRotation}deg)`;
  });

  // Highlight the landing slice once the spin settles.
  const winningSlice = oracleSvg.querySelectorAll('.oracle-slice')[segmentIndex];
  if (winningSlice) {
    window.setTimeout(() => {
      winningSlice.classList.add('is-winner');
    }, 2400);
  }
}

// ============ DREAD ORACLE (8-ball replacement for the oracle) ============
const DREAD_RELUCTANT_IDLE = ['WHY ASK', "DON'T", 'ASK ANYWAY', 'FINE', 'IF YOU MUST', 'ENOUGH'];
const DREAD_THINKING = ['THINKING...', 'REGRETTING...', 'CALCULATING DOOM...', 'CONSULTING VOID...', 'PROCESSING DREAD...'];
const DREAD_COIN_GLYPHS = { gloom: '\u2620', luckdust: '\u2726', plague: '\u2623', nothing: '\u25CB', unique: '\u2727' };

function buildEightBall(root) {
  const stage = root && root.querySelector('[data-eightball-stage]');
  if (!stage || stage.dataset.dreadBound === 'true') return;
  const ball = root.querySelector('[data-eightball]');
  const text = root.querySelector('[data-eightball-text]');
  if (!ball || !text) return;
  stage.dataset.dreadBound = 'true';

  // Reluctant idle copy rotation
  let idleIdx = 0;
  window.setInterval(() => {
    if (ball.classList.contains('is-shaking')) return;
    if (text.classList.contains('is-visible') && !text.classList.contains('is-idle')) return;
    idleIdx = (idleIdx + 1) % DREAD_RELUCTANT_IDLE.length;
    text.textContent = DREAD_RELUCTANT_IDLE[idleIdx];
    text.classList.add('is-idle', 'is-visible');
    text.classList.remove('is-gloom', 'is-luckdust', 'is-plague', 'is-nothing', 'is-unique');
  }, 3500);

  // Anxious idle glitch every ~10s
  window.setInterval(() => {
    if (ball.classList.contains('is-shaking')) return;
    ball.classList.add('is-glitching');
    window.setTimeout(() => ball.classList.remove('is-glitching'), 420);
  }, 10000);

  // Cursor-tilt parallax
  stage.addEventListener('mousemove', (event) => {
    if (ball.classList.contains('is-shaking')) return;
    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    ball.style.animation = 'none';
    ball.style.transform = `rotateX(${-y * 18}deg) rotateY(${x * 22}deg) translateZ(0)`;
  });
  stage.addEventListener('mouseleave', () => {
    if (ball.classList.contains('is-shaking')) return;
    ball.style.animation = '';
    ball.style.transform = '';
  });

  // Tapping the ball itself triggers the spin button
  ball.addEventListener('click', () => {
    const spinButton = root.querySelector('[data-oracle-consult]');
    if (spinButton && !spinButton.disabled) spinButton.click();
  });
  ball.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const spinButton = root.querySelector('[data-oracle-consult]');
      if (spinButton && !spinButton.disabled) spinButton.click();
    }
  });
}

function animateEightBallReveal(root, segment) {
  const stage = root && root.querySelector('[data-eightball-stage]');
  const ball = root && root.querySelector('[data-eightball]');
  const win = root && root.querySelector('[data-eightball-window]');
  const text = root && root.querySelector('[data-eightball-text]');
  const coin = root && root.querySelector('[data-eightball-coin]');
  const hint = root && root.querySelector('[data-eightball-hint]');
  if (!stage || !ball || !text || !win || !coin) return;

  if (ball.classList.contains('is-shaking')) return;

  const tone = getOracleSegmentTone(segment);
  const label = getOracleSegmentDisplayLabel(segment) || 'NOTHING';

  // Reset
  ball.style.animation = '';
  ball.style.transform = '';
  text.classList.remove('is-visible', 'is-idle', 'is-gloom', 'is-luckdust', 'is-plague', 'is-nothing', 'is-unique');
  win.classList.remove('is-flash-gloom', 'is-flash-plague', 'is-flash-luckdust');

  // Pre-place the coin so it can tumble during the shake
  coin.textContent = DREAD_COIN_GLYPHS[tone] || '?';
  coin.style.transition = 'none';
  coin.style.opacity = '';

  ball.classList.add('is-shaking');
  stage.classList.add('is-shaking');

  if (hint) {
    hint.textContent = DREAD_THINKING[Math.floor(Math.random() * DREAD_THINKING.length)];
  }

  // Rapid teaser cycling during shake
  const teaserPool = [label, 'NOPE', '???', 'NO', 'WAIT', 'STATIC'];
  const cycle = window.setInterval(() => {
    text.textContent = teaserPool[Math.floor(Math.random() * teaserPool.length)];
  }, 90);

  window.setTimeout(() => {
    window.clearInterval(cycle);
    ball.classList.remove('is-shaking');
    stage.classList.remove('is-shaking');

    // Fade coin away as text reveals
    coin.style.transition = 'opacity 280ms ease';
    coin.style.opacity = '0';

    if (tone === 'plague' || tone === 'gloom') {
      win.classList.add('is-flash-' + tone);
    } else if (tone === 'luckdust') {
      win.classList.add('is-flash-luckdust');
    }

    text.textContent = label;
    text.classList.add('is-visible', 'is-' + tone);

    if (hint) hint.textContent = 'The void answers. Sometimes.';
  }, 1650);
}

function syncSeasonalEventState(state, date = new Date()) {
  const activeEvent = resolveSeasonalEvent(date);
  return {
    ...state,
    seasonalEvent: {
      activeEventId: activeEvent ? activeEvent.event_id : null,
      themeToken: activeEvent ? activeEvent.theme_token : 'default',
      lastCheckedDate: getLocalDateKey(date),
    },
  };
}

function applySeasonalTheme(state) {
  document.body.dataset.eventTheme = (state.seasonalEvent && state.seasonalEvent.themeToken) || 'default';
}

function syncPalNeglectAndMood(state, dateKey = getLocalDateKey()) {
  const lastTaskCompletionDate = getMostRecentTaskCompletionDateKey(state.tasks);
  const fallbackDate = state.meta.firstOpenDate || dateKey;
  const palMoodLedger = normalizePalMoodLedger(state.palMoodLedger, state);

  Object.keys(palMoodLedger).forEach((palId) => {
    const pal = getPalById(palId);
    const ledger = palMoodLedger[palId];
    const neglectAnchor = ledger.lastTaskCompletionDate || lastTaskCompletionDate || fallbackDate;
    const neglectDays = getDaysBetweenDateKeys(neglectAnchor, dateKey);
    const elapsedSyncDays = ledger.lastMoodSyncDate ? getDaysBetweenDateKeys(ledger.lastMoodSyncDate, dateKey) : 1;
    let nextMood = ledger.mood;
    let latestReaction = ledger.latestReaction;

    if (elapsedSyncDays > 0 && neglectDays > 0) {
      nextMood = clampNumber(nextMood - Math.min(neglectDays, elapsedSyncDays) * 2, 0, MAX_RELUCTANT_MOOD);
    }

    if (neglectDays >= 3 && pal) {
      latestReaction = getNeglectDialogue(pal);
    }

    palMoodLedger[palId] = {
      ...ledger,
      hunger: palId === state.activePal ? clampNumber(state.needs.hunger, 0, 100) : ledger.hunger,
      neglectDays,
      mood: nextMood,
      latestReaction,
      lastTaskCompletionDate: ledger.lastTaskCompletionDate || lastTaskCompletionDate,
      lastMoodSyncDate: dateKey,
    };
  });

  return {
    ...state,
    palMoodLedger,
  };
}

function chooseItemBlueprint(source, seasonalEvent) {
  const itemCatalog = typeof ITEM_CATALOG === 'undefined' ? [] : ITEM_CATALOG;
  let candidates = itemCatalog.filter((item) => item.source === source || source === 'seasonal');

  if (seasonalEvent && Array.isArray(seasonalEvent.exclusive_item_pool) && seasonalEvent.exclusive_item_pool.length) {
    const exclusiveItems = seasonalEvent.exclusive_item_pool
      .map((itemId) => getItemBlueprintById(itemId))
      .filter(Boolean);

    if (exclusiveItems.length) {
      candidates = [...exclusiveItems, ...candidates];
    }
  }

  if (!candidates.length) {
    return null;
  }

  return candidates[randomInt(0, candidates.length - 1)];
}

function awardInventoryItem(state, blueprint, overrides = {}) {
  if (!blueprint) {
    return state;
  }

  const nextItem = createInventoryItem(blueprint, overrides);
  return {
    ...state,
    inventory: [nextItem, ...state.inventory].slice(0, ITEM_LOG_LIMIT),
  };
}

function rollDailyDisappointment(state, date = new Date()) {
  const todayKey = getLocalDateKey(date);
  const seasonalEvent = getSeasonalEventById(state.seasonalEvent.activeEventId);

  if (state.dailyDisappointment.lastSpinDate === todayKey) {
    return state;
  }

  const pal = getPalById(state.activePal) || getPalById('xio');
  const rewardEntries = DAILY_DISAPPOINTMENT_REWARDS.map((entry) => ({
    ...entry,
    weight: seasonalEvent && entry.rewardType === 'cosmetic_item' ? entry.weight + 0.4 : entry.weight,
  }));
  const reward = pickWeightedEntry(rewardEntries);
  const amount = reward.minAmount ? randomInt(reward.minAmount, reward.maxAmount) : 0;
  let nextState = { ...state, xp: state.xp, gloom: state.gloom };
  let itemId = null;

  if (reward.rewardType === 'gloom_coins') {
    nextState.gloom += amount;
  }

  if (reward.rewardType === 'xp') {
    nextState.xp += amount;
  }

  if (reward.rewardType === 'cosmetic_item') {
    const blueprint = chooseItemBlueprint('daily_disappointment', seasonalEvent);
    if (blueprint) {
      itemId = blueprint.id;
      nextState = awardInventoryItem(nextState, blueprint, {
        source: seasonalEvent ? 'seasonal' : 'daily_disappointment',
        event_id: seasonalEvent ? seasonalEvent.event_id : null,
      });
      if (state.activePal === 'winta' && (blueprint.rarity === 'rare' || blueprint.rarity === 'cursed')) {
        const entry = nextState.palMoodLedger.winta || {};
        nextState = {
          ...nextState,
          palMoodLedger: {
            ...nextState.palMoodLedger,
            winta: {
              ...entry,
              relationshipScore: clampNumber((entry.relationshipScore || 0) + 5, 0, 100),
            },
          },
        };
        nextState = applyRecoveryGesture(nextState, 'winta', 'milestone_active');
      }
    }
  }

  const rewardRecord = {
    id: createId('reward'),
    date: todayKey,
    rewardType: reward.rewardType,
    label: reward.label,
    amount,
    itemId,
    quip: getDisappointmentQuip(pal, reward.rewardType, seasonalEvent),
    eventId: seasonalEvent ? seasonalEvent.event_id : null,
  };

  nextState.dailyDisappointment = {
    lastSpinDate: todayKey,
    latestResult: rewardRecord,
    rewardLog: [rewardRecord, ...state.dailyDisappointment.rewardLog].slice(0, DAILY_DISAPPOINTMENT_LOG_LIMIT),
  };

  return nextState;
}

function unlockAntiAchievement(state, achievementId, dateKey = getLocalDateKey()) {
  if (state.antiAchievements.unlockedIds.includes(achievementId)) {
    return state;
  }

  const blueprint = (typeof ANTI_ACHIEVEMENTS === 'undefined' ? [] : ANTI_ACHIEVEMENTS).find((achievement) => achievement.id === achievementId);
  if (!blueprint) {
    return state;
  }

  const activePalId = state.activePal || 'xio';
  const palReactionDialogue = blueprint.palDialogue && blueprint.palDialogue[activePalId]
    ? blueprint.palDialogue[activePalId]
    : blueprint.pal_reaction_dialogue;

  const unlockEntry = {
    id: achievementId,
    title: blueprint.title,
    date: dateKey,
    palId: activePalId,
    palReactionDialogue,
  };

  let nextState = {
    ...state,
    antiAchievements: {
      unlockedIds: [...state.antiAchievements.unlockedIds, achievementId],
      unlockLog: [unlockEntry, ...state.antiAchievements.unlockLog].slice(0, TROPHY_LOG_LIMIT),
    },
  };

  if (achievementId === 'participation' || achievementId === 'tried_once') {
    const ribbon = getItemBlueprintById('cursed_participation_ribbon');
    nextState = awardInventoryItem(nextState, ribbon, {
      source: 'achievement',
    });
  }

  return nextState;
}

function evaluateAntiAchievements(state, context = {}) {
  const todayKey = getLocalDateKey();
  let nextState = state;
  const recentDateKeys = new Set(getRecentDateKeys(7));
  const weeklyCompleted = state.tasks.filter((task) => {
    return task.completedAt && recentDateKeys.has(getLocalDateKey(new Date(task.completedAt)));
  }).length;
  const hasSevenDayOpenRun = getRecentDateKeys(7).every((dateKey) => state.meta.openDateHistory.includes(dateKey));
  const completedDuringOpenRun = state.tasks.some((task) => {
    return task.completedAt && recentDateKeys.has(getLocalDateKey(new Date(task.completedAt)));
  });

  if (context.type === 'app_open' && state.meta.openCount === 1 && state.meta.userTaskCreations === 0) {
    nextState = unlockAntiAchievement(nextState, 'tried_once', todayKey);
  }

  if (weeklyCompleted >= 1) {
    nextState = unlockAntiAchievement(nextState, 'participation', todayKey);
  }

  if (state.meta.lastStreakBreakDate === todayKey && state.meta.openCountToday > 1) {
    nextState = unlockAntiAchievement(nextState, 'it_could_be_worse', todayKey);
  }

  if (hasSevenDayOpenRun && !completedDuringOpenRun) {
    nextState = unlockAntiAchievement(nextState, 'administrative_gloom', todayKey);
  }

  if (context.type === 'pal_death') {
    nextState = unlockAntiAchievement(nextState, 'first_loss', todayKey);

    const deathRecord = nextState.deathRecord || [];
    const deadIds = new Set(deathRecord.map((d) => d.palId));
    const hasOrphanedClone = (nextState.clone.history || []).some((clone) =>
      Object.entries(clone.sequence || {}).some(
        ([palId, count]) => count > 0 && deadIds.has(palId)
      )
    );
    if (hasOrphanedClone) {
      nextState = unlockAntiAchievement(nextState, 'rare_clone_lost_parent', todayKey);
    }
  }

  const deepClone = (nextState.clone.history || []).some((c) => (c.generation || 0) >= 5);
  if (deepClone) {
    nextState = unlockAntiAchievement(nextState, 'deep_sequence', todayKey);
  }

  return nextState;
}

function maybeAwardStreakItem(state, streakValue) {
  if (streakValue === 0 || streakValue % 5 !== 0) {
    return state;
  }

  const seasonalEvent = getSeasonalEventById(state.seasonalEvent.activeEventId);
  const blueprint = chooseItemBlueprint('streak', seasonalEvent);
  let nextState = awardInventoryItem(state, blueprint, {
    source: 'streak',
    event_id: seasonalEvent ? seasonalEvent.event_id : null,
  });
  if (state.activePal === 'winta') {
    const entry = nextState.palMoodLedger.winta || {};
    nextState = {
      ...nextState,
      palMoodLedger: {
        ...nextState.palMoodLedger,
        winta: {
          ...entry,
          relationshipScore: clampNumber((entry.relationshipScore || 0) + 5, 0, 100),
        },
      },
    };
    nextState = applyRecoveryGesture(nextState, 'winta', 'milestone_active');
  }
  return nextState;
}

function inferCurrentPage() {
  const path = window.location.pathname.toLowerCase();

  if (!path || path.endsWith('/')) {
    return 'index';
  }

  const match = path.match(/([^/]+)\.html$/);
  return match ? match[1] : 'index';
}

function routeFromIndex() {
  if (appState.activePal) {
    navigateWithAudioResume('pages/home.html');
    return;
  }

  navigateWithAudioResume(`pages/${getNoActivePalRoute(appState)}`);
}

function getNoActivePalRoute(state = getState()) {
  const ownedPals = Array.isArray(state && state.ownedPals)
    ? state.ownedPals.filter((palId) => {
      const pal = getPalById(palId);
      return Boolean(pal && !pal.placeholder);
    })
    : [];

  if (!(state && state.meta && state.meta.onboardingSeen) && ownedPals.length === 0) {
    return 'onboarding.html';
  }

  return ownedPals.length === 0 ? 'adopt.html' : 'choose-pal.html';
}

function redirectToChoosePalIfNoActivePal(targetPath = null) {
  if (getState().activePal) {
    return false;
  }

  navigateWithAudioResume(targetPath || getNoActivePalRoute(getState()));
  return true;
}

function getTaskSummary(tasks) {
  const completedCount = tasks.filter((task) => task.completed).length;
  return {
    total: tasks.length,
    completed: completedCount,
    remaining: tasks.length - completedCount,
  };
}

function getTaskLoad(task) {
  return Number(task.intensity || 0)
    + Number(task.socialWeight || 0)
    + Number(task.energyCost || 0)
    + Number(task.dreadLevel || 0);
}

function getTaskEntryButtonLabel(task) {
  return task.completed ? 'DONE' : 'FINISH';
}

function getTaskEntryMeta(task) {
  const load = getTaskLoad(task);
  const gloomValue = TASK_REWARD + Math.floor(load / 2);
  // For manual/library tasks: drop the redundant "Not rated yet" suffix when unrated
  // (the stats row already shows that badge). Calendar tasks unchanged.
  const isManualOrLibrary = task.source === 'manual' || task.source === 'library';
  const loadSegment = (isManualOrLibrary && load === 0)
    ? ''
    : ` // ${load === 0 ? 'Not rated yet' : `Load ${load}`}`;

  return task.rewardClaimed
    ? `${gloomValue} Gloom logged${loadSegment}`
    : `${gloomValue} Gloom available${loadSegment}`;
}

var TASK_LIBRARY_CATEGORY_META = {
  all:         { icon: '*',  label: 'ALL',     color: '#85f7b8' },
  micro:       { icon: '·',  label: 'MICRO',   color: '#b8e8ff' },
  body:        { icon: '+',  label: 'BODY',    color: '#ff8c72' },
  social:      { icon: '@',  label: 'SOCIAL',  color: '#ffb86b' },
  maintenance: { icon: '#',  label: 'UPKEEP',  color: '#c8a2ff' },
  mind:        { icon: '~',  label: 'MIND',    color: '#9bd9ff' },
  pal:         { icon: '*',  label: 'PAL',     color: '#85f7b8' },
};

function getTaskLibraryCategoryMeta(key, fallbackLabel) {
  var meta = TASK_LIBRARY_CATEGORY_META[key];
  if (meta) return meta;
  return { icon: '*', label: (fallbackLabel || key || 'ITEM').toUpperCase(), color: '#85f7b8' };
}

function buildLibraryStatBar(value, max) {
  var cap = max || 5;
  var filled = Math.max(0, Math.min(cap, Number(value) || 0));
  var html = '<span class="lib-stat-bar" aria-hidden="true">';
  for (var i = 0; i < cap; i += 1) {
    html += '<span class="lib-stat-cell' + (i < filled ? ' is-on' : '') + '"></span>';
  }
  html += '</span>';
  return html;
}

function renderTaskLibrary(root) {
  var state = getState();
  var panel = root.querySelector('[data-library-panel]');
  var tabsContainer = root.querySelector('[data-library-tabs]');
  var listContainer = root.querySelector('[data-library-list]');
  if (!panel || !tabsContainer || !listContainer) {
    return;
  }

  var lib = getAvailableLibraryTasks(state);
  var activeFilter = panel.dataset.activeFilter || 'all';
  var search = (panel.dataset.search || '').trim().toLowerCase();
  var pal = getPalById(state.activePal);
  var palDisplayName = pal ? pal.name : '';
  var filters = lib.categories.concat(lib.palTasks.length ? [state.activePal] : []);
  var tabsHtml = '';

  filters.forEach(function(filter) {
    var isPal = filter === state.activePal;
    var meta = isPal
      ? { icon: '*', label: palDisplayName.toUpperCase(), color: '#85f7b8' }
      : getTaskLibraryCategoryMeta(filter);
    var cls = filter === activeFilter ? 'tab-btn active' : 'tab-btn';
    tabsHtml += '<button class="' + cls + '" type="button" data-library-filter="' + filter
      + '" style="--tab-accent:' + meta.color + ';">'
      + '<span class="tab-btn-icon" aria-hidden="true">' + meta.icon + '</span>'
      + '<span class="tab-btn-label">' + meta.label + '</span>'
      + '</button>';
  });

  tabsContainer.innerHTML = tabsHtml;

  var allTasks = lib.universalTasks.concat(lib.palTasks);
  var filtered = activeFilter === 'all'
    ? allTasks
    : activeFilter === state.activePal
      ? lib.palTasks
      : allTasks.filter(function(task) { return task.category === activeFilter; });

  if (search) {
    filtered = filtered.filter(function(task) {
      return task.title.toLowerCase().indexOf(search) !== -1;
    });
  }

  var listHtml = '';

  filtered.forEach(function(task) {
    var load = task.intensity + task.socialWeight + task.energyCost + task.dreadLevel;
    var gloom = TASK_REWARD + Math.floor(load / 2);
    var catKey = task.palSpecific ? 'pal' : (task.category || 'all');
    var meta = task.palSpecific
      ? { icon: '*', label: palDisplayName.toUpperCase() || 'PAL', color: '#85f7b8' }
      : getTaskLibraryCategoryMeta(catKey);

    listHtml += '<button class="library-card task-library-item" type="button"'
      + ' data-add-library-task="' + task.id + '"'
      + ' data-category="' + catKey + '"'
      + ' style="--card-accent:' + meta.color + ';">'
      + '<span class="library-card-stripe" aria-hidden="true"></span>'
      + '<span class="library-card-head">'
      +   '<span class="library-card-icon" aria-hidden="true">' + meta.icon + '</span>'
      +   '<span class="library-card-cat">' + meta.label + '</span>'
      +   '<span class="library-card-gloom">+' + gloom + '</span>'
      + '</span>'
      + '<span class="library-card-title">' + escapeHtml(task.title) + '</span>'
      + '<span class="library-card-stats">'
      +   '<span class="lib-stat" title="Intensity"><span class="lib-stat-key">INT</span>' + buildLibraryStatBar(task.intensity, 5) + '</span>'
      +   '<span class="lib-stat" title="Social"><span class="lib-stat-key">SOC</span>' + buildLibraryStatBar(task.socialWeight, 5) + '</span>'
      +   '<span class="lib-stat" title="Energy"><span class="lib-stat-key">NRG</span>' + buildLibraryStatBar(task.energyCost, 5) + '</span>'
      +   '<span class="lib-stat" title="Dread"><span class="lib-stat-key">DRD</span>' + buildLibraryStatBar(task.dreadLevel, 5) + '</span>'
      + '</span>'
      + '<span class="library-card-add" aria-hidden="true">+ ADD</span>'
      + '</button>';
  });

  if (!filtered.length) {
    listHtml = '<p class="empty-state-text library-empty">'
      + (search ? 'No matches for "' + escapeHtml(search) + '".' : 'No tasks in this category today.')
      + '</p>';
  }

  listContainer.innerHTML = listHtml;
}

  function getMonthKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function getDateFromMonthKey(monthKey) {
    const [year, month] = String(monthKey).split('-').map(Number);
    return new Date(year || new Date().getFullYear(), ((month || 1) - 1), 1);
  }

  function shiftMonthKey(monthKey, offset) {
    const next = getDateFromMonthKey(monthKey);
    next.setMonth(next.getMonth() + offset);
    return getMonthKey(next);
  }

  function formatCalendarMonthLabel(monthKey) {
    return getDateFromMonthKey(monthKey).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  }

  function getCalendarCategoryMeta(category) {
    return CALENDAR_CATEGORY_META[category] || CALENDAR_CATEGORY_META.focus;
  }

  function getCalendarDialogueCatalog(palId) {
    return (typeof CALENDAR_EVENT_DIALOGUE === 'undefined' ? null : CALENDAR_EVENT_DIALOGUE[palId])
      || (typeof CALENDAR_EVENT_DIALOGUE === 'undefined' ? null : CALENDAR_EVENT_DIALOGUE.xio)
      || {};
  }

  function getCalendarPalTemplate(palId) {
    if (typeof CALENDAR_PAL_TEMPLATES === 'undefined') {
      return null;
    }

    return CALENDAR_PAL_TEMPLATES[palId] || null;
  }

  function getStableIndex(length, seed) {
    const value = String(seed || '0');
    let total = 0;
    for (let index = 0; index < value.length; index += 1) {
      total += value.charCodeAt(index);
    }
    return total % length;
  }

  function getCalendarDialogueLine(palId, reactionType, seed = '', randomize = false) {
    const catalog = getCalendarDialogueCatalog(palId);
    const lines = Array.isArray(catalog[reactionType]) && catalog[reactionType].length
      ? catalog[reactionType]
      : (Array.isArray(getCalendarDialogueCatalog('xio')[reactionType]) ? getCalendarDialogueCatalog('xio')[reactionType] : []);

    if (!lines.length) {
      return 'The calendar recorded the event without improving the atmosphere.';
    }

    return randomize
      ? lines[randomInt(0, lines.length - 1)]
      : lines[getStableIndex(lines.length, `${palId}:${reactionType}:${seed}`)];
  }

  function getCalendarEventLoad(event) {
    return Number(event.intensity || 0) + Number(event.socialWeight || 0) + Number(event.energyCost || 0) + Number(event.dreadLevel || 0);
  }

  function getCalendarTimeMinutes(timeString) {
    if (!timeString || !/^\d{2}:\d{2}$/.test(timeString)) {
      return null;
    }

    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  function doesCalendarEventOccurOnDate(event, dateKey) {
    if (!event || !dateKey || dateKey < event.date) {
      return false;
    }

    if (event.recurrence === 'none') {
      return event.date === dateKey;
    }

    const sourceDate = getDateFromKey(event.date);
    const targetDate = getDateFromKey(dateKey);
    const diffDays = Math.round((targetDate.getTime() - sourceDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return false;
    }

    if (event.recurrence === 'daily') {
      return true;
    }

    if (event.recurrence === 'weekly') {
      return diffDays % 7 === 0;
    }

    if (event.recurrence === 'monthly') {
      return targetDate.getDate() === sourceDate.getDate();
    }

    if (event.recurrence === 'yearly') {
      // Same month and same day-of-month every year.
      // Leap year edge case: if source is Feb 29, also recur on Feb 28
      // in non-leap years so the event does not silently disappear.
      const sourceMonth = sourceDate.getMonth();
      const sourceDay = sourceDate.getDate();
      const targetMonth = targetDate.getMonth();
      const targetDay = targetDate.getDate();

      if (sourceMonth === targetMonth && sourceDay === targetDay) {
        return true;
      }

      // Feb 29 source -> Feb 28 in non-leap years
      if (sourceMonth === 1 && sourceDay === 29 && targetMonth === 1 && targetDay === 28) {
        const targetYear = targetDate.getFullYear();
        const isLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
        if (!isLeap) {
          return true;
        }
      }

      return false;
    }

    return false;
  }

  function getCalendarOccurrencesForDate(events, dateKey) {
    return events
      .filter((event) => doesCalendarEventOccurOnDate(event, dateKey))
      .map((event) => ({
        ...event,
        occurrenceDate: dateKey,
        seasonalEventId: event.seasonalEventId || (resolveSeasonalEvent(getDateFromKey(dateKey)) || {}).event_id || null,
      }))
      .sort((left, right) => {
        if (left.allDay && !right.allDay) {
          return -1;
        }
        if (!left.allDay && right.allDay) {
          return 1;
        }

        const leftMinutes = getCalendarTimeMinutes(left.startTime);
        const rightMinutes = getCalendarTimeMinutes(right.startTime);
        return (leftMinutes ?? 9999) - (rightMinutes ?? 9999);
      });
  }

  function getCalendarOccurrenceStatus(occurrence, referenceDate = new Date()) {
    const todayKey = getLocalDateKey(referenceDate);

    if (occurrence.occurrenceDate < todayKey) {
      return 'overdue';
    }

    if (occurrence.occurrenceDate > todayKey || occurrence.allDay) {
      return 'scheduled';
    }

    const nowMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
    const startMinutes = getCalendarTimeMinutes(occurrence.startTime);
    const endMinutes = getCalendarTimeMinutes(occurrence.endTime || occurrence.startTime);

    if (startMinutes === null) {
      return 'scheduled';
    }

    if (endMinutes !== null && nowMinutes > endMinutes) {
      return 'overdue';
    }

    if (startMinutes >= nowMinutes && startMinutes - nowMinutes <= 60) {
      return 'soon';
    }

    if (nowMinutes >= startMinutes && endMinutes !== null && nowMinutes <= endMinutes) {
      return 'active';
    }

    return 'scheduled';
  }

  function hasCalendarConflict(occurrences) {
    const timed = occurrences
      .filter((event) => !event.allDay && event.startTime)
      .sort((left, right) => (getCalendarTimeMinutes(left.startTime) || 0) - (getCalendarTimeMinutes(right.startTime) || 0));

    for (let index = 1; index < timed.length; index += 1) {
      const previous = timed[index - 1];
      const current = timed[index];
      const previousEnd = getCalendarTimeMinutes(previous.endTime || previous.startTime) || 0;
      const currentStart = getCalendarTimeMinutes(current.startTime) || 0;

      if (currentStart < previousEnd) {
        return true;
      }
    }

    return false;
  }

  function buildCalendarMonthGrid(monthKey, events, selectedDate, extras) {
    const monthStart = getDateFromMonthKey(monthKey);
    const gridStart = new Date(monthStart);
    gridStart.setDate(1 - monthStart.getDay());
    const todayKey = getLocalDateKey();
    const habitHistory = (extras && extras.habitHistory) || {};
    const completionLog = (extras && extras.completionLog) || [];
    const completedByDate = completionLog.reduce((acc, entry) => {
      if (entry && entry.date) acc[entry.date] = (acc[entry.date] || 0) + 1;
      return acc;
    }, {});

    return Array.from({ length: 42 }, (_, index) => {
      const current = new Date(gridStart);
      current.setDate(gridStart.getDate() + index);
      const dateKey = getLocalDateKey(current);
      const occurrences = getCalendarOccurrencesForDate(events, dateKey);
      const eventLoad = occurrences.reduce((sum, event) => sum + getCalendarEventLoad(event), 0);
      const selected = dateKey === selectedDate;
      const seasonalEvent = resolveSeasonalEvent(current);
      const hasOverdue = occurrences.some((event) => getCalendarOccurrenceStatus(event) === 'overdue');
      const hasSoon = occurrences.some((event) => getCalendarOccurrenceStatus(event) === 'soon');

      return {
        dateKey,
        dayNumber: current.getDate(),
        isCurrentMonth: getMonthKey(current) === monthKey,
        isToday: dateKey === todayKey,
        isSelected: selected,
        eventCount: occurrences.length,
        eventLoad,
        hasSeasonalEvent: Boolean(seasonalEvent),
        hasOverdue,
        hasSoon,
        hasHabit: Boolean(habitHistory[dateKey]),
        completedCount: completedByDate[dateKey] || 0,
      };
    });
  }

  function getCalendarEventById(events, eventId) {
    return events.find((event) => event.id === eventId) || null;
  }

  function isCalendarOccurrenceComplete(state, eventId, dateKey) {
    return Boolean((state.calendar.completionLog || []).some((entry) => entry.eventId === eventId && entry.date === dateKey));
  }

  function getCalendarCompletedCount(state) {
    return Array.isArray(state.calendar && state.calendar.completionLog) ? state.calendar.completionLog.length : 0;
  }

  function getCalendarCompletionCountForDate(state, dateKey) {
    return Array.isArray(state.calendar && state.calendar.completionLog)
      ? state.calendar.completionLog.filter((entry) => entry.date === dateKey).length
      : 0;
  }

  function getCalendarCompletionMilestoneCount(state, milestoneEvery) {
    if (!milestoneEvery || milestoneEvery < 1) {
      return 0;
    }

    return Math.floor(getCalendarCompletedCount(state) / milestoneEvery);
  }

  function getCalendarSelectedReactionType(occurrences, dateKey) {
    if (!occurrences.length) {
      return 'emptyDay';
    }

    if (dateKey === getLocalDateKey()) {
      if (occurrences.some((event) => getCalendarOccurrenceStatus(event) === 'overdue')) {
        return 'overdue';
      }

      if (occurrences.some((event) => getCalendarOccurrenceStatus(event) === 'soon')) {
        return 'reminderSoon';
      }
    }

    if (occurrences.length >= 4 || hasCalendarConflict(occurrences) || occurrences.reduce((sum, event) => sum + getCalendarEventLoad(event), 0) >= 14) {
      return 'overbooked';
    }

    return getCalendarCategoryMeta(occurrences[0].category).reactionType;
  }

  function getCalendarSelectedCommentary(state, pal, dateKey, occurrences) {
    const interaction = state.calendar.lastInteraction;
    if (interaction && interaction.date === dateKey && interaction.message) {
      return interaction.message;
    }

    const reactionType = getCalendarSelectedReactionType(occurrences, dateKey);
    return getCalendarDialogueLine(pal.id, reactionType, `${dateKey}:${occurrences.map((event) => event.id).join('|')}`);
  }

  function formatCalendarTimeLabel(event) {
    if (event.allDay) {
      return 'ALL DAY';
    }

    if (event.startTime && event.endTime) {
      return `${event.startTime} - ${event.endTime}`;
    }

    if (event.startTime) {
      return `${event.startTime}`;
    }

    return 'TIMELESS';
  }

  function getCalendarLoadLabel(load) {
    if (load >= 14) {
      return 'CRUSHING';
    }

    if (load >= 8) {
      return 'HEAVY';
    }

    if (load >= 3) {
      return 'MANAGEABLE';
    }

    return 'LIGHT';
  }

function renderTaskList(root, state) {
  const taskList = root.querySelector('[data-task-list]');
  const taskEmpty = root.querySelector('[data-task-empty]');
  const donePanel = root.querySelector('[data-task-done-panel]');
  const doneToggle = root.querySelector('[data-task-done-toggle]');
  const doneList = root.querySelector('[data-task-done-list]');
  const doneCount = root.querySelector('[data-task-done-count]');

  if (!taskList || !taskEmpty || !donePanel || !doneToggle || !doneList || !doneCount) {
    return;
  }

  const entries = getTaskConsoleEntries(state);
  const summary = getTaskSummary(entries);
  const activeEntries = entries.filter((task) => !task.completed);
  // Completed log only keeps the last 24 hours. Older completions stay in
  // state (history/streaks rely on them) but drop off this UI list.
  const COMPLETED_LOG_WINDOW_MS = 24 * 60 * 60 * 1000;
  const completedCutoff = Date.now() - COMPLETED_LOG_WINDOW_MS;
  const completedEntries = entries.filter((task) =>
    task.completed
    && typeof task.completedAt === 'number'
    && task.completedAt >= completedCutoff
  );
  const doolinEntry = state.palMoodLedger.doolin || {};
  const shouldShowPhantomTask = state.activePal === 'doolin' && resolveRelationshipMode(doolinEntry) === 'withdrawn';
  const doneOpen = root.dataset.doneOpen === 'true';
  const renderEntry = (task) => {
    if (task.isPhantom) {
      return `
    <li class="task-item is-ghost is-phantom-task">
      <div class="task-copy">
        <div class="task-title-row">
          <p class="task-title">${escapeHtml(task.title)}</p>
          <span class="task-origin-pill">ECHO</span>
        </div>
        <p class="task-meta">${escapeHtml(task.meta)}</p>
      </div>
    </li>
  `;
    }
    const taskLoad = getTaskLoad(task);
    const ghostExpiryHours = getGhostExpiryHours(task);
    const isExpiringSoon = ghostExpiryHours !== null && ghostExpiryHours <= 3;
    const statsRow = (task.source === 'manual' || task.source === 'library')
      ? taskLoad > 0
        ? `<p class="task-stat-row">
            <span class="task-stat" data-stat="intensity">I ${task.intensity}</span>
            <span class="task-stat" data-stat="social">S ${task.socialWeight}</span>
            <span class="task-stat" data-stat="energy">E ${task.energyCost}</span>
            <span class="task-stat" data-stat="dread">D ${task.dreadLevel}</span>
            <span class="task-stat is-load-total" data-stat="load" data-tip="${escapeHtml(getTaskLoadTooltipCopy(taskLoad))}" tabindex="0">LOAD ${taskLoad}</span>
          </p>`
          : `<p class="task-stat-row"><span class="task-stat is-unrated" data-stat="load" data-tip="${escapeHtml(getUnratedTaskTooltipCopy())}" tabindex="0">Not rated yet</span></p>`
      : '';
    const ghostExpiryRow = ghostExpiryHours !== null
      ? `<p class="task-stat-row"><span class="task-stat is-ghost-expiry${isExpiringSoon ? ' is-expiring-soon' : ''}" data-stat="expiry" data-tip="${escapeHtml(getGhostExpiryTooltipCopy(ghostExpiryHours))}" tabindex="0">expires in ${ghostExpiryHours}h</span></p>`
      : '';
    const originLabel = task.source === 'library' ? 'LIB' : 'TASK';
    return `
    <li class="task-item${task.completed ? ' is-complete' : ''}${task.source === 'ghost' ? ' is-ghost' : ''}${task.status === 'overdue' ? ' is-overdue' : ''}${isExpiringSoon ? ' is-expiring-soon' : ''}">
      <button class="task-toggle" type="button" data-task-toggle="${task.id}" aria-pressed="${task.completed}">
        ${getTaskEntryButtonLabel(task)}
      </button>
      <div class="task-copy">
        <div class="task-title-row">
          <p class="task-title">${escapeHtml(task.title)}</p>
          ${task.source === 'calendar' || task.source === 'library'
            ? `<span class="task-origin-pill${task.source === 'calendar' ? ' is-calendar' : ''}${task.source === 'library' ? ' is-library' : ''}">${originLabel}</span>`
            : ''}
        </div>
        ${statsRow}
        ${ghostExpiryRow}
        <p class="task-meta">${escapeHtml(getTaskEntryMeta(task))}</p>
        ${task.interferenceNote
          ? `<p class="task-meta interference-note">${escapeHtml(task.interferenceNote)}</p>`
          : ''}
      </div>
    </li>
  `;
  };

  const visibleActiveEntries = shouldShowPhantomTask
    ? [{
      id: 'phantom-doolin-task',
      isPhantom: true,
      title: 'Remember to acknowledge the silence you created.',
      meta: 'This was never assigned. It still feels overdue.',
    }, ...activeEntries]
    : activeEntries;

  taskList.innerHTML = visibleActiveEntries.map(renderEntry).join('');
  doneList.innerHTML = completedEntries.map(renderEntry).join('');

  taskEmpty.hidden = summary.total > 0 || shouldShowPhantomTask;
  donePanel.hidden = completedEntries.length === 0;
  doneToggle.setAttribute('aria-expanded', String(doneOpen && completedEntries.length > 0));
  doneList.hidden = !(doneOpen && completedEntries.length > 0);
  doneCount.textContent = String(completedEntries.length).padStart(2, '0');
}

function applyHomeCollapsedState(root, state) {
  const collapsedState = normalizeHomeCollapsedState(state.homeCollapsed);

  root.querySelectorAll('[data-home-collapsible-panel]').forEach((panel) => {
    const panelId = panel.dataset.homeCollapsiblePanel;
    const body = panel.querySelector('[data-home-panel-body]');
    const toggle = panel.querySelector('[data-home-panel-toggle]');
    if (!panelId || !body || !toggle) {
      return;
    }

    const isCollapsed = Boolean(collapsedState[panelId]);
    panel.classList.toggle('is-collapsed', isCollapsed);
    body.setAttribute('aria-hidden', String(isCollapsed));
    toggle.setAttribute('aria-expanded', String(!isCollapsed));
    toggle.setAttribute('aria-label', isCollapsed ? 'Expand panel' : 'Collapse panel');
    toggle.textContent = isCollapsed ? '+ show' : '− hide';
  });
}

function renderCheckinPanel(root, state) {
  const todayKey = getLocalDateKey();
  const checkInComplete = state.dailyCheckIn.date === todayKey;
  const status = root.querySelector('[data-checkin-status]');
  if (status) {
    status.textContent = getCheckInStatus(state);
  }
  const selectedMood = checkInComplete ? state.dailyCheckIn.mood : null;
  root.querySelectorAll('[data-checkin-option]').forEach((button) => {
    button.disabled = checkInComplete;
    button.setAttribute('aria-disabled', String(checkInComplete));
    const isSelected = Boolean(selectedMood) && button.dataset.checkinOption === selectedMood;
    button.classList.toggle('is-selected', isSelected);
    if (isSelected) {
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.removeAttribute('aria-pressed');
    }
  });

  // Combined CTA: gate the Dread Oracle on the daily check-in.
  const panel = root.querySelector('[data-checkin-panel]');
  if (panel) {
    panel.classList.toggle('is-checkin-complete', checkInComplete);

    // Auto-collapse the question body only on the FIRST render of a session
    // where the check-in was already complete on arrival. If the user just
    // answered (panel started pending and is now complete), leave it open so
    // they can see their selection. The collapse kicks in on their next visit.
    if (!panel.dataset.checkinInitialState) {
      panel.dataset.checkinInitialState = checkInComplete ? 'complete' : 'pending';
      if (checkInComplete) {
        panel.classList.add('is-question-collapsed');
      }
    }

    const questionToggle = panel.querySelector('[data-checkin-question-toggle]');
    const questionBody = panel.querySelector('[data-checkin-question-body]');
    if (questionToggle && questionBody) {
      questionToggle.hidden = !checkInComplete;
      const collapsed = panel.classList.contains('is-question-collapsed');
      questionToggle.setAttribute('aria-expanded', String(!collapsed));
      questionToggle.textContent = collapsed ? 'Show options' : 'Hide options';
      questionBody.setAttribute('aria-hidden', String(collapsed));
    }

    // Whole-panel collapse: when BOTH the check-in and the oracle are done
    // for the day, fold the panel body into a one-line recap so the user can
    // get past it. Only auto-collapses on the first render of a session
    // where both were already done on arrival; if either action happened
    // during this session, leave it expanded so the user can see results.
    const oracleSpentToday = state.lastSpinDate === todayKey;
    const fullyDone = checkInComplete && oracleSpentToday;
    if (!panel.dataset.checkinFullyDoneState) {
      panel.dataset.checkinFullyDoneState = fullyDone ? 'done' : 'open';
      if (fullyDone) {
        panel.classList.add('is-panel-collapsed');
      }
    }
    if (!fullyDone) {
      // If the user picks up where they left off (e.g. they consulted the
      // oracle but not the check-in or vice versa), keep the panel open.
      panel.classList.remove('is-panel-collapsed');
    }

    const panelToggle = panel.querySelector('[data-checkin-panel-toggle]');
    const panelBody = panel.querySelector('[data-checkin-panel-body]');
    const recap = panel.querySelector('[data-checkin-recap]');
    if (panelToggle && panelBody) {
      panelToggle.hidden = !fullyDone;
      const collapsed = panel.classList.contains('is-panel-collapsed');
      panelToggle.setAttribute('aria-expanded', String(!collapsed));
      panelToggle.textContent = collapsed ? 'Show' : 'Hide';
      panelBody.setAttribute('aria-hidden', String(collapsed));
    }
    if (recap) {
      recap.hidden = !(fullyDone && panel.classList.contains('is-panel-collapsed'));
    }
  }
  const cta = root.querySelector('[data-checkin-cta]');
  if (cta) {
    const oracleSpent = state.lastSpinDate === todayKey;
    if (!checkInComplete) {
      cta.textContent = 'Answer above. Then the Dread Oracle deigns to respond.';
    } else if (oracleSpent) {
      cta.textContent = "Check-in logged. The Oracle has already weighed in for today.";
    } else {
      cta.textContent = 'Now consult the Dread Oracle below. It was waiting.';
    }
  }
}

function renderSeasonalEventPanel(root, state, pal) {
  if (!pal) return;
  const interference = getCalendarInterferenceState(state, pal.id);
  const tokenEl = root.querySelector('[data-event-theme-token]');
  const nameEl = root.querySelector('[data-event-name]');
  const dialogueEl = root.querySelector('[data-event-dialogue]');
  if (tokenEl) tokenEl.textContent = interference.token;
  if (nameEl) nameEl.textContent = interference.headline;
  if (dialogueEl) dialogueEl.textContent = interference.detail;
}

function renderDisappointmentPanel(root, state) {
  const disappointmentResult = state.dailyDisappointment.latestResult;
  const dateEl = root.querySelector('[data-disappointment-date]');
  const outcomeEl = root.querySelector('[data-disappointment-outcome]');
  const amountEl = root.querySelector('[data-disappointment-amount]');
  const quipEl = root.querySelector('[data-disappointment-quip]');
  if (dateEl) {
    dateEl.textContent = state.dailyDisappointment.lastSpinDate || '---';
  }
  if (outcomeEl) {
    outcomeEl.textContent = disappointmentResult ? disappointmentResult.label.toUpperCase() : 'PENDING';
  }
  if (amountEl) {
    amountEl.textContent = formatDisappointmentValue(disappointmentResult);
  }
  if (quipEl) {
    quipEl.textContent = disappointmentResult
      ? disappointmentResult.quip
      : 'The app has not yet dispensed its formal disappointment.';
  }
}

function renderHome(root) {
  const state = getState();
  var activeLedger = (state.palMoodLedger || {})[state.activePal] || {};
  if (activeLedger.isGhost) {
    document.body.classList.add('ghost-active');
  } else {
    document.body.classList.remove('ghost-active');
  }
  var ghostHtml = getGhostBannerHtml(state);
  syncGhostBanner(root, ghostHtml);
  const pal = getPalById(state.activePal);

  const announcementPanel = root.querySelector('[data-second-pal-announcement]');
  if (announcementPanel) {
    const show = shouldShowSecondPalAnnouncement(state);
    announcementPanel.hidden = !show;
    if (show) {
      const predetermined = getPredeteminedSecondPal(state);
      const nameEl = announcementPanel.querySelector('[data-announcement-pal-name]');
      const bodyEl = announcementPanel.querySelector('[data-announcement-body]');
      if (nameEl && predetermined) {
        nameEl.textContent = `${predetermined.name} Has Located You`;
      }
      if (bodyEl && predetermined) {
        bodyEl.textContent = `${predetermined.name} has the worst stats available and has selected you specifically. Spend ${PAL_ACQUISITION_COST} Luckdust to accept the situation.`;
      }
      announcementPanel.classList.remove('announcement-played');
      requestAnimationFrame(() => announcementPanel.classList.add('announcement-played'));
    }
  }

  // First session panel
  const firstSessionPanel = root.querySelector('[data-first-session-panel]');
  if (firstSessionPanel) {
    const isFirstSession = !state.meta.firstHomeSeen && state.meta.openCount <= 2;
    firstSessionPanel.hidden = !isFirstSession;

    if (isFirstSession && pal) {
      const titleEl = firstSessionPanel.querySelector('[data-first-session-title]');
      const bodyEl  = firstSessionPanel.querySelector('[data-first-session-body]');

      const firstSessionTitles = {
        ahote:    'Oh! You are here! I was just — wait, what do we do now?',
        brutus:   'You showed up. I noted it without enthusiasm.',
        centrama: 'You are here. I have already prepared for several ways this could go wrong.',
        doolin:   'You have arrived. Good. Someone should be witnessing this.',
        elbjorg:  'You found it. The door was unlocked. That was a decision.',
        veruca:   'You made it. I look fine. Ignore the part where I just checked.',
        winta:    'You are here. I was starting to develop a whole narrative about that.',
        xio:      'On time. The plan can proceed.',
        yun:      'Oh. Sorry. I was thinking. You are here though.',
        zenji:    'You arrived. I had accounted for this. Welcome to the schedule.',
      };

      const firstSessionBodies = {
        ahote:    'I have so many ideas and I cannot remember any of them right now. Add a task. We will figure the rest out.',
        brutus:   'There are tasks. There is a care screen. The oracle spins once a day. That is the loop. It is manageable from inside.',
        centrama: 'The tasks need doing. Care needs monitoring. I have already logged fourteen things that could go wrong. We can start anyway.',
        doolin:   'The stage is set. Add something to the task list. Open care. Consult the oracle. The audience expects effort.',
        elbjorg:  'Add a task. Open care when the needs drop. Consult the oracle daily. Do not overthink the perimeter.',
        veruca:   'Tasks go in the list. Care keeps the numbers up. The oracle is once a day. Nothing about this has to be perfect.',
        winta:    'Tasks. Care. Oracle. That is the core loop. I will make it more interesting from here. Watch.',
        xio:      'Task console. Care screen. Dread Oracle. Daily. The system works if you work the system.',
        yun:      'There are tasks. There is a care screen. A oracle. It is quieter than it sounds once you settle into it.',
        zenji:    'Tasks first. Then care. Then the oracle. One thing at a time. I have already alphabetized the approach.',
      };

      if (titleEl && pal.id) {
        titleEl.textContent = firstSessionTitles[pal.id]
          || 'You made it here.';
      }
      if (bodyEl && pal.id) {
        bodyEl.textContent = firstSessionBodies[pal.id]
          || 'They have opinions about this already.';
      }

      firstSessionPanel.classList.remove('announcement-played');
      requestAnimationFrame(() => firstSessionPanel.classList.add('announcement-played'));
    }
  }

  if (!pal) {
    renderNoPalState(root);
    return;
  }

  const todayKey = getLocalDateKey();
  const relationshipEntry = state.palMoodLedger[pal.id] || getDefaultPalMoodEntry(pal.id);
  const relationshipMode = resolveRelationshipMode(relationshipEntry);
  const taskEntries = getTaskConsoleEntries(state);
  const summary = getTaskSummary(taskEntries);
  const emotionalSnapshot = getPalEmotionalSnapshot(state, pal.id);
  const moodState = getMoodDisplayState(emotionalSnapshot.mood);
  const currentMonthKey = getMonthKey();
  const calendarMonthCount = getCalendarMonthOccurrenceCount(state.calendar.events, currentMonthKey);
  const calendarCompletedCount = getCalendarCompletedCount(state);
  const calendarTodayCount = getCalendarCompletionCountForDate(state, todayKey);
  const calendarPressure = getCalendarPressureSnapshot(state);

  const palNameEl = root.querySelector('[data-pal-name]');
  if (palNameEl) {
    palNameEl.textContent = pal.name;
  }
  const relationshipModeEl = root.querySelector('[data-pal-relationship-mode]');
  if (relationshipModeEl) {
    applyRelationshipModeDisplay(relationshipModeEl, relationshipMode);
    setDataTip(relationshipModeEl, getRelationshipModeTooltip(relationshipMode));
  }
  const activeClone = getActiveClone(state);
  const cloneSubtitleEl = root.querySelector('[data-pal-clone-subtitle]');
  if (cloneSubtitleEl) {
    if (activeClone && activeClone.sequenceString) {
      cloneSubtitleEl.textContent = getCloneSubtitleText(activeClone, state);
      cloneSubtitleEl.hidden = false;
    } else {
      cloneSubtitleEl.hidden = true;
    }
  }
  const palIdEl = root.querySelector('[data-pal-id]');
  if (palIdEl) {
    palIdEl.textContent = pal.id.toUpperCase();
  }
  const homeDialogueEl = root.querySelector('[data-pal-dialogue]');
  if (homeDialogueEl) {
    homeDialogueEl.textContent = getVisibleCareDialogue(state, pal, buildDialogue(pal, state));
    homeDialogueEl.classList.toggle('is-empty-dialogue', relationshipMode === 'withdrawn' && pal.id === 'brutus');
    setDataTip(homeDialogueEl, 'Your pal reacts to recent tasks, care state, relationship mode, and seasonal interference.');
  }
  const gloomCountEl = root.querySelector('[data-gloom-count]');
  if (gloomCountEl) {
    gloomCountEl.textContent = String(state.gloom).padStart(3, '0');
    setDataTip(gloomCountEl, getCurrencyTooltipCopy('gloom'));
  }
  const luckdustCountEl = root.querySelector('[data-luckdust-count]');
  if (luckdustCountEl) {
    luckdustCountEl.textContent = String(state.luckdust).padStart(2, '0');
    setDataTip(luckdustCountEl, getCurrencyTooltipCopy('luckdust'));
  }
  const streakCountEl = root.querySelector('[data-streak-count]');
  if (streakCountEl) {
    streakCountEl.textContent = String(state.streak).padStart(2, '0');
    setDataTip(streakCountEl, getCurrencyTooltipCopy('streak'));
  }
  root.querySelector('[data-date-label]').textContent = formatDateLabel();
  renderCheckinPanel(root, state);
  root.querySelector('[data-task-summary]').textContent = `${summary.completed}/${summary.total} tasks survived today`;
  const statLuckEl = root.querySelector('[data-stat-luck]');
  if (statLuckEl) {
    statLuckEl.textContent = String(pal.luck).padStart(2, '0');
    setDataTip(statLuckEl, getPalStatTooltipCopy('luck'));
  }
  const statPessimismEl = root.querySelector('[data-stat-pessimism]');
  if (statPessimismEl) {
    statPessimismEl.textContent = String(pal.pessimism).padStart(2, '0');
    setDataTip(statPessimismEl, getPalStatTooltipCopy('pessimism'));
  }
  const statMutationEl = root.querySelector('[data-stat-mutation]');
  if (statMutationEl) {
    statMutationEl.textContent = String(pal.mutationRisk).padStart(2, '0');
    setDataTip(statMutationEl, getPalStatTooltipCopy('mutation'));
  }
  const cloneBonusEl = root.querySelector('[data-stat-clone-bonus]');
  if (cloneBonusEl) {
    cloneBonusEl.textContent = `+${getCloneGloomBonus(state)}`;
    setDataTip(cloneBonusEl, getPalStatTooltipCopy('cloneBonus'));
  }
  setDataTip(cloneSubtitleEl, activeClone && activeClone.sequenceString ? getPalStatTooltipCopy('cloneBonus') : '');
  renderSeasonalEventPanel(root, state, pal);
  renderDisappointmentPanel(root, state);
  const palMoodStateEl = root.querySelector('[data-pal-mood-state]');
  if (palMoodStateEl) {
    palMoodStateEl.textContent = moodState.toUpperCase();
  }
  const palMoodScoreEl = root.querySelector('[data-pal-mood-score]');
  if (palMoodScoreEl) {
    palMoodScoreEl.textContent = String(Math.round(emotionalSnapshot.mood)).padStart(2, '0');
  }
  const palHungerScoreEl = root.querySelector('[data-pal-hunger-score]');
  if (palHungerScoreEl) {
    palHungerScoreEl.textContent = `${Math.round(emotionalSnapshot.hunger)}%`;
  }
  const palNeglectDaysEl = root.querySelector('[data-pal-neglect-days]');
  if (palNeglectDaysEl) {
    palNeglectDaysEl.textContent = String(emotionalSnapshot.neglectDays).padStart(2, '0');
  }
  const palEmotionDialogueEl = root.querySelector('[data-pal-emotion-dialogue]');
  if (palEmotionDialogueEl) {
    palEmotionDialogueEl.textContent = emotionalSnapshot.latestReaction
      || `${pal.name} is currently ${moodState} in the least dramatic way available.`;
  }
  const homeCalendarMonthEl = root.querySelector('[data-home-calendar-month]');
  if (homeCalendarMonthEl) {
    homeCalendarMonthEl.textContent = String(calendarMonthCount).padStart(2, '0');
  }
  const homeCalendarCompleteEl = root.querySelector('[data-home-calendar-complete]');
  if (homeCalendarCompleteEl) {
    homeCalendarCompleteEl.textContent = String(calendarCompletedCount).padStart(2, '0');
  }
  const homeCalendarTodayEl = root.querySelector('[data-home-calendar-today]');
  if (homeCalendarTodayEl) {
    homeCalendarTodayEl.textContent = String(calendarTodayCount).padStart(2, '0');
  }
  const homeCalendarNoteEl = root.querySelector('[data-home-calendar-note]');
  if (homeCalendarNoteEl) {
    homeCalendarNoteEl.textContent = state.calendar.lastInteraction && state.calendar.lastInteraction.message
      ? state.calendar.lastInteraction.message
      : calendarPressure.overdueCount > 0
        ? `${calendarPressure.overdueCount} overdue orbit item${calendarPressure.overdueCount === 1 ? '' : 's'} are already pushing on care.`
        : calendarPressure.nextOccurrence
          ? `Next orbit item: ${calendarPressure.nextOccurrence.title} on ${calendarPressure.nextOccurrence.occurrenceDate}.`
          : 'No calendar activity has rippled outward yet.';
  }

  const relatedDialogue = root.querySelector('[data-related-dialogue]');
  if (relatedDialogue) {
    const careWeather = buildDialogue(pal, state);
    relatedDialogue.textContent = careWeather
      ? `Current care weather: ${careWeather}`
      : 'No active orbit interference.';
  }

  const centramaPatternPanel = root.querySelector('[data-centrama-pattern-panel]');
  const centramaPatternText = root.querySelector('[data-centrama-pattern]');
  if (centramaPatternPanel) {
    const showPattern = pal.id === 'centrama' && relationshipMode === 'withdrawn' && relationshipEntry.withdrawnPattern;
    centramaPatternPanel.hidden = !showPattern;
    if (showPattern && centramaPatternText) {
      centramaPatternText.textContent = relationshipEntry.withdrawnPattern;
    }
  }

  const criticalPals = getCriticalPals(state);
  const careNavLink = root.querySelector('.bottom-nav [href="home.html"]');
  if (careNavLink) {
    careNavLink.classList.toggle('has-critical-warning', criticalPals.length > 0);
  }

  const image = root.querySelector('[data-pal-image]');
  const placeholder = root.querySelector('[data-pal-placeholder]');
  const frame = root.querySelector('[data-pal-frame]');
  const shipNote = root.querySelector('[data-pal-ship-note]');
  if (image && placeholder && frame) {
    image.alt = `${pal.name} portrait`;
    applyPalPlaceholder(placeholder, pal);
    applyPalFrameAccent(frame, pal, state);
    bindActivePalSpriteImage(image, frame, placeholder, pal.slug || pal.id, state, shipNote);
  }
  renderCheckinPanel(root, state);

  renderTaskList(root, state);
  var libraryPanel = root.querySelector('[data-library-panel]');
  if (libraryPanel && !libraryPanel.hidden) {
    renderTaskLibrary(root);
  }
  applyHomeCollapsedState(root, state);
}

function renderNoPalState(root) {
  root.innerHTML = `
    <section class="panel empty-state-panel" role="status" aria-live="polite">
      <p class="eyebrow">NO PAL ASSIGNED</p>
      <h1 class="screen-title">Daily Decline</h1>
      <p class="empty-copy">No Pal has selected you yet. That is about to change.</p>
      <div class="empty-actions">
        <a class="action-button" href="choose-pal.html">Choose Your Pal</a>
      </div>
    </section>
  `;
}

document.addEventListener('click', function(e) {
  if (e.target.closest('[data-ghost-cure]')) {
    setAppState(function(s) { return cureGhostState(s); });
    var homeRoot = document.querySelector('[data-home-root]');
    var careRoot = document.querySelector('[data-care-root]');
    if (homeRoot) {
      renderHome(homeRoot);
    }
    if (careRoot) {
      renderCare(careRoot);
    }
  }
});

function handleCheckIn(mood) {
  const todayKey = getLocalDateKey();

  if (appState.dailyCheckIn.date === todayKey || !appState.activePal) {
    return;
  }

  const streakAdvance = calculatePrimaryStreakAdvance(appState, todayKey);
  const pal = getPalById(appState.activePal);
  const script = getPalDialogueScript((pal && pal.id) || 'xio');
  const response = `${script[mood] || script.base}${streakAdvance.luckdustReward ? ` Streak reward issued: ${streakAdvance.luckdustReward} Luckdust.` : ''}`;

  setAppState((currentState) => {
    let nextState = {
      ...currentState,
      gloom: currentState.gloom + CHECKIN_REWARD,
      luckdust: currentState.luckdust + streakAdvance.luckdustReward,
      streak: streakAdvance.nextStreak,
      meta: {
        ...currentState.meta,
        lastProgressDate: todayKey,
      },
      dailyCheckIn: {
        date: todayKey,
        mood,
        response,
      },
    };

    if (streakAdvance.changed) {
      if (nextState.streak > (nextState.meta.longestStreak || 0)) {
        nextState = {
          ...nextState,
          meta: { ...nextState.meta, longestStreak: nextState.streak },
        };
      }
      nextState = maybeAwardStreakItem(nextState, streakAdvance.nextStreak);
    }
    nextState = evaluateAntiAchievements(nextState, { type: 'checkin' });
    return nextState;
  });
}

function handleTaskSubmit(root) {
  const input = root.querySelector('[data-task-input]');
  const form = root.querySelector('[data-task-form]');
  const note = root.querySelector('[data-task-form-note]');

  if (!input || !form) {
    return;
  }

  const showNote = (message) => {
    if (!note) return;
    note.textContent = message;
    note.hidden = !message;
  };

  const title = input.value.trim();
  if (!title) {
    input.focus();
    showNote('');
    return;
  }

  if (title.length < MIN_TASK_TITLE_LENGTH) {
    showNote(`Tasks need at least ${MIN_TASK_TITLE_LENGTH} characters. Even dread benefits from labels.`);
    input.focus();
    return;
  }

  const state = getState();
  const lowerTitle = title.toLowerCase();
  const duplicateTask = (state.tasks || []).find((task) =>
    task && !task.completed && typeof task.title === 'string' && task.title.trim().toLowerCase() === lowerTitle
  );
  if (duplicateTask) {
    showNote('That task is already on the list. The void rejects duplicates.');
    input.focus();
    return;
  }

  const now = Date.now();
  const recentCreations = Array.isArray(state.meta.recentTaskCreations) ? state.meta.recentTaskCreations : [];
  const lastCreation = recentCreations[recentCreations.length - 1] || 0;
  if (now - lastCreation < TASK_CREATION_COOLDOWN_MS) {
    const wait = Math.ceil((TASK_CREATION_COOLDOWN_MS - (now - lastCreation)) / 1000);
    showNote(`Slow down. New task available in ${wait}s.`);
    return;
  }
  const lastHourCreations = recentCreations.filter((ts) => now - ts < 60 * 60 * 1000);
  if (lastHourCreations.length >= TASK_CREATION_HOURLY_LIMIT) {
    showNote(`Hourly limit reached (${TASK_CREATION_HOURLY_LIMIT}). Take a breath. Maybe finish one first.`);
    return;
  }

  showNote('');

  const intensityInput = form.querySelector('[data-task-rating-intensity]');
  const socialInput = form.querySelector('[data-task-rating-social]');
  const energyInput = form.querySelector('[data-task-rating-energy]');
  const dreadInput = form.querySelector('[data-task-rating-dread]');
  const intensity = clampNumber(Number(intensityInput && intensityInput.value) || 0, 0, 5);
  const socialWeight = clampNumber(Number(socialInput && socialInput.value) || 0, 0, 5);
  const energyCost = clampNumber(Number(energyInput && energyInput.value) || 0, 0, 5);
  const dreadLevel = clampNumber(Number(dreadInput && dreadInput.value) || 0, 0, 5);

  setAppState((currentState) => {
    const trimmedRecent = (Array.isArray(currentState.meta.recentTaskCreations) ? currentState.meta.recentTaskCreations : [])
      .filter((ts) => now - ts < 60 * 60 * 1000);
    return {
      ...currentState,
      tasks: [
        ...currentState.tasks,
        {
          ...createTask(title),
          intensity,
          socialWeight,
          energyCost,
          dreadLevel,
        },
      ],
      meta: {
        ...currentState.meta,
        userTaskCreations: currentState.meta.userTaskCreations + 1,
        recentTaskCreations: [...trimmedRecent, now].slice(-TASK_CREATION_HOURLY_LIMIT),
      },
    };
  });

  input.value = '';
  if (intensityInput) {
    intensityInput.value = '0';
  }
  if (socialInput) {
    socialInput.value = '0';
  }
  if (energyInput) {
    energyInput.value = '0';
  }
  if (dreadInput) {
    dreadInput.value = '0';
  }
}

function completeCalendarOccurrence(eventId, occurrenceDate) {
  const state = getState();
  const pal = getPalById(state.activePal);
  const targetEvent = getCalendarEventById(state.calendar.events, eventId);

  if (!pal || !targetEvent || !occurrenceDate || isCalendarOccurrenceComplete(state, eventId, occurrenceDate)) {
    return false;
  }

  const completedOccurrence = {
    ...targetEvent,
    occurrenceDate,
  };
  const message = getCalendarDialogueLine(pal.id, 'completed', `${eventId}:${occurrenceDate}`, true);

  setAppState((currentState) => {
    const completionState = {
      ...currentState,
      calendar: {
        ...currentState.calendar,
        completionLog: [
          {
            eventId,
            date: occurrenceDate,
            completedAt: Date.now(),
          },
          ...currentState.calendar.completionLog,
        ].slice(0, 240),
        selectedDate: occurrenceDate,
        visibleMonth: occurrenceDate.slice(0, 7),
      },
    };
    const impactResult = applyCalendarPalImpact(completionState, pal, completedOccurrence, 'completed', message);
    const linkResult = applyCalendarCompletionLinks(currentState, impactResult.nextState, pal, completedOccurrence, message);
    const rewardSuffix = impactResult.impact.summary ? ` ${impactResult.impact.summary}.` : '';
    const copySuffix = impactResult.impact.rewardCopy ? ` ${impactResult.impact.rewardCopy}` : '';
    const linkSuffix = linkResult.bonusMessage ? ` ${linkResult.bonusMessage}` : '';

    return {
      ...linkResult.nextState,
      calendar: {
        ...linkResult.nextState.calendar,
        lastInteraction: {
          type: 'completed',
          message: `${message}${rewardSuffix}${copySuffix}${linkSuffix}`.trim(),
          date: occurrenceDate,
          eventId,
          timestamp: Date.now(),
        },
      },
    };
  });

  return true;
}

function applyPalTaskInterference(state, palId) {
  if (Math.random() > TASK_INTERFERENCE_CHANCE) return state;

  const pal = getPalById(palId);
  if (!pal) return state;

  switch (palId) {
    case 'ahote': {
      const incomplete = state.tasks.filter((task) => !task.completed);
      if (!incomplete.length) return state;
      const target = incomplete[Math.floor(Math.random() * incomplete.length)];
      return applyInterferenceAnnouncement({
        ...state,
        gloom: state.gloom + TASK_REWARD,
        tasks: state.tasks.map((task) =>
          task.id === target.id
            ? {
              ...task,
              completed: true,
              rewardClaimed: true,
              completedAt: Date.now(),
              interferenceNote: 'Ahote says they definitely did this one.',
            }
            : task
        ),
      }, palId);
    }
    case 'brutus': {
      const incomplete = state.tasks.filter((task) => !task.completed);
      if (!incomplete.length) return state;
      const target = incomplete[Math.floor(Math.random() * incomplete.length)];
      return applyInterferenceAnnouncement({
        ...state,
        tasks: state.tasks.filter((task) => task.id !== target.id),
      }, palId);
    }
    case 'centrama': {
      const precautionaryTasks = [
        'Check that the thing you did is still done.',
        'Verify the plan has not changed while you were not looking.',
        'Confirm nothing was missed in the last hour.',
      ];
      const title = precautionaryTasks[Math.floor(Math.random() * precautionaryTasks.length)];
      const newTask = {
        ...createTask(title),
        interferenceNote: 'Centrama added this. Just in case.',
      };
      return applyInterferenceAnnouncement({ ...state, tasks: [...state.tasks, newTask] }, palId);
    }
    case 'doolin': {
      const completed = state.tasks.filter((task) => task.completed && task.rewardClaimed);
      if (!completed.length) return state;
      return applyInterferenceAnnouncement({
        ...state,
        gloom: state.gloom + TASK_REWARD,
      }, palId);
    }
    default:
      return state;
  }
}

function toggleTaskCompletion(taskId) {
  setAppState((currentState) => {
    let gloomReward = 0;
    let improvedMood = false;
    let moodBoost = 0;
    let rewardGranted = false;
    const todayKey = getLocalDateKey();
    const alreadyRewardedToday = currentState.meta.lastTaskRewardDate === todayKey;
    const cloneBonus = getCloneGloomBonus(currentState);

    const nextTasks = currentState.tasks.map((task) => {
      if (task.id !== taskId) {
        return task;
      }

      const completed = !task.completed;
      const rewardClaimed = task.rewardClaimed || completed;

      if (completed && !task.rewardClaimed) {
        const load = getTaskLoad(task);
        if (!alreadyRewardedToday && !rewardGranted) {
          gloomReward += TASK_REWARD + cloneBonus + Math.floor(load / 2);
          rewardGranted = true;
        }
        moodBoost = 6 + (load >= 12 ? 4 : load >= 6 ? 2 : 0);
        improvedMood = true;
      }

      return {
        ...task,
        completed,
        rewardClaimed,
        completedAt: completed ? Date.now() : null,
      };
    });

    let nextState = {
      ...currentState,
      gloom: currentState.gloom + gloomReward,
      tasks: nextTasks,
    };

    if (rewardGranted) {
      nextState = {
        ...nextState,
        meta: {
          ...nextState.meta,
          lastTaskRewardDate: todayKey,
        },
      };

      // Routine log: a task completion also satisfies the daily routine if no
      // calendar-linked habit has logged it yet today. Mirrors the calendar path.
      if (!nextState.habitHistory[todayKey]) {
        nextState = {
          ...nextState,
          habitHistory: {
            ...nextState.habitHistory,
            [todayKey]: true,
          },
        };
        const streakAdvance = calculatePrimaryStreakAdvance(nextState, todayKey);
        nextState = {
          ...nextState,
          streak: streakAdvance.nextStreak,
          luckdust: nextState.luckdust + streakAdvance.luckdustReward,
          meta: {
            ...nextState.meta,
            lastProgressDate: todayKey,
          },
        };
        if (streakAdvance.changed) {
          nextState = maybeAwardStreakItem(nextState, streakAdvance.nextStreak);
        }
      }
    }

    if (improvedMood && currentState.activePal === 'ahote') {
      const task = nextTasks.find((entry) => entry.id === taskId);
      const category = (task && (task.category || task.source)) || 'manual';
      const ahoteEntry = nextState.palMoodLedger.ahote || {};
      const existing = ahoteEntry.taskCategoriesCompleted || {};
      const isNewCategory = !existing[category];
      nextState = {
        ...nextState,
        palMoodLedger: {
          ...nextState.palMoodLedger,
          ahote: {
            ...ahoteEntry,
            taskCategoriesCompleted: {
              ...existing,
              [category]: (existing[category] || 0) + 1,
            },
          },
        },
      };
      if (isNewCategory) {
        nextState = applyRecoveryGesture(nextState, 'ahote', 'new_category');
      }
    }

    if (improvedMood && currentState.activePal && nextState.palMoodLedger[currentState.activePal]) {
      const pal = getPalById(currentState.activePal);
      nextState = {
        ...nextState,
        palMoodLedger: {
          ...nextState.palMoodLedger,
          [currentState.activePal]: {
            ...nextState.palMoodLedger[currentState.activePal],
            mood: clampNumber(nextState.palMoodLedger[currentState.activePal].mood + moodBoost, 0, MAX_RELUCTANT_MOOD),
            neglectDays: 0,
            lastTaskCompletionDate: getLocalDateKey(),
            latestReaction: pal ? getMoodImprovementDialogue(pal) : nextState.palMoodLedger[currentState.activePal].latestReaction,
          },
        },
      };
    }

    nextState = evaluateAntiAchievements(nextState, { type: 'task_completion' });
    if (rewardGranted) {
      nextState = applyPalTaskInterference(nextState, nextState.activePal);
    }
    const task = nextState.tasks.find((entry) => entry.id === taskId);
    if (task && task.source === 'ghost' && task.ghostItemFlavor && task.completed) {
      const ghostItem = {
        id: createId('ghost_item'),
        catalogId: `ghost_${task.ghostPalId}`,
        name: `${task.ghostPalName}'s Parting Weight`,
        image_ref: 'assets/ui/items/parting-weight.png',
        flavor_text: task.ghostItemFlavor,
        rarity: 'cursed',
        date_acquired: getLocalDateKey(),
        source: 'ghost',
        event_id: null,
      };
      nextState = {
        ...nextState,
        inventory: [ghostItem, ...(nextState.inventory || [])].slice(0, ITEM_LOG_LIMIT),
      };
    }
    if (nextState.activePal === 'doolin') {
      const entry = nextState.palMoodLedger.doolin || {};
      nextState = {
        ...nextState,
        palMoodLedger: {
          ...nextState.palMoodLedger,
          doolin: {
            ...entry,
            dialogueDismissedWithoutView: (entry.dialogueDismissedWithoutView || 0) + 1,
          },
        },
      };
    }
    return nextState;
  });
}

function bindHomeEvents(root) {
  if (root.dataset.bound === 'true') {
    return;
  }

  root.addEventListener('submit', (event) => {
    if (event.target.matches('[data-task-form]')) {
      event.preventDefault();
      handleTaskSubmit(root);
      renderHome(root);
    }
  });

  root.addEventListener('input', (event) => {
    if (event.target && event.target.matches('[data-library-search]')) {
      var panel = root.querySelector('[data-library-panel]');
      if (panel) {
        panel.dataset.search = event.target.value || '';
        renderTaskLibrary(root);
      }
    }
  });

  root.addEventListener('click', (event) => {
    const dismissFirstSessionButton = event.target.closest('[data-dismiss-first-session]');
    if (dismissFirstSessionButton) {
      setAppState((currentState) => ({
        ...currentState,
        meta: {
          ...currentState.meta,
          firstHomeSeen: true,
        },
      }));
      const panel = root.querySelector('[data-first-session-panel]');
      if (panel) panel.hidden = true;
      return;
    }

    const dismissAnnouncementButton = event.target.closest('[data-dismiss-announcement]');
    if (dismissAnnouncementButton) {
      setAppState((currentState) => ({
        ...currentState,
        meta: {
          ...currentState.meta,
          secondPalUnlockSeen: true,
        },
      }));
      renderHome(root);
      return;
    }

    const checkInButton = event.target.closest('[data-checkin-option]');
    if (checkInButton) {
      handleCheckIn(checkInButton.dataset.checkinOption);
      renderHome(root);
      return;
    }

    const taskButton = event.target.closest('[data-task-toggle]');
    if (taskButton) {
      toggleTaskCompletion(taskButton.dataset.taskToggle);
      renderHome(root);
      return;
    }

    const openLibraryButton = event.target.closest('[data-open-library]');
    if (openLibraryButton) {
      const panel = root.querySelector('[data-library-panel]');
      if (panel) {
        const minimizeButton = panel.querySelector('[data-minimize-library]');
        if (!panel.hidden) {
          // Already open: toggle minimize.
          const minimized = panel.classList.toggle('is-minimized');
          if (minimizeButton) {
            minimizeButton.setAttribute('aria-expanded', minimized ? 'false' : 'true');
            minimizeButton.textContent = minimized ? '+' : '\u2013';
            minimizeButton.setAttribute('aria-label', minimized ? 'Expand task library' : 'Minimize task library');
          }
          return;
        }
        panel.hidden = false;
        panel.classList.remove('is-minimized');
        if (minimizeButton) {
          minimizeButton.setAttribute('aria-expanded', 'true');
          minimizeButton.textContent = '\u2013';
          minimizeButton.setAttribute('aria-label', 'Minimize task library');
        }
        panel.dataset.activeFilter = 'all';
        panel.dataset.search = '';
        var searchInput = panel.querySelector('[data-library-search]');
        if (searchInput) searchInput.value = '';
        renderTaskLibrary(root);
      }
      return;
    }

    const closeLibraryButton = event.target.closest('[data-close-library]');
    if (closeLibraryButton) {
      const panel = root.querySelector('[data-library-panel]');
      if (panel) {
        panel.hidden = true;
        panel.classList.remove('is-minimized');
      }
      return;
    }

    const minimizeLibraryButton = event.target.closest('[data-minimize-library]');
    if (minimizeLibraryButton) {
      const panel = root.querySelector('[data-library-panel]');
      if (panel) {
        const minimized = panel.classList.toggle('is-minimized');
        minimizeLibraryButton.setAttribute('aria-expanded', minimized ? 'false' : 'true');
        minimizeLibraryButton.textContent = minimized ? '+' : '–';
        minimizeLibraryButton.setAttribute('aria-label', minimized ? 'Expand task library' : 'Minimize task library');
      }
      return;
    }

    const filterButton = event.target.closest('[data-library-filter]');
    if (filterButton) {
      const panel = root.querySelector('[data-library-panel]');
      if (panel) {
        panel.dataset.activeFilter = filterButton.dataset.libraryFilter || 'all';
        renderTaskLibrary(root);
      }
      return;
    }

    const addLibraryTaskButton = event.target.closest('[data-add-library-task]');
    if (addLibraryTaskButton) {
      const taskId = addLibraryTaskButton.dataset.addLibraryTask;
      const entry = TASK_LIBRARY.find(function(task) {
        return task.id === taskId;
      });
      if (!entry) {
        return;
      }

      setAppState((currentState) => ({
        ...currentState,
        tasks: [
          ...currentState.tasks,
          {
            ...createTask(entry.title),
            intensity: entry.intensity,
            socialWeight: entry.socialWeight,
            energyCost: entry.energyCost,
            dreadLevel: entry.dreadLevel,
            source: 'library',
          },
        ],
        meta: {
          ...currentState.meta,
          userTaskCreations: (currentState.meta.userTaskCreations || 0) + 1,
        },
      }));

      const panel = root.querySelector('[data-library-panel]');
      if (panel) {
        panel.hidden = true;
      }
      renderHome(root);
      return;
    }

    const doneToggle = event.target.closest('[data-task-done-toggle]');
    if (doneToggle) {
      root.dataset.doneOpen = root.dataset.doneOpen === 'true' ? 'false' : 'true';
      renderHome(root);
      return;
    }

    const panelToggle = event.target.closest('[data-home-panel-toggle]');
    if (panelToggle) {
      const panelId = panelToggle.dataset.homePanelToggle;
      if (!panelId) {
        return;
      }

      setAppState((currentState) => {
        const currentCollapsed = normalizeHomeCollapsedState(currentState.homeCollapsed);
        return {
          ...currentState,
          homeCollapsed: {
            ...currentCollapsed,
            [panelId]: !currentCollapsed[panelId],
          },
        };
      });
      renderHome(root);
    }
  });

  root.dataset.bound = 'true';
}

function renderCareEmptyState(root) {
  if (typeof window.destroyCareSpriteSystem === 'function') {
    window.destroyCareSpriteSystem();
  }
  if (typeof window.destroyCarePokeSystem === 'function') {
    window.destroyCarePokeSystem();
  }
  root.innerHTML = `
    <section class="panel empty-state-panel" role="status" aria-live="polite">
      <p class="eyebrow">NO PAL ASSIGNED</p>
      <h1 class="screen-title">Maintenance Loop</h1>
      <p class="empty-copy">No Pal has selected you yet. That is about to change.</p>
      <div class="empty-actions">
        <a class="action-button" href="choose-pal.html">Choose Your Pal</a>
      </div>
    </section>
  `;
}

function renderNeedMeter(root, needKey, value) {
  const row = root.querySelector(`[data-need-row="${needKey}"]`);
  if (!row) {
    return;
  }

  const fill = row.querySelector('[data-need-fill]');
  const valueLabel = row.querySelector('[data-need-value]');
  const tone = getNeedTone(needKey, value);

  fill.className = `need-fill ${tone}`;
  fill.style.removeProperty('width');
  fill.style.setProperty('--need-level', String(Math.round(value)));
  row.dataset.needTone = tone;
  valueLabel.textContent = `${Math.round(value)}%`;
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', `${needKey} ${Math.round(value)} percent`);
}

function getTrustMeterTone(value) {
  if (value <= 29) {
    return 'is-trust-cold';
  }

  if (value <= 54) {
    return 'is-trust-warming';
  }

  if (value <= 79) {
    return 'is-trust-open';
  }

  return 'is-trust-bonded';
}

function renderTrustMeter(root, value, tier) {
  const row = root.querySelector('.need-row-trust');
  if (!row) {
    return;
  }

  const fill = row.querySelector('[data-need-fill]');
  const tone = getTrustMeterTone(value);
  const tierLabel = row.querySelector('.trust-tier-label');

  fill.className = `need-fill ${tone}`;
  fill.style.width = `${Math.round(value)}%`;
  row.dataset.needTone = tone;
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', `trust ${Math.round(value)} percent ${String(tier || 'cold')}`);

  if (tierLabel) {
    tierLabel.textContent = String(tier || 'cold').toUpperCase();
    tierLabel.className = `trust-tier-label ${tone}`;
  }
}

function evaluateGiftReaction(palId, itemId) {
  var tags = ITEM_TAGS[itemId] || [];
  var affinities = PAL_GIFT_AFFINITIES[palId] || { loved: [], liked: [], disliked: [] };

  var lovedMatch = 0;
  var likedMatch = 0;
  var dislikedMatch = 0;

  for (var i = 0; i < tags.length; i += 1) {
    if (affinities.loved.indexOf(tags[i]) !== -1) lovedMatch += 1;
    if (affinities.liked.indexOf(tags[i]) !== -1) likedMatch += 1;
    if (affinities.disliked.indexOf(tags[i]) !== -1) dislikedMatch += 1;
  }

  if (dislikedMatch >= 2) return 'disliked';
  if (lovedMatch >= 2) return 'loved';
  if (lovedMatch >= 1) return 'liked';
  if (dislikedMatch >= 1 && likedMatch === 0 && lovedMatch === 0) return 'disliked';
  if (likedMatch >= 1) return 'liked';
  return 'neutral';
}

function getGiftDialogue(palId, reaction) {
  var palLines = GIFT_DIALOGUE[palId];
  if (!palLines) return '';
  return palLines[reaction] || palLines.neutral || '';
}

function canGiftToday(state) {
  var lastGift = state.meta && state.meta.lastGiftDate;
  return lastGift !== getLocalDateKey();
}

function giveGift(itemId) {
  setAppState(function(state) {
    if (!canGiftToday(state)) return state;

    var palId = state.activePal;
    var inventory = (state.inventory || []).slice();
    var itemIndex = -1;
    for (var i = 0; i < inventory.length; i += 1) {
      if (inventory[i] && (inventory[i].id === itemId || inventory[i].itemId === itemId || inventory[i].catalogId === itemId)) {
        itemIndex = i;
        break;
      }
    }
    if (itemIndex === -1) return state;

    var itemEntry = inventory[itemIndex];
    var itemKey = itemEntry.catalogId || itemEntry.itemId || itemEntry.id || itemId;
    inventory.splice(itemIndex, 1);

    var reaction = evaluateGiftReaction(palId, itemKey);
    var rewards = GIFT_REWARDS[reaction] || GIFT_REWARDS.neutral;
    var dialogue = getGiftDialogue(palId, reaction);

    var ledger = state.palMoodLedger || {};
    var entry = ledger[palId] || {};
    var currentTrust = clampNumber((entry.trust || 0) + rewards.trust, 0, 100);
    var currentMood = clampNumber((entry.mood || 50) + rewards.mood, 0, MAX_RELUCTANT_MOOD);
    var currentRelScore = clampNumber((entry.relationshipScore || 0) + (rewards.relationship || 0), 0, 100);
    var nextEntry = syncRelationshipMode({
      ...entry,
      trust: currentTrust,
      mood: currentMood,
      relationshipScore: currentRelScore,
    });

    var giftLog = (state.meta.giftLog || []).slice();
    giftLog.unshift({
      date: getLocalDateKey(),
      palId: palId,
      itemId: itemKey,
      reaction: reaction,
    });
    if (giftLog.length > 30) giftLog = giftLog.slice(0, 30);

    var nextState = {
      ...state,
      inventory: inventory,
      needs: state.activePal === palId
        ? normalizeNeeds({ ...state.needs, mood: currentMood })
        : state.needs,
      palMoodLedger: {
        ...ledger,
        [palId]: nextEntry,
      },
      care: {
        ...state.care,
        reactionType: 'gift_' + reaction,
        dialogue: dialogue,
      },
      meta: {
        ...state.meta,
        lastGiftDate: getLocalDateKey(),
        giftLog: giftLog,
      },
    };
    if (typeof appendActivityToState === 'function') {
      var palName = (typeof getPalById === 'function' && getPalById(palId)) ? getPalById(palId).name : palId;
      var giftDeltas = {};
      if (rewards.trust) giftDeltas.trust = rewards.trust;
      if (rewards.mood) giftDeltas.mood = rewards.mood;
      nextState = appendActivityToState(nextState, {
        palId: palId,
        type: 'gift',
        system: palName + ' received a gift (' + reaction + ').',
        quote: dialogue || '',
        itemId: itemKey,
        deltas: giftDeltas,
        link: 'care',
      });
    }
    return nextState;
  });
}

/* TALK system — lightweight conversational surface.
   Player picks one of 4 moods (vent / gloat / apologize / smalltalk).
   First talk per pal per day grants +1 trust; subsequent talks the same day
   still get a fresh response but no trust bump (so it's not farmable). */
var TALK_MOODS = ['vent', 'gloat', 'apologize', 'smalltalk'];

function pickTalkLine(palId, mood) {
  var bank = (typeof PAL_TALK_DIALOGUE !== 'undefined' && PAL_TALK_DIALOGUE[palId])
    ? PAL_TALK_DIALOGUE[palId]
    : null;
  if (!bank || !Array.isArray(bank[mood]) || !bank[mood].length) {
    var fallback = (typeof PAL_TALK_DIALOGUE !== 'undefined' && PAL_TALK_DIALOGUE.xio && PAL_TALK_DIALOGUE.xio[mood]) || [];
    return fallback[Math.floor(Math.random() * fallback.length)] || '';
  }
  var pool = bank[mood];
  return pool[Math.floor(Math.random() * pool.length)];
}

function talkToActivePal(mood) {
  if (TALK_MOODS.indexOf(mood) === -1) return null;
  var resultLine = '';
  var rewarded = false;
  setAppState(function(state) {
    var palId = state.activePal;
    if (!palId) return state;

    var line = pickTalkLine(palId, mood);
    resultLine = line;

    var talkLog = (state.meta && state.meta.palTalkLog) || {};
    var todayKey = getLocalDateKey();
    var lastTalkKey = talkLog[palId];
    var grantTrust = lastTalkKey !== todayKey;
    rewarded = grantTrust;

    var ledger = state.palMoodLedger || {};
    var entry = ledger[palId] || {};
    var nextEntry = entry;
    if (grantTrust) {
      var nextTrust = clampNumber((entry.trust || 0) + 1, 0, 100);
      nextEntry = { ...entry, trust: nextTrust };
    }

    return {
      ...state,
      palMoodLedger: grantTrust ? { ...ledger, [palId]: nextEntry } : ledger,
      care: {
        ...state.care,
        reactionType: 'talk_' + mood,
        dialogue: line,
      },
      meta: {
        ...state.meta,
        palTalkLog: { ...talkLog, [palId]: todayKey },
      },
    };
  });
  if (rewarded && typeof pushActivity === 'function') {
    var talkPal = (typeof getPalById === 'function') ? getPalById(getState().activePal) : null;
    pushActivity({
      palId: talkPal ? talkPal.id : '',
      type: 'talk',
      system: (talkPal ? talkPal.name : 'Pal') + ' was asked about ' + mood + '.',
      quote: resultLine,
      deltas: { trust: 1 },
      link: 'care',
    });
  }
  return { line: resultLine, rewarded: rewarded };
}

function renderGiftPanel(root, state) {
  var panel = root.querySelector('[data-gift-panel]');
  var list = root.querySelector('[data-gift-list]');
  if (!panel || !list) return;

  var inventory = state.inventory || [];
  if (inventory.length === 0) {
    list.innerHTML = '<p class="empty-state-text">No items in inventory.</p>';
    return;
  }

  var html = '';
  for (var i = 0; i < inventory.length; i += 1) {
    var item = inventory[i];
    var giftId = item.id || item.catalogId || item.itemId || 'unknown-item';
    var name = escapeHtml(item.name || item.catalogId || item.itemId || item.id || 'Unknown Item');
    var rarity = item.rarity || 'common';
    html += '<button type="button" class="gift-item" data-give-gift="' + giftId + '">';
    html += '<span class="gift-item-name">' + name + '</span>';
    html += '<span class="gift-item-rarity rarity-' + rarity + '">' + rarity.toUpperCase() + '</span>';
    html += '</button>';
  }
  list.innerHTML = html;
}

function renderWardrobePanel(root, state, pal) {
  if (!root || !pal) return;
  const panel = root.querySelector('[data-wardrobe-panel]');
  const grid = root.querySelector('[data-wardrobe-grid]');
  const toggle = root.querySelector('[data-wardrobe-toggle]');
  if (!panel || !grid) return;
  const allOutfitsForPal = (typeof getPalOutfitsForPal === 'function')
    ? getPalOutfitsForPal(pal.id)
    : [];
  const ownedIds = (state.palWardrobeOwned && Array.isArray(state.palWardrobeOwned[pal.id]))
    ? state.palWardrobeOwned[pal.id]
    : [];
  const outfits = allOutfitsForPal.filter((o) => ownedIds.indexOf(o.id) !== -1);
  const equippedId = (state.palOutfits && state.palOutfits[pal.id]) || null;
  const unownedCount = allOutfitsForPal.length - outfits.length;
  const canAfford = (state.gloom || 0) >= SHOPPING_TRIP_COST;
  const shopDisabled = unownedCount === 0 || !canAfford;
  let shopLabel;
  if (unownedCount === 0) {
    shopLabel = 'WARDROBE COMPLETE';
  } else if (!canAfford) {
    shopLabel = `NEED ${SHOPPING_TRIP_COST} GLOOM`;
  } else {
    shopLabel = `SEND SHOPPING — ${SHOPPING_TRIP_COST} GLOOM`;
  }

  if (toggle) {
    toggle.disabled = false;
    toggle.setAttribute('aria-disabled', 'false');
  }

  let shopRowHtml = `<div class="wardrobe-shop-row">
      <button type="button" class="action-button wardrobe-shop-btn" data-wardrobe-shop${shopDisabled ? ' disabled' : ''}>${shopLabel}</button>
      <p class="wardrobe-shop-hint">${unownedCount === 0
        ? `${escapeHtml(pal.name)} owns every outfit available to them.`
        : `${unownedCount} outfit${unownedCount === 1 ? '' : 's'} left to discover.`}</p>
      <p class="wardrobe-shop-response" data-wardrobe-shop-response hidden></p>
    </div>`;

  if (!outfits.length) {
    grid.innerHTML = shopRowHtml + `<p class="wardrobe-empty">${escapeHtml(pal.name)}'s wardrobe is empty. Send them shopping to start a collection.</p>`;
    return;
  }

  let html = shopRowHtml;
  html += `<button type="button" class="wardrobe-card${!equippedId ? ' is-equipped' : ''}" data-wardrobe-equip="" aria-pressed="${!equippedId}">
      <span class="wardrobe-card-thumb" aria-hidden="true" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem;letter-spacing:0.1em;">BARE</span>
      <span class="wardrobe-card-name">Base Look</span>
      <span class="wardrobe-card-status">${!equippedId ? 'EQUIPPED' : 'Strip outfit'}</span>
    </button>`;
  for (const outfit of outfits) {
    const path = getPalOutfitAssetPath(outfit);
    const isEquipped = outfit.id === equippedId;
    html += `<button type="button" class="wardrobe-card${isEquipped ? ' is-equipped' : ''}" data-wardrobe-equip="${escapeHtml(outfit.id)}" aria-pressed="${isEquipped}">
      <img class="wardrobe-card-thumb" src="${escapeHtml(path)}" alt="${escapeHtml(outfit.name || 'Outfit')}" loading="lazy">
      <span class="wardrobe-card-name">${escapeHtml(outfit.name || outfit.slug || 'Outfit')}</span>
      <span class="wardrobe-card-status">${isEquipped ? 'EQUIPPED' : 'Equip'}</span>
    </button>`;
  }
  grid.innerHTML = html;
}

/* Wardrobe shopping — spend Gloom, send the active pal shopping, get back
   one personality-flavored outfit unlock. The cost (50) is the rate limit:
   no daily cap, just save up. */
var SHOPPING_TRIP_COST = 50;

function pickShoppingLine(palId) {
  var bank = (typeof PAL_SHOPPING_DIALOGUE !== 'undefined' && PAL_SHOPPING_DIALOGUE[palId])
    ? PAL_SHOPPING_DIALOGUE[palId]
    : null;
  if (!bank || !bank.length) {
    bank = (typeof PAL_SHOPPING_DIALOGUE !== 'undefined' && PAL_SHOPPING_DIALOGUE.xio) || [];
  }
  return bank[Math.floor(Math.random() * bank.length)] || '';
}

function shopForActivePalOutfit() {
  var resultLine = '';
  var grantedOutfit = null;
  var wasError = null;
  setAppState(function(state) {
    var palId = state.activePal;
    if (!palId) {
      wasError = 'no-pal';
      return state;
    }
    if ((state.gloom || 0) < SHOPPING_TRIP_COST) {
      wasError = 'no-gloom';
      return state;
    }

    var allOutfits = (typeof getPalOutfitsForPal === 'function') ? getPalOutfitsForPal(palId) : [];
    var owned = (state.palWardrobeOwned && Array.isArray(state.palWardrobeOwned[palId]))
      ? state.palWardrobeOwned[palId]
      : [];
    var unowned = allOutfits.filter(function(o) { return owned.indexOf(o.id) === -1; });
    if (!unowned.length) {
      wasError = 'complete';
      return state;
    }

    var picked = unowned[Math.floor(Math.random() * unowned.length)];
    grantedOutfit = picked;
    resultLine = pickShoppingLine(palId);

    var nextState = {
      ...state,
      gloom: state.gloom - SHOPPING_TRIP_COST,
      palWardrobeOwned: {
        ...(state.palWardrobeOwned || {}),
        [palId]: owned.concat([picked.id]),
      },
      care: {
        ...state.care,
        reactionType: 'shopping',
        dialogue: resultLine,
      },
    };
    if (typeof appendActivityToState === 'function') {
      var palName = (typeof getPalById === 'function' && getPalById(palId)) ? getPalById(palId).name : palId;
      nextState = appendActivityToState(nextState, {
        palId: palId,
        type: 'shop',
        system: palName + ' bought ' + picked.name + ' (wardrobe).',
        quote: resultLine,
        itemId: picked.id,
        deltas: { gloom: -SHOPPING_TRIP_COST },
        link: 'care',
      });
    }
    return nextState;
  });
  if (wasError) return { error: wasError };
  return { line: resultLine, outfit: grantedOutfit };
}

/* =====================================================================
   PANTRY / FOOD STORE — SCAFFOLDING
   Mirrors the wardrobe flow. One shopping trip costs PANTRY_TRIP_COST
   gloom and stocks the active pal's pantry with a random selection of
   FOOD_CATALOG items. Pals auto-eat from their pantry inside the needs
   tick (see needs.js) when hunger drops below the auto-eat threshold.
   ===================================================================== */
var PANTRY_TRIP_COST = 25;
var PANTRY_TRIP_HAUL_MIN = 2; // items per shopping trip (random within range)
var PANTRY_TRIP_HAUL_MAX = 3;

/**
 * Builds the auto-shop config UI row for a pal. Used by both pantry and
 * toybox panels so the user can opt the pal into automatic restocking with
 * a per-pal daily gloom budget. Category is 'pantry' or 'toybox' — used as
 * a label and to namespace the data attributes.
 */
function renderAutoShopConfigRow(state, pal, category) {
  if (!pal) return '';
  const ledgerEntry = (state && state.palMoodLedger && state.palMoodLedger[pal.id]) || {};
  const enabled = !!ledgerEntry.autoShopEnabled;
  const budget = Math.max(0, Number(ledgerEntry.autoShopDailyBudget) || 0);
  const spentToday = Math.max(0, Number(ledgerEntry.autoShopSpentToday) || 0);
  const todayKey = (typeof getLocalDateKey === 'function') ? getLocalDateKey() : '';
  const spentDisplay = (ledgerEntry.autoShopSpentDate === todayKey) ? spentToday : 0;
  const remaining = Math.max(0, budget - spentDisplay);
  return `<div class="autoshop-row" data-autoshop-row="${pal.id}">
      <label class="autoshop-toggle">
        <input type="checkbox" data-autoshop-toggle="${pal.id}"${enabled ? ' checked' : ''}>
        <span>Auto-shop ${category === 'pantry' ? 'food' : 'toys'} when ${escapeHtml(pal.name)} runs out</span>
      </label>
      <label class="autoshop-budget-label">
        Daily budget:
        <input type="number" min="0" step="10" value="${budget}" data-autoshop-budget="${pal.id}" class="autoshop-budget-input"${enabled ? '' : ' disabled'}>
        <span class="autoshop-budget-unit">gloom</span>
      </label>
      <p class="autoshop-status">Spent today: ${spentDisplay} / ${budget} gloom${enabled ? ` &middot; ${remaining} remaining` : ''}</p>
    </div>`;
}

/* =====================================================================
   Today's stock (browse + individual buy). The user can buy individual
   items from the day's rotating menu instead of (or in addition to) the
   randomized SHOP trip. Prices come from item.cost for food (3/5/8 gloom)
   and TOYBOX_TRIP_COST for toys (no per-toy cost field exists).
   ===================================================================== */
var TOY_INDIVIDUAL_COST = 55; // matches TOYBOX_TRIP_COST so single buys = trip cost

function renderShopStockSection(state, pal, category) {
  if (!pal) return '';
  const rotation = (typeof getDailyShopRotation === 'function')
    ? getDailyShopRotation(category)
    : [];
  if (!rotation.length) return '';
  const gloom = state.gloom || 0;
  const ownedToyIds = (category === 'toy' && state.palToybox && Array.isArray(state.palToybox[pal.id]))
    ? new Set(state.palToybox[pal.id])
    : new Set();
  const heading = category === 'food' ? "TODAY'S MENU" : "TODAY'S TOY STOCK";
  const dataAttr = category === 'food' ? 'data-pantry-buy-item' : 'data-toybox-buy-item';

  // Refresh countdown until local midnight.
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const msLeft = Math.max(0, tomorrow.getTime() - now.getTime());
  const hLeft = Math.floor(msLeft / 3600000);
  const mLeft = Math.floor((msLeft % 3600000) / 60000);
  const refreshLabel = hLeft > 0 ? `${hLeft}h ${mLeft}m` : `${mLeft}m`;

  let slides = '';
  let pips = '';
  rotation.forEach(function(item, idx) {
    const price = (category === 'food')
      ? (typeof item.cost === 'number' ? item.cost : 5)
      : TOY_INDIVIDUAL_COST;
    const isPreferred = Array.isArray(item.palPreference) && item.palPreference.indexOf(pal.id) !== -1;
    const owned = (category === 'toy') && ownedToyIds.has(item.id);
    const canAfford = gloom >= price;
    const disabled = !canAfford || owned;
    const stateClass = owned ? ' is-owned' : (!canAfford ? ' is-locked' : ' is-available');
    const restoreLine = (category === 'food')
      ? `RESTORES +${item.hungerRestore} HUNGER`
      : `RESTORES +${item.moodRestore} MOOD`;
    const path = (category === 'food' && typeof getFoodAssetPath === 'function')
      ? getFoodAssetPath(item)
      : '';
    const thumbInner = path
      ? `<img src="${escapeHtml(path)}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : `<span class="shop-slide-fallback">${escapeHtml(item.name.slice(0, 2).toUpperCase())}</span>`;
    const tags = [];
    if (isPreferred) tags.push('<span class="shop-slide-tag is-fav">FAVORITE</span>');
    if (owned)       tags.push('<span class="shop-slide-tag is-owned">IN COLLECTION</span>');
    const buyLabel = owned ? 'OWNED' : (canAfford ? 'PURCHASE' : 'NEED MORE GLOOM');
    slides += `<article class="shop-slide${stateClass}" data-shop-slide="${idx}" aria-hidden="${idx === 0 ? 'false' : 'true'}">
        <div class="shop-slide-stage" aria-hidden="true">
          <span class="shop-slide-thumb">${thumbInner}</span>
          <span class="shop-slide-glow" aria-hidden="true"></span>
        </div>
        <div class="shop-slide-info">
          ${tags.length ? `<div class="shop-slide-tags">${tags.join('')}</div>` : ''}
          <h5 class="shop-slide-name">${escapeHtml(item.name)}</h5>
          <p class="shop-slide-meta">${restoreLine}</p>
          <div class="shop-slide-cta">
            <span class="shop-slide-price${canAfford ? '' : ' is-locked'}">
              <span class="shop-slide-price-value">${price}</span>
              <span class="shop-slide-price-unit">GLOOM</span>
            </span>
            <button type="button" class="shop-slide-buy" ${dataAttr}="${escapeHtml(item.id)}"${disabled ? ' disabled' : ''} aria-label="Buy ${escapeHtml(item.name)} for ${price} gloom">${buyLabel}</button>
          </div>
        </div>
      </article>`;
    pips += `<button type="button" class="shop-pip${idx === 0 ? ' is-active' : ''}" data-shop-pip="${idx}" aria-label="Item ${idx + 1} of ${rotation.length}"></button>`;
  });

  return `<section class="shop-stock-section" data-shop-carousel>
      <header class="shop-stock-header">
        <div class="shop-stock-titles">
          <h4 class="shop-stock-heading">${heading}</h4>
          <p class="shop-stock-counter"><span data-shop-index>1</span> / ${rotation.length} &middot; refresh ${refreshLabel}</p>
        </div>
        <span class="shop-stock-wallet" title="Your gloom balance"><span class="shop-stock-wallet-value">${gloom}</span><span class="shop-stock-wallet-unit">GLOOM</span></span>
      </header>
      <div class="shop-stock-stage-wrap">
        <button type="button" class="shop-carousel-arrow is-prev" data-shop-arrow="prev" aria-label="Previous item" aria-disabled="true">&lsaquo;</button>
        <div class="shop-stock-track" data-shop-track>${slides}</div>
        <button type="button" class="shop-carousel-arrow is-next" data-shop-arrow="next" aria-label="Next item">&rsaquo;</button>
      </div>
      <nav class="shop-pip-row" aria-label="Stock pages">${pips}</nav>
    </section>`;
}

/* One-slide-at-a-time carousel: pips + arrows + scroll-snap, all synced.
   Idempotent — safe to call after every renderCare. */
function setupShopCarousels(root) {
  if (!root) return;
  const carousels = root.querySelectorAll('[data-shop-carousel]');
  carousels.forEach(function(carousel) {
    const track = carousel.querySelector('[data-shop-track]');
    const prev = carousel.querySelector('[data-shop-arrow="prev"]');
    const next = carousel.querySelector('[data-shop-arrow="next"]');
    const pips = carousel.querySelectorAll('[data-shop-pip]');
    const indexEl = carousel.querySelector('[data-shop-index]');
    const slides = carousel.querySelectorAll('[data-shop-slide]');
    if (!track || !slides.length) return;


    // Restore scroll position to saved index if present
    let savedIdx = parseInt(carousel.dataset.shopCurrentIdx || '0', 10);
    if (isNaN(savedIdx) || savedIdx < 0 || savedIdx >= slides.length) savedIdx = 0;
    track.scrollLeft = savedIdx * track.clientWidth;

    // Only update pip/index/arrow, never aria-hidden or scroll position.
    const sync = function() {
      const w = track.clientWidth || 1;
      const idx = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / w)));
      // Save current index to carousel for next render
      carousel.dataset.shopCurrentIdx = String(idx);
      pips.forEach(function(p, i) { p.classList.toggle('is-active', i === idx); });
      if (indexEl) indexEl.textContent = String(idx + 1);
      if (prev) prev.setAttribute('aria-disabled', idx <= 0 ? 'true' : 'false');
      if (next) next.setAttribute('aria-disabled', idx >= slides.length - 1 ? 'true' : 'false');
    };

    if (!track.dataset.shopCarouselBound) {
      track.addEventListener('scroll', sync, { passive: true });
      window.addEventListener('resize', sync, { passive: true });
      pips.forEach(function(pip, i) {
        pip.addEventListener('click', function() {
          track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
          carousel.dataset.shopCurrentIdx = String(i);
        });
      });
      if (prev) prev.addEventListener('click', function() {
        let idx = parseInt(carousel.dataset.shopCurrentIdx || '0', 10);
        idx = Math.max(0, idx - 1);
        track.scrollTo({ left: idx * track.clientWidth, behavior: 'smooth' });
        carousel.dataset.shopCurrentIdx = String(idx);
      });
      if (next) next.addEventListener('click', function() {
        let idx = parseInt(carousel.dataset.shopCurrentIdx || '0', 10);
        idx = Math.min(slides.length - 1, idx + 1);
        track.scrollTo({ left: idx * track.clientWidth, behavior: 'smooth' });
        carousel.dataset.shopCurrentIdx = String(idx);
      });
      track.dataset.shopCarouselBound = '1';
    }
    sync();
  });
}

function buyPantryItemForActivePal(itemId) {
  let resultLine = '';
  let boughtFood = null;
  let wasError = null;
  setAppState(function(state) {
    const palId = state.activePal;
    if (!palId) { wasError = 'no-pal'; return state; }
    const food = (typeof getFoodById === 'function') ? getFoodById(itemId) : null;
    if (!food) { wasError = 'no-item'; return state; }
    const todayKey = (typeof getLocalDateKey === 'function') ? getLocalDateKey() : '';
    const rotation = (typeof getDailyShopRotation === 'function')
      ? getDailyShopRotation('food', todayKey)
      : [];
    if (rotation.length && !rotation.find((f) => f.id === itemId)) {
      wasError = 'not-in-stock'; return state;
    }
    const price = (typeof food.cost === 'number') ? food.cost : 5;
    if ((state.gloom || 0) < price) { wasError = 'no-gloom'; return state; }
    boughtFood = food;
    resultLine = (typeof pickShoppingLine === 'function') ? pickShoppingLine(palId) : '';

    const existing = (state.palPantry && Array.isArray(state.palPantry[palId]))
      ? state.palPantry[palId].map((row) => ({ itemId: row.itemId, qty: row.qty }))
      : [];
    const found = existing.find((r) => r.itemId === food.id);
    if (found) { found.qty += 1; } else { existing.push({ itemId: food.id, qty: 1 }); }

    let nextState = {
      ...state,
      gloom: (state.gloom || 0) - price,
      palPantry: { ...(state.palPantry || {}), [palId]: existing },
    };
    if (typeof appendActivityToState === 'function') {
      const palName = (typeof getPalById === 'function' && getPalById(palId)) ? getPalById(palId).name : palId;
      nextState = appendActivityToState(nextState, {
        palId: palId,
        type: 'shop',
        ts: Date.now(),
        system: `${palName} bought ${food.name}.`,
        quote: resultLine || (food.quote || ''),
        itemId: food.id,
        itemSlug: food.slug || '',
        deltas: { gloom: -price },
        link: 'care',
      });
    }
    return nextState;
  });
  if (wasError) return { error: wasError };
  return { food: boughtFood, line: resultLine };
}

function buyToyboxItemForActivePal(itemId) {
  let boughtToy = null;
  let resultLine = '';
  let wasError = null;
  setAppState(function(state) {
    const palId = state.activePal;
    if (!palId) { wasError = 'no-pal'; return state; }
    const toy = (typeof getToyById === 'function') ? getToyById(itemId) : null;
    if (!toy) { wasError = 'no-item'; return state; }
    const todayKey = (typeof getLocalDateKey === 'function') ? getLocalDateKey() : '';
    const rotation = (typeof getDailyShopRotation === 'function')
      ? getDailyShopRotation('toy', todayKey)
      : [];
    if (rotation.length && !rotation.find((t) => t.id === itemId)) {
      wasError = 'not-in-stock'; return state;
    }
    const price = TOY_INDIVIDUAL_COST;
    if ((state.gloom || 0) < price) { wasError = 'no-gloom'; return state; }
    const owned = (state.palToybox && Array.isArray(state.palToybox[palId])) ? state.palToybox[palId].slice() : [];
    if (owned.indexOf(toy.id) !== -1) { wasError = 'already-owned'; return state; }
    boughtToy = toy;
    resultLine = (typeof pickShoppingLine === 'function') ? pickShoppingLine(palId) : '';

    let nextState = {
      ...state,
      gloom: (state.gloom || 0) - price,
      palToybox: { ...(state.palToybox || {}), [palId]: owned.concat([toy.id]) },
    };
    if (typeof appendActivityToState === 'function') {
      const palName = (typeof getPalById === 'function' && getPalById(palId)) ? getPalById(palId).name : palId;
      nextState = appendActivityToState(nextState, {
        palId: palId,
        type: 'shop',
        ts: Date.now(),
        system: `${palName} bought ${toy.name}.`,
        quote: resultLine || '',
        itemId: toy.id,
        itemSlug: toy.slug || '',
        deltas: { gloom: -price },
        link: 'care',
      });
    }
    return nextState;
  });
  if (wasError) return { error: wasError };
  return { toy: boughtToy, line: resultLine };
}

function renderPantryPanel(root, state, pal) {
  if (!root || !pal) return;
  const panel = root.querySelector('[data-pantry-panel]');
  const grid = root.querySelector('[data-pantry-grid]');
  const toggle = root.querySelector('[data-pantry-toggle]');
  if (!panel || !grid) return;

  // If the user is currently typing into the autoshop budget input inside
  // this panel, skip the rebuild — otherwise the 1s renderCare tick clobbers
  // their keystrokes. The change handler will trigger a re-render on blur.
  const active = document.activeElement;
  if (active && panel.contains(active) && active.matches('[data-autoshop-budget]')) {
    return;
  }

  const rows = (typeof getPantryRowsForPal === 'function')
    ? getPantryRowsForPal(state, pal.id)
    : [];
  const total = rows.reduce((acc, row) => acc + (row.qty || 0), 0);
  const canAfford = (state.gloom || 0) >= PANTRY_TRIP_COST;
  const shopDisabled = !canAfford;
  const shopLabel = !canAfford
    ? `NEED ${PANTRY_TRIP_COST} GLOOM`
    : `SEND TO FOOD STORE — ${PANTRY_TRIP_COST} GLOOM`;

  if (toggle) {
    toggle.disabled = false;
    toggle.setAttribute('aria-disabled', 'false');
  }

  let shopRowHtml = `<div class="wardrobe-shop-row pantry-shop-row">
      <button type="button" class="action-button wardrobe-shop-btn pantry-shop-btn" data-pantry-shop${shopDisabled ? ' disabled' : ''}>${shopLabel}</button>
      <button type="button" class="action-button wardrobe-shop-btn pantry-shop-all-btn" data-pantry-shop-all${shopDisabled ? ' disabled' : ''} title="Restock pantry for every owned pal">SHOP FOR ALL PALS</button>
      <p class="wardrobe-shop-hint">${total === 0
        ? `${escapeHtml(pal.name)}'s pantry is empty. Send them out for groceries.`
        : `${total} item${total === 1 ? '' : 's'} stocked. They will eat on their own when hungry.`}</p>
      <p class="wardrobe-shop-response" data-pantry-shop-response hidden></p>
      ${renderShopStockSection(state, pal, 'food')}
      ${renderAutoShopConfigRow(state, pal, 'pantry')}
    </div>`;

  if (!rows.length) {
    grid.innerHTML = shopRowHtml + `<p class="wardrobe-empty pantry-empty">No food stocked. ${escapeHtml(pal.name)} will not auto-eat until you send them shopping.</p>`;
    return;
  }

  let html = shopRowHtml;
  for (const row of rows) {
    const food = (typeof getFoodById === 'function') ? getFoodById(row.itemId) : null;
    if (!food) continue;
    const path = (typeof getFoodAssetPath === 'function') ? getFoodAssetPath(food) : '';
    const isPreferred = Array.isArray(food.palPreference) && food.palPreference.indexOf(pal.id) !== -1;
    const tag = food.tag || 'neutral';
    const cost = (typeof food.cost === 'number') ? food.cost : 0;
    const quote = food.quote || '';
    html += `<article class="wardrobe-card pantry-card pantry-tag-${escapeHtml(tag)}${isPreferred ? ' is-preferred' : ''}" data-pantry-item="${escapeHtml(food.id)}" title="${escapeHtml(quote)}">
      <span class="wardrobe-card-thumb pantry-card-thumb" aria-hidden="true">
        <img src="${escapeHtml(path)}" alt="" loading="lazy" onerror="this.style.display='none'">
        <span class="pantry-card-fallback">${escapeHtml(food.name.slice(0, 2).toUpperCase())}</span>
      </span>
      <span class="wardrobe-card-name pantry-card-name">${escapeHtml(food.name)}</span>
      <span class="wardrobe-card-status pantry-card-status">x${row.qty} · +${food.hungerRestore}${cost ? ' · ' + cost + ' GLOOM' : ''}</span>
      <span class="pantry-card-tag pantry-card-tag-${escapeHtml(tag)}">${escapeHtml(tag.toUpperCase())}</span>
    </article>`;
  }
  grid.innerHTML = html;
}

function pickPantryHaulForPal(palId) {
  if (typeof FOOD_CATALOG === 'undefined' || !FOOD_CATALOG.length) return [];
  // Draw from today's rotating stock so the shop has a curated daily menu
  // rather than the full 50-item catalog. Falls back to the full catalog if
  // the rotation helper isn't loaded.
  var rotation = (typeof getDailyShopRotation === 'function')
    ? getDailyShopRotation('food')
    : [];
  var pool = rotation.length ? rotation : FOOD_CATALOG;
  const haulSize = PANTRY_TRIP_HAUL_MIN + Math.floor(Math.random() * (PANTRY_TRIP_HAUL_MAX - PANTRY_TRIP_HAUL_MIN + 1));
  // Bias toward preferred items: 60% chance each haul slot pulls from
  // preferred subset (when available), otherwise the rotation pool.
  const preferred = pool.filter((f) => Array.isArray(f.palPreference) && f.palPreference.indexOf(palId) !== -1);
  const picks = [];
  for (let i = 0; i < haulSize; i++) {
    const choosePool = (preferred.length && Math.random() < 0.6) ? preferred : pool;
    picks.push(choosePool[Math.floor(Math.random() * choosePool.length)]);
  }
  return picks;
}

function shopForActivePalPantry() {
  var resultLine = '';
  var grantedHaul = [];
  var wasError = null;
  setAppState(function(state) {
    var palId = state.activePal;
    if (!palId) { wasError = 'no-pal'; return state; }
    if ((state.gloom || 0) < PANTRY_TRIP_COST) { wasError = 'no-gloom'; return state; }

    var picks = pickPantryHaulForPal(palId);
    if (!picks.length) { wasError = 'no-catalog'; return state; }
    grantedHaul = picks;
    resultLine = (typeof pickShoppingLine === 'function') ? pickShoppingLine(palId) : '';

    var existing = (state.palPantry && Array.isArray(state.palPantry[palId]))
      ? state.palPantry[palId].map(function(row) { return { itemId: row.itemId, qty: row.qty }; })
      : [];
    picks.forEach(function(food) {
      var found = existing.find(function(row) { return row.itemId === food.id; });
      if (found) { found.qty += 1; } else { existing.push({ itemId: food.id, qty: 1 }); }
    });

    var nextState = {
      ...state,
      gloom: state.gloom - PANTRY_TRIP_COST,
      palPantry: { ...(state.palPantry || {}), [palId]: existing },
      care: { ...state.care, reactionType: 'shopping', dialogue: resultLine },
    };
    if (typeof appendActivityToState === 'function') {
      var palName = (typeof getPalById === 'function' && getPalById(palId)) ? getPalById(palId).name : palId;
      var haulSummary = picks.map(function(f){ return f.name; }).join(', ');
      nextState = appendActivityToState(nextState, {
        palId: palId,
        type: 'shop',
        system: palName + ' restocked the pantry: ' + haulSummary + '.',
        quote: resultLine,
        deltas: { gloom: -PANTRY_TRIP_COST },
        link: 'care',
      });
    }
    return nextState;
  });
  if (wasError) return { error: wasError };
  return { line: resultLine, haul: grantedHaul };
}

/* Shop the pantry for every owned, alive pal in one trip. Costs
   PANTRY_TRIP_COST × (number of pals stocked). Skips pals who can't
   be stocked (e.g. dead). Stops short if gloom runs out partway. */
function shopPantryForAllOwnedPals() {
  var stocked = [];
  var spent = 0;
  setAppState(function(state) {
    var owned = (state.ownedPals || []).filter(function(pid) {
      var entry = state.palMoodLedger && state.palMoodLedger[pid];
      return entry && !entry.isDead;
    });
    if (!owned.length) return state;
    var nextState = { ...state };
    var nextPantry = { ...(state.palPantry || {}) };
    owned.forEach(function(pid) {
      if ((nextState.gloom || 0) < PANTRY_TRIP_COST) return;
      var picks = pickPantryHaulForPal(pid);
      if (!picks.length) return;
      var existing = Array.isArray(nextPantry[pid])
        ? nextPantry[pid].map(function(row) { return { itemId: row.itemId, qty: row.qty }; })
        : [];
      picks.forEach(function(food) {
        var found = existing.find(function(row) { return row.itemId === food.id; });
        if (found) { found.qty += 1; } else { existing.push({ itemId: food.id, qty: 1 }); }
      });
      nextPantry[pid] = existing;
      nextState.gloom = (nextState.gloom || 0) - PANTRY_TRIP_COST;
      spent += PANTRY_TRIP_COST;
      stocked.push({ palId: pid, picks: picks });
    });
    nextState.palPantry = nextPantry;
    if (typeof appendActivityToState === 'function' && stocked.length) {
      stocked.forEach(function(s) {
        var palName = (typeof getPalById === 'function' && getPalById(s.palId)) ? getPalById(s.palId).name : s.palId;
        var haul = s.picks.map(function(f){ return f.name; }).join(', ');
        nextState = appendActivityToState(nextState, {
          palId: s.palId,
          type: 'shop',
          system: palName + ' restocked the pantry: ' + haul + '.',
          deltas: { gloom: -PANTRY_TRIP_COST },
          link: 'care',
        });
      });
    }
    return nextState;
  });
  return { stocked: stocked, spent: spent };
}

/* =====================================================================
   TOYBOX / TOY STORE — SCAFFOLDING
   Toys are durable. One trip costs TOYBOX_TRIP_COST gloom and grants 1
   new toy the pal does not already own. Auto-play happens in needs.js
   when the pal's boredom drops below AUTO_PLAY_THRESHOLD.
   ===================================================================== */
var TOYBOX_TRIP_COST = 55;

function renderToyboxPanel(root, state, pal) {
  if (!root || !pal) return;
  const panel = root.querySelector('[data-toybox-panel]');
  const grid = root.querySelector('[data-toybox-grid]');
  const toggle = root.querySelector('[data-toybox-toggle]');
  if (!panel || !grid) return;

  // Skip rebuild while the user is editing the autoshop budget input.
  const active = document.activeElement;
  if (active && panel.contains(active) && active.matches('[data-autoshop-budget]')) {
    return;
  }

  const ownedIds = (typeof getToyboxIdsForPal === 'function')
    ? getToyboxIdsForPal(state, pal.id)
    : [];
  const total = ownedIds.length;
  const totalCatalog = (typeof TOY_CATALOG !== 'undefined') ? TOY_CATALOG.length : 0;
  const allOwned = totalCatalog > 0 && total >= totalCatalog;
  const canAfford = (state.gloom || 0) >= TOYBOX_TRIP_COST;
  const shopDisabled = !canAfford || allOwned;
  const shopLabel = allOwned
    ? 'EVERY TOY OWNED'
    : (!canAfford ? `NEED ${TOYBOX_TRIP_COST} GLOOM` : `SEND TO TOY STORE — ${TOYBOX_TRIP_COST} GLOOM`);

  if (toggle) {
    toggle.disabled = false;
    toggle.setAttribute('aria-disabled', 'false');
  }

  let shopRowHtml = `<div class="wardrobe-shop-row toybox-shop-row">
      <button type="button" class="action-button wardrobe-shop-btn toybox-shop-btn" data-toybox-shop${shopDisabled ? ' disabled' : ''}>${shopLabel}</button>
      <button type="button" class="action-button wardrobe-shop-btn toybox-shop-all-btn" data-toybox-shop-all${shopDisabled ? ' disabled' : ''} title="Buy a new toy for every owned pal">SHOP FOR ALL PALS</button>
      <p class="wardrobe-shop-hint">${total === 0
        ? `${escapeHtml(pal.name)} has no toys. They will not auto-play until you send them shopping.`
        : `${total} toy${total === 1 ? '' : 's'} owned. They play with one when mood drops.`}</p>
      <p class="wardrobe-shop-response" data-toybox-shop-response hidden></p>
      ${renderShopStockSection(state, pal, 'toy')}
      ${renderAutoShopConfigRow(state, pal, 'toybox')}
    </div>`;

  if (!ownedIds.length) {
    grid.innerHTML = shopRowHtml + `<p class="wardrobe-empty toybox-empty">No toys yet. Send ${escapeHtml(pal.name)} to the toy store.</p>`;
    return;
  }

  let html = shopRowHtml;
  for (const id of ownedIds) {
    const toy = (typeof getToyById === 'function') ? getToyById(id) : null;
    if (!toy) continue;
    const path = (typeof getToyAssetPath === 'function') ? getToyAssetPath(toy) : '';
    const isPreferred = Array.isArray(toy.palPreference) && toy.palPreference.indexOf(pal.id) !== -1;
    html += `<article class="wardrobe-card toybox-card pantry-card${isPreferred ? ' is-preferred' : ''}" data-toybox-item="${escapeHtml(toy.id)}">
      <span class="wardrobe-card-thumb pantry-card-thumb" aria-hidden="true">
        <img src="${escapeHtml(path)}" alt="" loading="lazy" onerror="this.style.display='none'">
        <span class="pantry-card-fallback">${escapeHtml(toy.name.slice(0, 2).toUpperCase())}</span>
      </span>
      <span class="wardrobe-card-name pantry-card-name">${escapeHtml(toy.name)}</span>
      <span class="wardrobe-card-status pantry-card-status">+${toy.moodRestore} MOOD</span>
      ${isPreferred ? '<span class="pantry-card-pref">FAVORITE</span>' : ''}
    </article>`;
  }
  grid.innerHTML = html;
}

function pickToyHaulForPal(palId, ownedIds) {
  if (typeof TOY_CATALOG === 'undefined' || !TOY_CATALOG.length) return null;
  const owned = new Set(ownedIds || []);
  // Draw from today's rotating stock first; fall back to the full catalog if
  // every rotated toy is already owned (so users aren't blocked).
  var rotation = (typeof getDailyShopRotation === 'function')
    ? getDailyShopRotation('toy')
    : [];
  var rotationRemaining = rotation.filter((t) => !owned.has(t.id));
  var fallbackRemaining = TOY_CATALOG.filter((t) => !owned.has(t.id));
  if (!fallbackRemaining.length) return null;
  var remaining = rotationRemaining.length ? rotationRemaining : fallbackRemaining;
  // Bias toward preferred toys 60% of the time.
  const preferred = remaining.filter((t) => Array.isArray(t.palPreference) && t.palPreference.indexOf(palId) !== -1);
  const pool = (preferred.length && Math.random() < 0.6) ? preferred : remaining;
  return pool[Math.floor(Math.random() * pool.length)];
}

function shopForActivePalToybox() {
  var resultLine = '';
  var grantedToy = null;
  var wasError = null;
  setAppState(function(state) {
    var palId = state.activePal;
    if (!palId) { wasError = 'no-pal'; return state; }
    if ((state.gloom || 0) < TOYBOX_TRIP_COST) { wasError = 'no-gloom'; return state; }

    var ownedIds = (state.palToybox && Array.isArray(state.palToybox[palId]))
      ? state.palToybox[palId].slice()
      : [];
    var pick = pickToyHaulForPal(palId, ownedIds);
    if (!pick) { wasError = 'all-owned'; return state; }
    grantedToy = pick;
    resultLine = (typeof pickShoppingLine === 'function') ? pickShoppingLine(palId) : '';

    var nextState = {
      ...state,
      gloom: state.gloom - TOYBOX_TRIP_COST,
      palToybox: { ...(state.palToybox || {}), [palId]: ownedIds.concat([pick.id]) },
      care: { ...state.care, reactionType: 'shopping', dialogue: resultLine },
    };
    if (typeof appendActivityToState === 'function') {
      var palName = (typeof getPalById === 'function' && getPalById(palId)) ? getPalById(palId).name : palId;
      nextState = appendActivityToState(nextState, {
        palId: palId,
        type: 'shop',
        system: palName + ' brought home ' + pick.name + ' (toy).',
        quote: resultLine,
        itemId: pick.id,
        itemSlug: pick.slug || '',
        deltas: { gloom: -TOYBOX_TRIP_COST },
        link: 'care',
      });
    }
    return nextState;
  });
  if (wasError) return { error: wasError };
  return { line: resultLine, toy: grantedToy };
}

/* Buy one new toy for every owned, alive pal that doesn't have a full
   collection. Costs TOYBOX_TRIP_COST × (pals stocked). */
function shopToyboxForAllOwnedPals() {
  var stocked = [];
  var spent = 0;
  setAppState(function(state) {
    var owned = (state.ownedPals || []).filter(function(pid) {
      var entry = state.palMoodLedger && state.palMoodLedger[pid];
      return entry && !entry.isDead;
    });
    if (!owned.length) return state;
    var nextState = { ...state };
    var nextToybox = { ...(state.palToybox || {}) };
    owned.forEach(function(pid) {
      if ((nextState.gloom || 0) < TOYBOX_TRIP_COST) return;
      var ownedIds = Array.isArray(nextToybox[pid]) ? nextToybox[pid].slice() : [];
      var pick = pickToyHaulForPal(pid, ownedIds);
      if (!pick) return;
      nextToybox[pid] = ownedIds.concat([pick.id]);
      nextState.gloom = (nextState.gloom || 0) - TOYBOX_TRIP_COST;
      spent += TOYBOX_TRIP_COST;
      stocked.push({ palId: pid, toy: pick });
    });
    nextState.palToybox = nextToybox;
    if (typeof appendActivityToState === 'function' && stocked.length) {
      stocked.forEach(function(s) {
        var palName = (typeof getPalById === 'function' && getPalById(s.palId)) ? getPalById(s.palId).name : s.palId;
        nextState = appendActivityToState(nextState, {
          palId: s.palId,
          type: 'shop',
          system: palName + ' brought home ' + s.toy.name + ' (toy).',
          itemId: s.toy.id,
          itemSlug: s.toy.slug || '',
          deltas: { gloom: -TOYBOX_TRIP_COST },
          link: 'care',
        });
      });
    }
    return nextState;
  });
  return { stocked: stocked, spent: spent };
}

/* =====================================================================
   ACTIVITY LOG PANEL — UI rendering + filter state.
   Per-page state lives on a closure variable. Defaults: scope=active,
   typeFilter=all. Re-renders on every renderCare() pass.
   ===================================================================== */
var ACTIVITY_LOG_UI_STATE = { scope: 'active', typeFilter: 'all' };
var ACTIVITY_LOG_FILTERS = [
  { key: 'all',       label: 'ALL' },
  { key: 'food',      label: 'FOOD' },
  { key: 'toy',       label: 'TOYS' },
  { key: 'care',      label: 'CARE' },
  { key: 'cure',      label: 'CURE' },
  { key: 'talk',      label: 'TALKS' },
  { key: 'wardrobe',  label: 'WARDROBE' },
  { key: 'shop',      label: 'SHOP' },
  { key: 'distress',  label: 'DISTRESS' },
  { key: 'poke',      label: 'POKES' },
  { key: 'gift',      label: 'GIFTS' },
  { key: 'oracle',    label: 'ORACLE' },
];

function renderActivityLogPanel(root, state, pal) {
  if (!root) return;
  const panel = root.querySelector('[data-activity-log-panel]');
  if (!panel) return;
  const list = panel.querySelector('[data-activity-log-list]');
  const filterRow = panel.querySelector('[data-activity-filter-row]');
  if (!list || !filterRow) return;

  // Sync scope toggle pressed state
  const scopeButtons = panel.querySelectorAll('[data-activity-scope]');
  scopeButtons.forEach(function(btn) {
    const isActive = btn.dataset.activityScope === ACTIVITY_LOG_UI_STATE.scope;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });

  // Filter chips — only rewrite when the active filter changed (avoid every-tick DOM churn)
  const filterSig = ACTIVITY_LOG_UI_STATE.typeFilter;
  if (filterRow.dataset.activitySig !== filterSig) {
    filterRow.innerHTML = ACTIVITY_LOG_FILTERS.map(function(f) {
      const active = f.key === ACTIVITY_LOG_UI_STATE.typeFilter;
      return '<button type="button" class="activity-log-filter-chip' + (active ? ' is-active' : '') + '" data-activity-filter="' + escapeHtml(f.key) + '" aria-pressed="' + active + '">' + escapeHtml(f.label) + '</button>';
    }).join('');
    filterRow.dataset.activitySig = filterSig;
  }

  // Resolve entries
  const queryOpts = {};
  if (ACTIVITY_LOG_UI_STATE.scope === 'active' && pal && pal.id) {
    queryOpts.palId = pal.id;
  }
  if (ACTIVITY_LOG_UI_STATE.typeFilter !== 'all') {
    queryOpts.types = [ACTIVITY_LOG_UI_STATE.typeFilter];
  }
  queryOpts.limit = 60;
  const entries = (typeof getActivityLog === 'function') ? getActivityLog(queryOpts) : [];

  // Skip full rebuild when the rendered entry list signature hasn't changed.
  // The care page re-renders every 1s; tearing down all <li> + <img> nodes
  // each tick caused visible layout micro-shifts. We rebuild only when the
  // visible entries (or scope) actually differ.
  const listSig = ACTIVITY_LOG_UI_STATE.scope + '|' + filterSig + '|' +
    entries.length + '|' + entries.map(function(e) { return e.id; }).join(',');
  if (list.dataset.activitySig === listSig) {
    return;
  }
  list.dataset.activitySig = listSig;

  if (!entries.length) {
    list.innerHTML = '<li class="activity-log-empty">No activity yet. Feed, play with, or shop for your pal to fill this feed.</li>';
    return;
  }

  list.innerHTML = entries.map(function(entry) {
    return renderActivityEntry(entry, state, pal);
  }).join('');
}

function renderActivityEntry(entry, state, activePal) {
  const meta = (typeof ACTIVITY_TYPES !== 'undefined') ? ACTIVITY_TYPES[entry.type] : null;
  const icon = meta ? meta.icon : '·';
  const tone = meta ? meta.tone : 'phosphor';
  const label = meta ? meta.label : entry.type.toUpperCase();
  const rel = (typeof formatRelativeTime === 'function') ? formatRelativeTime(entry.ts) : '';
  const abs = (typeof formatAbsoluteTime === 'function') ? formatAbsoluteTime(entry.ts) : '';

  // Pal name prefix when in "all pals" view
  let palBadge = '';
  if (ACTIVITY_LOG_UI_STATE.scope === 'all' && entry.palId) {
    const palObj = (typeof getPalById === 'function') ? getPalById(entry.palId) : null;
    const palName = palObj ? palObj.name : entry.palId;
    palBadge = '<span class="activity-log-pal-badge">' + escapeHtml(palName) + '</span>';
  }

  // Optional thumbnail (food / toy)
  let thumb = '';
  if (entry.type === 'food' && entry.itemId) {
    const food = (typeof getFoodById === 'function') ? getFoodById(entry.itemId) : null;
    if (food) {
      const path = (typeof getFoodAssetPath === 'function') ? getFoodAssetPath(food) : '';
      thumb = '<span class="activity-log-thumb" aria-hidden="true"><img src="' + escapeHtml(path) + '" alt="" width="30" height="30" loading="lazy" decoding="async" onerror="this.parentNode.classList.add(\'is-empty\');this.style.display=\'none\'"></span>';
    }
  } else if (entry.type === 'toy' && entry.itemId) {
    const toy = (typeof getToyById === 'function') ? getToyById(entry.itemId) : null;
    if (toy) {
      const path = (typeof getToyAssetPath === 'function') ? getToyAssetPath(toy) : '';
      thumb = '<span class="activity-log-thumb" aria-hidden="true"><img src="' + escapeHtml(path) + '" alt="" width="30" height="30" loading="lazy" decoding="async" onerror="this.parentNode.classList.add(\'is-empty\');this.style.display=\'none\'"></span>';
    }
  }

  // Deltas
  let deltas = '';
  if (entry.deltas) {
    const parts = [];
    Object.keys(entry.deltas).forEach(function(k) {
      const v = entry.deltas[k];
      if (!v) return;
      const sign = v > 0 ? '+' : '';
      const cls = v > 0 ? 'is-positive' : 'is-negative';
      parts.push('<span class="activity-log-delta ' + cls + '">' + escapeHtml(k) + ' ' + sign + v + '</span>');
    });
    if (parts.length) deltas = '<div class="activity-log-deltas">' + parts.join('') + '</div>';
  }

  const quoteHtml = entry.quote ? '<p class="activity-log-quote">" ' + escapeHtml(entry.quote) + ' "</p>' : '';
  const linkAttr = entry.link ? ' data-activity-link="' + escapeHtml(entry.link) + '"' : '';

  return '<li class="activity-log-entry activity-log-tone-' + escapeHtml(tone) + '" data-activity-id="' + escapeHtml(entry.id) + '"' + linkAttr + ' title="' + escapeHtml(abs) + '">' +
    '<span class="activity-log-icon" aria-hidden="true">' + escapeHtml(icon) + '</span>' +
    thumb +
    '<div class="activity-log-body">' +
      '<div class="activity-log-headline">' +
        '<span class="activity-log-type">' + escapeHtml(label) + '</span>' +
        palBadge +
        '<span class="activity-log-time">' + escapeHtml(rel) + '</span>' +
      '</div>' +
      '<p class="activity-log-system">' + escapeHtml(entry.system) + '</p>' +
      quoteHtml +
      deltas +
    '</div>' +
  '</li>';
}

function setupActivityLogDelegate(root) {
  if (!root || root.__activityLogBound) return;
  root.__activityLogBound = true;
  root.addEventListener('click', function(event) {
    // Scope toggle
    const scopeBtn = event.target.closest('[data-activity-scope]');
    if (scopeBtn) {
      ACTIVITY_LOG_UI_STATE.scope = scopeBtn.dataset.activityScope || 'active';
      renderCare(root);
      return;
    }
    // Filter chip
    const filterBtn = event.target.closest('[data-activity-filter]');
    if (filterBtn) {
      ACTIVITY_LOG_UI_STATE.typeFilter = filterBtn.dataset.activityFilter || 'all';
      renderCare(root);
      return;
    }
    // Clear log (with confirm)
    const clearBtn = event.target.closest('[data-activity-clear]');
    if (clearBtn) {
      if (window.confirm('Clear the entire activity log? This cannot be undone.')) {
        if (typeof clearActivityLog === 'function') clearActivityLog();
        renderCare(root);
      }
      return;
    }
    // Entry click — navigate via link hint
    const entry = event.target.closest('[data-activity-link]');
    if (entry) {
      const link = entry.dataset.activityLink;
      // Smooth scroll to top of pal panels for now (most links say 'care')
      if (link === 'care') {
        const panel = root.querySelector('[data-wardrobe-panel], [data-pantry-panel], [data-toybox-panel]');
        if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });
}

function renderCare(root) {
  const state = getState();
  const activeLedger = (state.palMoodLedger || {})[state.activePal] || {};
  if (activeLedger.isGhost) {
    document.body.classList.add('ghost-active');
  } else {
    document.body.classList.remove('ghost-active');
  }
  const ghostHtml = getGhostBannerHtml(state);
  syncGhostBanner(root, ghostHtml);
  const pal = getPalById(state.activePal);

  buildOracle(root);

  if (!pal) {
    if (root.dataset.gameOverState === 'true' && root.querySelector('[data-game-over-panel]')) {
      return;
    }
    renderCareEmptyState(root);
    return;
  }

  root.querySelector('[data-care-date]').textContent = formatDateLabel();
  root.querySelector('[data-care-gloom]').textContent = String(state.gloom).padStart(3, '0');
  root.querySelector('[data-care-luckdust]').textContent = String(state.luckdust).padStart(2, '0');
  root.querySelector('[data-care-name]').textContent = pal.name;
  const relationshipEntry = state.palMoodLedger[pal.id] || getDefaultPalMoodEntry(pal.id);
  const relationshipMode = resolveRelationshipMode(relationshipEntry);
  const activeTrustTier = getPalTrustTier(pal.id, state);
  root.querySelectorAll('[data-care-relationship-mode]').forEach((element) => {
    if (element.classList.contains('trust-tier-label')) {
      element.textContent = activeTrustTier.toUpperCase();
      return;
    }

    applyRelationshipModeDisplay(element, relationshipMode);
    setDataTip(element, getRelationshipModeTooltip(relationshipMode));
  });
  const activeClone = getActiveClone(state);
  const isActiveClonePal = !!(activeClone && activeClone.sequenceString && pal.id === activeClone.id);
  const cloneSubtitleEl = root.querySelector('[data-pal-clone-subtitle]');
  if (cloneSubtitleEl) {
    if (isActiveClonePal) {
      cloneSubtitleEl.textContent = getCloneSubtitleText(activeClone, state);
      cloneSubtitleEl.hidden = false;
    } else {
      cloneSubtitleEl.textContent = '';
      cloneSubtitleEl.hidden = true;
    }
  }
  const careIdEl = root.querySelector('[data-care-id]');
  if (careIdEl) careIdEl.textContent = pal.id.toUpperCase();
  const calendarLinkEl = root.querySelector('[data-care-calendar-pal-link]');
  if (calendarLinkEl) calendarLinkEl.textContent = pal.name + '-linked';
  root.querySelector('[data-care-mood]').textContent = getCareMoodLabel(state);
  root.querySelector('[data-care-hunger]').textContent = `${Math.round(relationshipEntry.hunger || 0)}%`;
  root.querySelector('[data-care-mood-value]').textContent = `${Math.round(relationshipEntry.mood || 0)}%`;
  root.querySelector('[data-care-plague]').textContent = `${Math.round(relationshipEntry.plague || 0)}%`;
  root.querySelectorAll('[data-care-trust]').forEach((element) => {
    element.textContent = `${relationshipEntry.trust || 0} ${activeTrustTier.toUpperCase()}`;
    setDataTip(element, getTrustTooltipCopy(activeTrustTier, relationshipEntry.trust || 0));
  });
  setDataTip(root.querySelector('[data-care-gloom]'), getCurrencyTooltipCopy('gloom'));
  setDataTip(root.querySelector('[data-care-luckdust]'), getCurrencyTooltipCopy('luckdust'));
  setDataTip(root.querySelector('[data-care-mood]'), 'This is the short label for your pal\'s current emotional state after care, neglect, and relationship effects are combined.');
  setDataTip(root.querySelector('[data-care-hunger]'), getNeedTooltipCopy('hunger'));
  setDataTip(root.querySelector('[data-care-mood-value]'), getNeedTooltipCopy('mood'));
  setDataTip(root.querySelector('[data-care-plague]'), getNeedTooltipCopy('plague'));
  setDataTip(cloneSubtitleEl, isActiveClonePal ? getPalStatTooltipCopy('cloneBonus') : '');
  const careDialogueEl = root.querySelector('[data-care-dialogue]');
  if (careDialogueEl) {
    careDialogueEl.textContent = getVisibleCareDialogue(
      state,
      pal,
      buildDialogue(pal, state) || getCareDialogue(pal.id, state.plagued ? 'sick' : 'idle')
    );
  }
  const criticalPals = getCriticalPals(state);
  const criticalOther = criticalPals.filter((id) => id !== state.activePal);
  if (criticalOther.length > 0) {
    const names = criticalOther
      .map((id) => { const p = getPalById(id); return p ? p.name : id; })
      .join(', ');
    const warningEl = root.querySelector('[data-care-dialogue]');
    if (warningEl) {
      warningEl.textContent = `Warning: ${names} ${criticalOther.length === 1 ? 'is' : 'are'} in critical condition. Check the roster.`;
    }
  }
  const oracleResultEl = root.querySelector('[data-oracle-result]');
  if (oracleResultEl) {
    oracleResultEl.innerHTML = escapeHtml(getOracleResultText(state)).replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
  }

  const calendarPressure = getCalendarPressureSnapshot(state);
  root.querySelector('[data-care-overdue-count]').textContent = String(calendarPressure.overdueCount).padStart(2, '0');
  root.querySelector('[data-care-next-event]').textContent = calendarPressure.nextOccurrence
    ? `${calendarPressure.nextOccurrence.title} // ${calendarPressure.nextOccurrence.occurrenceDate}`
    : 'Nothing new is queued.';
  root.querySelector('[data-care-overdue-note]').textContent = calendarPressure.overdueCount > 0
    ? `${calendarPressure.overdueCount} unresolved orbit item${calendarPressure.overdueCount === 1 ? '' : 's'} are depressing ${pal.name}'s care loop.`
    : 'No overdue orbit strain is reaching care right now.';

  const plagueDot = root.querySelector('[data-plague-dot]');
  plagueDot.hidden = !state.plagued;
  const streakEl = root.querySelector('[data-care-streak]');
  if (streakEl) {
    streakEl.textContent = String(state.streak || 0).padStart(2, '0');
    setDataTip(streakEl, getCurrencyTooltipCopy('streak'));
  }

  const image = root.querySelector('[data-pal-image]');
  const placeholder = root.querySelector('[data-pal-placeholder]');
  const frame = root.querySelector('[data-pal-frame]');
  const shipNote = root.querySelector('[data-pal-ship-note]');
  if (image && placeholder && frame) {
    image.alt = `${pal.name} portrait`;
    applyPalPlaceholder(placeholder, pal);
    applyPalFrameAccent(frame, pal, state);
    bindActivePalSpriteImage(image, frame, placeholder, pal.slug || pal.id, state, shipNote);
  }
  if (frame) {
    const equippedOutfitId = (state.palOutfits && state.palOutfits[pal.id]) || null;
    applyPalOutfitOverlay(frame, pal.id, equippedOutfitId);
  }
  renderWardrobePanel(root, state, pal);
  renderPantryPanel(root, state, pal);
  renderToyboxPanel(root, state, pal);
  setupShopCarousels(root);
  if (typeof renderActivityLogPanel === 'function') {
    renderActivityLogPanel(root, state, pal);
    setupActivityLogDelegate(root);
  }
  if (typeof window.syncCareSpriteSystem === 'function') {
    window.syncCareSpriteSystem(root);
  }

  renderNeedMeter(root, 'hunger', state.needs.hunger);
  renderNeedMeter(root, 'boredom', state.needs.boredom);
  renderNeedMeter(root, 'mood', state.needs.mood);
  renderNeedMeter(root, 'plague', state.needs.plague);
  renderTrustMeter(root, relationshipEntry.trust || 0, activeTrustTier);

  const oracleButton = root.querySelector('[data-oracle-consult]');
  if (oracleButton) {
    oracleButton.disabled = activeLedger.isGhost || state.lastSpinDate === getLocalDateKey();
    oracleButton.setAttribute('aria-disabled', String(oracleButton.disabled));
  }

  const actionsPanel = root.querySelector('.needs-panel');
  const careLockout = state.care.lockoutUntil && Date.now() < state.care.lockoutUntil;
  const lockoutRemaining = careLockout
    ? Math.ceil((state.care.lockoutUntil - Date.now()) / (1000 * 60))
    : 0;
  const careActionButtons = root.querySelectorAll('[data-care-action], [data-cure-plague]');
  careActionButtons.forEach((button) => {
    button.disabled = careLockout;
    button.setAttribute('aria-disabled', String(careLockout));
    if (button.dataset.careAction) {
      const action = CARE_ACTIONS[button.dataset.careAction];
      const adjustedCost = getAdjustedCareActionCost(button.dataset.careAction, state);
      const direction = action && action.needKey === 'plague' ? 'reduces' : 'restores';
      if (action) {
        button.textContent = action.label;
        setDataTip(button, action.label + ' ' + direction + ' ' + action.needKey + ' by ' + Math.abs(action.amount) + ' and costs ' + (adjustedCost === 0 ? 'nothing' : adjustedCost + ' Gloom') + '.');
      }
    }
  });
  const giftButton = root.querySelector('[data-gift-btn]');
  const giftButtonLabel = root.querySelector('[data-gift-btn-label]');
  const giftPanel = root.querySelector('[data-gift-panel]');
  const canGift = canGiftToday(state);
  const hasInventory = (state.inventory || []).length > 0;
  if (giftButton) {
    giftButton.disabled = !canGift || !hasInventory;
    giftButton.setAttribute('aria-disabled', String(giftButton.disabled));
  }
  if (giftButtonLabel) {
    giftButtonLabel.textContent = canGift ? 'FROM INVENTORY' : 'GIVEN TODAY';
  }
  if (giftPanel && giftButton && giftButton.disabled) {
    giftPanel.hidden = true;
  }
  setDataTip(root.querySelector('[data-cure-plague]'), getCareActionTooltipCopy('cure'));
  root.querySelectorAll('[data-need-row]').forEach((row) => {
    setDataTip(row, getNeedTooltipCopy(row.dataset.needRow));
  });
  if (actionsPanel) {
    let lockoutNote = root.querySelector('[data-care-lockout-note]');
    if (careLockout) {
      if (!lockoutNote) {
        lockoutNote = document.createElement('p');
        lockoutNote.className = 'task-meta';
        lockoutNote.dataset.careLockoutNote = '';
        actionsPanel.prepend(lockoutNote);
      }
      lockoutNote.textContent = `Care actions locked for ${lockoutRemaining} more minute${lockoutRemaining !== 1 ? 's' : ''}. Controlled Detonation has a price.`;
    } else if (lockoutNote) {
      lockoutNote.remove();
    }
  }

  const activePalEntry = state.palMoodLedger[state.activePal] || {};
  const plagueValue = activePalEntry.plague || state.needs.plague || 0;
  const plagueStage = getPlagueStage(plagueValue);
  const alertPanel = root.querySelector('[data-plague-panel]');

  alertPanel.hidden = plagueStage === 0;
  alertPanel.classList.toggle('stage-2', plagueStage === 2);
  alertPanel.classList.toggle('stage-3', plagueStage === 3);

  if (plagueStage > 0) {
    const stageLabel = root.querySelector('[data-plague-stage-label]');
    const stageBadge = root.querySelector('[data-plague-stage-badge]');
    const stageDesc = root.querySelector('[data-plague-stage-description]');
    const cureGloom = root.querySelector('[data-plague-cure-gloom]');
    const cureLuckdust = root.querySelector('[data-plague-cure-luckdust]');
    const cureTrust = root.querySelector('[data-plague-cure-trust]');

    const stageDescriptions = {
      1: 'The Icky is struggling. Treatable with Gloom alone. Do not wait.',
      2: 'The Icky is failing. Gloom alone is not enough. Luckdust required.',
      3: 'The Icky has stopped. Full resources and trust required to restart it.',
    };

    const costs = getAdjustedPlagueCureCosts(state)[plagueStage];

    if (stageLabel) stageLabel.textContent = getPlagueStageLabel(plagueValue);
    if (stageBadge) {
      stageBadge.textContent = `STAGE ${plagueStage}`;
      stageBadge.className = `section-note plague-stage-${plagueStage}`;
    }
    if (stageDesc) stageDesc.textContent = stageDescriptions[plagueStage];
    if (cureGloom) cureGloom.textContent = costs.gloom;
    if (cureLuckdust) cureLuckdust.textContent = costs.luckdust > 0 ? costs.luckdust : '—';
    if (cureTrust) cureTrust.textContent = costs.trust > 0 ? `${costs.trust} min` : '—';
  }

  const rosterCount = root.querySelector('[data-care-roster-count]');
  const rosterList = root.querySelector('[data-care-roster]');
  const ownedEntries = (state.ownedPals || []).map((palId) => {
    const rosterPal = getPalById(palId);
    const entry = state.palMoodLedger[palId];
    if (!rosterPal || !entry) {
      return null;
    }

    return {
      pal: rosterPal,
      entry,
      isActive: palId === state.activePal,
    };
  }).filter(Boolean);

  if (rosterCount) {
    rosterCount.textContent = `${ownedEntries.length} OWNED`;
  }

  if (rosterList) {
    rosterList.innerHTML = ownedEntries.length
      ? ownedEntries.map(({ pal: rosterPal, entry, isActive }) => {
        const palId = rosterPal.id;
        const palPlagueStage = getPlagueStage(entry.plague || 0);
        const palPlagueLabel = getPlagueStageLabel(entry.plague || 0);
        const trustTier = getPalTrustTier(palId, state);
        const hunger = Math.round(entry.hunger || 0);
        const mood = Math.round(entry.mood || 0);
        const plague = Math.round(entry.plague || 0);
        const tribe = rosterPal.tribe ? escapeHtml(rosterPal.tribe) : '';
        const portraitSrc = `../assets/pals/base-pals/${palId}.png`;
        const trustValue = entry.trust || 0;
        const trustTooltip = escapeHtml(getTrustTooltipCopy(trustTier, trustValue));
        const isDistressed = !entry.isDead && (
          (entry.hunger || 0) <= 30
          || (entry.mood || 0) <= 30
          || (entry.plague || 0) >= 60
        );
        return `
        <li class="care-roster-card${isActive ? ' is-active' : ''}${isDistressed ? ' is-distressed' : ''} plague-stage-${palPlagueStage}" data-pal-id="${palId}">
          <div class="care-roster-portrait" aria-hidden="true">
            <img src="${portraitSrc}" alt="" loading="lazy">
            <span class="care-roster-portrait-ring"></span>
            ${isActive ? '<span class="care-roster-portrait-tag">ACTIVE</span>' : ''}
          </div>
          <div class="care-roster-body">
            <div class="care-roster-header">
              <div class="care-roster-heading">
                <p class="care-roster-name">${escapeHtml(rosterPal.name)}</p>
                ${tribe ? `<p class="care-roster-tribe">${tribe}</p>` : ''}
              </div>
              <span class="care-roster-chip plague-stage-${palPlagueStage}${palPlagueStage >= 2 ? ' is-plague is-plagued' : ''}">${escapeHtml(palPlagueLabel)}</span>
            </div>
            ${isActive ? '' : `
            <div class="care-roster-stats" role="group" aria-label="Pal vitals">
              <div class="care-roster-stat" data-stat="hunger">
                <span class="care-roster-stat-label">HUNGER</span>
                <span class="care-roster-stat-bar"><span class="care-roster-stat-fill" style="width:${hunger}%"></span></span>
                <span class="care-roster-stat-value">${hunger}</span>
              </div>
              <div class="care-roster-stat" data-stat="mood">
                <span class="care-roster-stat-label">MOOD</span>
                <span class="care-roster-stat-bar"><span class="care-roster-stat-fill" style="width:${mood}%"></span></span>
                <span class="care-roster-stat-value">${mood}</span>
              </div>
              <div class="care-roster-stat" data-stat="plague">
                <span class="care-roster-stat-label">PLAGUE</span>
                <span class="care-roster-stat-bar"><span class="care-roster-stat-fill" style="width:${plague}%"></span></span>
                <span class="care-roster-stat-value">${plague}</span>
              </div>
            </div>`}
            <div class="care-roster-meta-row">
              <span class="care-roster-trust-chip trust-tier-${trustTier}" data-tip="${trustTooltip}" tabindex="0">
                <span class="care-roster-trust-label">TRUST</span>
                <span class="care-roster-trust-value">${trustValue}</span>
                <span class="care-roster-trust-tier">${trustTier.toUpperCase()}</span>
              </span>
              <button type="button" class="ghost-link care-roster-action" data-care-roster-select="${rosterPal.id}"${isActive ? ' disabled' : ''}>${isActive ? 'INSPECTING' : 'INSPECT'}</button>
            </div>
          </div>
        </li>
      `;
      }).join('')
      : '<li class="care-roster-card care-roster-empty"><p class="task-meta">No roster data available. The chamber has fewer witnesses than expected.</p></li>';
  }

  const careNavLink = root.querySelector('.bottom-nav [href="home.html"]');
  if (careNavLink) {
    careNavLink.classList.toggle('has-critical-warning', criticalPals.length > 0);
  }

  const deathPanel = root.querySelector('[data-death-panel]');
  const recentDeath = (state.deathRecord || []).find((d) => !d.acknowledged);
  if (deathPanel) {
    deathPanel.hidden = !recentDeath;
    if (recentDeath) {
      root.querySelector('[data-death-pal-name]').textContent = `${recentDeath.palName} is gone.`;
      root.querySelector('[data-death-cause]').textContent = recentDeath.cause;
      root.querySelector('[data-death-date]').textContent = recentDeath.date;
    }
  }

  renderCheckinPanel(root, state);
}

function applyCareAction(actionKey) {
  const action = CARE_ACTIONS[actionKey];
  if (!action) {
    return;
  }

  const state = syncNeedDecay();
  const pal = getPalById(state.activePal);

  if (!pal) {
    return;
  }

  if (state.care.lockoutUntil && Date.now() < state.care.lockoutUntil) {
    return;
  }

  const actionCost = getAdjustedCareActionCost(actionKey, state);

  if (state.gloom < actionCost) {
    setAppState({
      ...state,
      care: {
        ...state.care,
        reactionType: 'insufficient',
        dialogue: getCareDialogue(pal.id, 'insufficient'),
      },
    });
    return;
  }

  const careTimingResult = recordCareActionTimestamp(state, state.activePal);

  const nextNeeds = { ...state.needs };

  if (action.needKey === 'plague') {
    nextNeeds.plague = clampNumber(nextNeeds.plague + action.amount, 0, 100);
  } else {
    nextNeeds[action.needKey] = clampNumber(nextNeeds[action.needKey] + action.amount, 0, 100);
  }

  const palEntry = state.palMoodLedger[state.activePal] || {};
  const nextSequence = [...(palEntry.lastCareActionSequence || []), actionKey].slice(-3);
  setAppState({
    ...state,
    gloom: state.gloom - actionCost,
    needs: normalizeNeeds(nextNeeds),
    care: {
      ...state.care,
      lastNeedUpdate: Date.now(),
      reactionType: actionKey,
      dialogue: getCareDialogue(pal.id, actionKey),
    },
    palMoodLedger: {
      ...state.palMoodLedger,
      [state.activePal]: {
        ...palEntry,
        lastCareActionSequence: nextSequence,
        careActionTimestamps: careTimingResult.careActionTimestamps,
        performingFlagCount: careTimingResult.performingFlagCount,
      },
    },
  });

  // Activity log: record manual care action
  if (typeof pushActivity === 'function') {
    var careDeltas = { gloom: -actionCost };
    if (action.needKey === 'plague') {
      careDeltas.plague = action.amount;
    } else {
      careDeltas[action.needKey] = action.amount;
    }
    var careTypeMap = { feed: 'food', entertain: 'toy', comfort: 'care', sanitize: 'care' };
    var careVerbMap = {
      feed: 'manually fed',
      entertain: 'played with',
      comfort: 'comforted',
      sanitize: 'sanitized',
    };
    pushActivity({
      palId: pal.id,
      type: careTypeMap[actionKey] || 'care',
      system: pal.name + ' was ' + (careVerbMap[actionKey] || actionKey) + '.',
      quote: getCareDialogue(pal.id, actionKey) || '',
      deltas: careDeltas,
      link: 'care',
    });
  }
}

function curePlague() {
  const state = syncNeedDecay();
  const pal = getPalById(state.activePal);

  if (!pal) return;

  if (state.care.lockoutUntil && Date.now() < state.care.lockoutUntil) return;

  const palEntry = state.palMoodLedger[state.activePal] || {};
  const plagueValue = palEntry.plague || 0;
  const stage = getPlagueStage(plagueValue);
  const trust = palEntry.trust || 0;
  const cureCosts = getAdjustedPlagueCureCosts(state);

  if (stage === 0) {
    setAppState({
      ...state,
      care: {
        ...state.care,
        dialogue: 'The Icky is currently stable. No treatment needed.',
      },
    });
    return;
  }

  if (stage === 1) {
    if (state.gloom < cureCosts[1].gloom) {
      setAppState({
        ...state,
        care: {
          ...state.care,
          dialogue: `Icky Chill requires ${cureCosts[1].gloom} Gloom. You have ${state.gloom}.`,
        },
      });
      return;
    }
    const nextSequence = [...(palEntry.lastCareActionSequence || []), 'cure'].slice(-3);
    setAppState({
      ...state,
      gloom: state.gloom - cureCosts[1].gloom,
      needs: normalizeNeeds({ ...state.needs, plague: Math.max(plagueValue - 30, 10) }),
      care: {
        ...state.care,
        lastNeedUpdate: Date.now(),
        reactionType: 'cured',
        dialogue: getCareDialogue(pal.id, 'cured'),
      },
      palMoodLedger: {
        ...state.palMoodLedger,
        [state.activePal]: {
          ...palEntry,
          plague: Math.max(plagueValue - 30, 10),
          lastCareActionSequence: nextSequence,
        },
      },
    });
    if (typeof pushActivity === 'function') {
      pushActivity({
        palId: pal.id,
        type: 'cure',
        system: pal.name + ' was treated for Icky Chill (stage 1).',
        quote: getCareDialogue(pal.id, 'cured') || '',
        deltas: { gloom: -cureCosts[1].gloom, plague: -30 },
        link: 'care',
      });
    }
    return;
  }

  if (stage === 2) {
    if (state.gloom < cureCosts[2].gloom || state.luckdust < cureCosts[2].luckdust) {
      setAppState({
        ...state,
        care: {
          ...state.care,
          dialogue: `Icky Fever requires ${cureCosts[2].gloom} Gloom and ${cureCosts[2].luckdust} Luckdust. The Icky is not responding to effort alone.`,
        },
      });
      return;
    }
    const nextSequence = [...(palEntry.lastCareActionSequence || []), 'cure'].slice(-3);
    setAppState({
      ...state,
      gloom: state.gloom - cureCosts[2].gloom,
      luckdust: state.luckdust - cureCosts[2].luckdust,
      plagued: false,
      needs: normalizeNeeds({ ...state.needs, plague: Math.max(plagueValue - 45, 10) }),
      care: {
        ...state.care,
        lastNeedUpdate: Date.now(),
        reactionType: 'cured',
        dialogue: getCareDialogue(pal.id, 'cured'),
      },
      palMoodLedger: {
        ...state.palMoodLedger,
        [state.activePal]: {
          ...palEntry,
          plague: Math.max(plagueValue - 45, 10),
          lastCareActionSequence: nextSequence,
        },
      },
    });
    if (typeof pushActivity === 'function') {
      pushActivity({
        palId: pal.id,
        type: 'cure',
        system: pal.name + ' was treated for Icky Fever (stage 2).',
        quote: getCareDialogue(pal.id, 'cured') || '',
        deltas: { gloom: -cureCosts[2].gloom, luckdust: -cureCosts[2].luckdust, plague: -45 },
        link: 'care',
      });
    }
    return;
  }

  if (stage === 3) {
    if (trust < PLAGUE_CURE_STAGE_3_TRUST_MIN) {
      setAppState({
        ...state,
        care: {
          ...state.care,
          dialogue: `The Icky has stopped. Trust is too low to restart it. ${pal.name} does not recognize you as someone worth recovering for. Trust score: ${trust}. Minimum required: ${PLAGUE_CURE_STAGE_3_TRUST_MIN}.`,
        },
      });
      return;
    }
    if (state.gloom < cureCosts[3].gloom || state.luckdust < cureCosts[3].luckdust) {
      setAppState({
        ...state,
        care: {
          ...state.care,
          dialogue: `Full Ickysoul requires ${cureCosts[3].gloom} Gloom and ${cureCosts[3].luckdust} Luckdust. The resources are not there.`,
        },
      });
      return;
    }
    const nextSequence = [...(palEntry.lastCareActionSequence || []), 'cure'].slice(-3);
    setAppState({
      ...state,
      gloom: state.gloom - cureCosts[3].gloom,
      luckdust: state.luckdust - cureCosts[3].luckdust,
      plagued: false,
      needs: normalizeNeeds({ ...state.needs, plague: 15 }),
      care: {
        ...state.care,
        lastNeedUpdate: Date.now(),
        reactionType: 'cured',
        dialogue: getCareDialogue(pal.id, 'cured'),
      },
      palMoodLedger: {
        ...state.palMoodLedger,
        [state.activePal]: {
          ...palEntry,
          plague: 15,
          lastCareActionSequence: nextSequence,
        },
      },
    });
    if (typeof pushActivity === 'function') {
      pushActivity({
        palId: pal.id,
        type: 'cure',
        system: pal.name + ' was treated for Full Ickysoul (stage 3).',
        quote: getCareDialogue(pal.id, 'cured') || '',
        deltas: { gloom: -cureCosts[3].gloom, luckdust: -cureCosts[3].luckdust, plague: -(plagueValue - 15) },
        link: 'care',
      });
    }
  }
}

function consultDreadOracle() {
  const state = syncNeedDecay();
  const pal = getPalById(state.activePal);
  const oracleSegments = buildDynamicOracle(state);

  if (!pal) {
    return null;
  }

  if (!oracleSegments.length) {
    return null;
  }

  const todayKey = getLocalDateKey();
  if (state.lastSpinDate === todayKey) {
    return null;
  }

  const segment = pickOracleSegment(pal, oracleSegments, { guaranteedSafe: state.care.nextSpinGuaranteed });
  let nextState = {
    ...state,
    gloom: state.gloom,
    luckdust: state.luckdust,
    lastSpinDate: todayKey,
    spunToday: true,
    needs: { ...state.needs },
    plagued: state.plagued,
    care: {
      ...state.care,
      lastNeedUpdate: Date.now(),
      reactionType: 'idle',
      dialogue: state.care.dialogue,
      nextSpinGuaranteed: false,
      lastOracleResult: {
        date: todayKey,
        label: segment.label,
        type: segment.type,
        amount: segment.amount,
        text: segment.xio || segment.label,
      },
    },
  };

  if (segment.type === 'gloom') {
    nextState.gloom += segment.amount;
    nextState.care.reactionType = 'oracleGloom';
    nextState.care.dialogue = getCareDialogue(pal.id, 'oracleGloom');
  }

  if (segment.type === 'luckdust') {
    nextState.luckdust += segment.amount;
    nextState.care.reactionType = 'oracleLuckdust';
    nextState.care.dialogue = getCareDialogue(pal.id, 'oracleLuckdust');
  }

  if (segment.type === 'nothing') {
    nextState.care.reactionType = 'oracleNothing';
    nextState.care.dialogue = getCareDialogue(pal.id, 'oracleNothing');
  }

  if (segment.type === 'plague') {
    nextState.plagued = true;
    nextState.needs.plague = 100;
    nextState.care.reactionType = 'sick';
    nextState.care.dialogue = getCareDialogue(pal.id, 'sick');
  }

  if (segment.type === 'unique') {
    nextState = applyUniqueOracleEffect(nextState, segment.effect, pal);
    nextState.care = {
      ...nextState.care,
      reactionType: 'idle',
      dialogue: segment.xio || nextState.care.dialogue,
      lastOracleResult: {
        date: todayKey,
        label: segment.label,
        type: segment.type,
        amount: segment.amount || 0,
        text: segment.xio || segment.label,
      },
    };
  }

  setAppState(nextState);
  if (typeof pushActivity === 'function') {
    var oracleDeltas = {};
    if (segment.type === 'gloom') oracleDeltas.gloom = segment.amount;
    if (segment.type === 'luckdust') oracleDeltas.luckdust = segment.amount;
    if (segment.type === 'plague') oracleDeltas.plague = 100;
    pushActivity({
      palId: pal.id,
      type: 'oracle',
      system: pal.name + ' consulted the Dread Oracle: ' + segment.label + '.',
      quote: segment.xio || '',
      deltas: oracleDeltas,
      link: 'care',
    });
  }
  return segment;
}

function bindCareEvents(root) {
  if (root.dataset.bound === 'true') {
    return;
  }

  root.addEventListener('click', (event) => {
    const checkInButton = event.target.closest('[data-checkin-option]');
    if (checkInButton) {
      handleCheckIn(checkInButton.dataset.checkinOption);
      renderCare(root);
      return;
    }

    const giftOpenButton = event.target.closest('[data-gift-btn]');
    if (giftOpenButton) {
      if (giftOpenButton.disabled) {
        return;
      }
      var giftPanel = root.querySelector('[data-gift-panel]');
      if (giftPanel) {
        giftPanel.hidden = false;
        renderGiftPanel(root, getState());
      }
      return;
    }

    const giftCloseButton = event.target.closest('[data-close-gift]');
    if (giftCloseButton) {
      var closePanel = root.querySelector('[data-gift-panel]');
      if (closePanel) closePanel.hidden = true;
      return;
    }

    const giveGiftButton = event.target.closest('[data-give-gift]');
    if (giveGiftButton) {
      var itemId = giveGiftButton.dataset.giveGift;
      giveGift(itemId);
      var hiddenPanel = root.querySelector('[data-gift-panel]');
      if (hiddenPanel) hiddenPanel.hidden = true;
      renderCare(root);
      return;
    }

    const talkOpenButton = event.target.closest('[data-talk-btn]');
    if (talkOpenButton) {
      var talkPanel = root.querySelector('[data-talk-panel]');
      var openGiftPanel = root.querySelector('[data-gift-panel]');
      if (openGiftPanel) openGiftPanel.hidden = true;
      if (talkPanel) {
        talkPanel.hidden = !talkPanel.hidden;
        if (!talkPanel.hidden) {
          var resp = talkPanel.querySelector('[data-talk-response]');
          var meta = talkPanel.querySelector('[data-talk-meta]');
          if (resp) { resp.hidden = true; resp.textContent = ''; }
          if (meta) { meta.hidden = true; meta.textContent = ''; }
        }
      }
      return;
    }

    const talkCloseButton = event.target.closest('[data-close-talk]');
    if (talkCloseButton) {
      var closeTalkPanel = root.querySelector('[data-talk-panel]');
      if (closeTalkPanel) closeTalkPanel.hidden = true;
      return;
    }

    const talkMoodButton = event.target.closest('[data-talk-mood]');
    if (talkMoodButton) {
      var mood = talkMoodButton.dataset.talkMood;
      var result = talkToActivePal(mood);
      var responseEl = root.querySelector('[data-talk-response]');
      var metaEl = root.querySelector('[data-talk-meta]');
      if (responseEl && result && result.line) {
        responseEl.textContent = result.line;
        responseEl.hidden = false;
      }
      if (metaEl) {
        metaEl.textContent = result && result.rewarded
          ? '+1 TRUST  //  the first talk today actually counted.'
          : 'no trust gained — already talked today. they are still listening.';
        metaEl.hidden = false;
      }
      renderCare(root);
      return;
    }

    const actionButton = event.target.closest('[data-care-action]');
    if (actionButton) {
      applyCareAction(actionButton.dataset.careAction);
      renderCare(root);
      return;
    }

    const rosterSelectButton = event.target.closest('[data-care-roster-select]');
    if (rosterSelectButton) {
      if (focusPalForCare(rosterSelectButton.dataset.careRosterSelect)) {
        renderCare(root);
      }
      return;
    }

    const oracleButton = event.target.closest('[data-oracle-consult]');
    if (oracleButton) {
      const segment = consultDreadOracle();
      renderCare(root);
      if (segment) {
        animateOracleConsultation(root, segment.id);
        animateEightBallReveal(root, segment);
      }
      return;
    }

    const cureButton = event.target.closest('[data-cure-plague]');
    if (cureButton) {
      curePlague();
      renderCare(root);
      return;
    }

    const wardrobeToggle = event.target.closest('[data-wardrobe-toggle]');
    if (wardrobeToggle) {
      const panel = root.querySelector('[data-wardrobe-panel]');
      if (panel) {
        const willOpen = panel.hidden;
        panel.hidden = !willOpen;
        wardrobeToggle.setAttribute('aria-expanded', String(willOpen));
      }
      return;
    }

    const shopButton = event.target.closest('[data-wardrobe-shop]');
    if (shopButton) {
      if (shopButton.disabled) return;
      const result = shopForActivePalOutfit();
      // Re-render first so the freshly-unlocked outfit appears in the grid,
      // then restore the response message we just lost in the re-render.
      renderCare(root);
      const responseEl = root.querySelector('[data-wardrobe-shop-response]');
      if (responseEl) {
        if (result && result.line) {
          responseEl.textContent = result.line;
          responseEl.hidden = false;
        } else if (result && result.error === 'no-gloom') {
          responseEl.textContent = `Not enough Gloom. Need ${SHOPPING_TRIP_COST}.`;
          responseEl.hidden = false;
        } else if (result && result.error === 'complete') {
          responseEl.textContent = 'Wardrobe is already complete. There is nothing left to buy.';
          responseEl.hidden = false;
        }
      }
      return;
    }

    const equipButton = event.target.closest('[data-wardrobe-equip]');
    if (equipButton) {
      const outfitId = equipButton.dataset.wardrobeEquip || '';
      const currentState = getState();
      const palId = currentState.activePal;
      if (palId) {
        const previousOutfit = (currentState.palOutfits || {})[palId] || '';
        const nextOutfits = { ...(currentState.palOutfits || {}) };
        if (outfitId) {
          nextOutfits[palId] = outfitId;
        } else {
          delete nextOutfits[palId];
        }
        setAppState({ ...currentState, palOutfits: nextOutfits });
        if (typeof pushActivity === 'function' && previousOutfit !== outfitId) {
          const palName = (typeof getPalById === 'function' && getPalById(palId)) ? getPalById(palId).name : palId;
          let outfitName = 'their default look';
          if (outfitId && typeof getPalOutfitsForPal === 'function') {
            const found = getPalOutfitsForPal(palId).find((o) => o.id === outfitId);
            if (found) outfitName = found.name || outfitId;
          }
          pushActivity({
            palId: palId,
            type: 'wardrobe',
            system: palName + ' changed into ' + outfitName + '.',
            itemId: outfitId || '',
            link: 'care',
          });
        }
        renderCare(root);
      }
      return;
    }

    /* ---- PANTRY ---- */
    const pantryToggle = event.target.closest('[data-pantry-toggle]');
    if (pantryToggle) {
      const panel = root.querySelector('[data-pantry-panel]');
      if (panel) {
        const willOpen = panel.hidden;
        panel.hidden = !willOpen;
        pantryToggle.setAttribute('aria-expanded', String(willOpen));
        // Mutually exclusive: opening pantry collapses toybox so panels do
        // not stack on top of each other.
        if (willOpen) {
          const otherPanel = root.querySelector('[data-toybox-panel]');
          const otherToggle = root.querySelector('[data-toybox-toggle]');
          if (otherPanel && !otherPanel.hidden) {
            otherPanel.hidden = true;
            if (otherToggle) otherToggle.setAttribute('aria-expanded', 'false');
          }
        }
      }
      return;
    }

    const pantryShop = event.target.closest('[data-pantry-shop]');
    if (pantryShop) {
      if (pantryShop.disabled) return;
      const result = shopForActivePalPantry();
      renderCare(root);
      const responseEl = root.querySelector('[data-pantry-shop-response]');
      if (responseEl) {
        if (result && result.haul && result.haul.length) {
          const names = result.haul.map((f) => f.name).join(', ');
          responseEl.textContent = (result.line ? result.line + ' ' : '') + `Brought back: ${names}.`;
          responseEl.hidden = false;
        } else if (result && result.error === 'no-gloom') {
          responseEl.textContent = `Not enough Gloom. Need ${PANTRY_TRIP_COST}.`;
          responseEl.hidden = false;
        } else if (result && result.error === 'no-catalog') {
          responseEl.textContent = 'The food store is empty today.';
          responseEl.hidden = false;
        }
      }
      return;
    }

    const pantryShopAll = event.target.closest('[data-pantry-shop-all]');
    if (pantryShopAll) {
      if (pantryShopAll.disabled) return;
      const result = shopPantryForAllOwnedPals();
      renderCare(root);
      const responseEl = root.querySelector('[data-pantry-shop-response]');
      if (responseEl) {
        if (result && result.stocked && result.stocked.length) {
          responseEl.textContent = `Stocked ${result.stocked.length} pal${result.stocked.length === 1 ? '' : 's'} for ${result.spent} gloom.`;
        } else {
          responseEl.textContent = 'No pals stocked. Check gloom and roster.';
        }
        responseEl.hidden = false;
      }
      return;
    }

    const shopArrow = event.target.closest('[data-shop-arrow]');
    if (shopArrow) {
      const carousel = shopArrow.closest('[data-shop-carousel]');
      const track = carousel && carousel.querySelector('[data-shop-track]');
      if (track) {
        const dir = shopArrow.dataset.shopArrow === 'next' ? 1 : -1;
        const w = track.clientWidth || 1;
        track.scrollBy({ left: dir * w, behavior: 'smooth' });
      }
      return;
    }

    const pantryBuy = event.target.closest('[data-pantry-buy-item]');
    if (pantryBuy) {
      if (pantryBuy.disabled) return;
      const result = buyPantryItemForActivePal(pantryBuy.dataset.pantryBuyItem);
      renderCare(root);
      const responseEl = root.querySelector('[data-pantry-shop-response]');
      if (responseEl) {
        if (result && result.food) {
          responseEl.textContent = (result.line ? result.line + ' ' : '') + `Bought: ${result.food.name}.`;
        } else if (result && result.error === 'no-gloom') {
          responseEl.textContent = 'Not enough Gloom.';
        } else if (result && result.error === 'not-in-stock') {
          responseEl.textContent = 'That item is no longer in stock.';
        } else {
          responseEl.textContent = 'Could not buy that item.';
        }
        responseEl.hidden = false;
      }
      return;
    }

    /* ---- TOYBOX ---- */
    const toyboxToggle = event.target.closest('[data-toybox-toggle]');
    if (toyboxToggle) {
      const panel = root.querySelector('[data-toybox-panel]');
      if (panel) {
        const willOpen = panel.hidden;
        panel.hidden = !willOpen;
        toyboxToggle.setAttribute('aria-expanded', String(willOpen));
        if (willOpen) {
          const otherPanel = root.querySelector('[data-pantry-panel]');
          const otherToggle = root.querySelector('[data-pantry-toggle]');
          if (otherPanel && !otherPanel.hidden) {
            otherPanel.hidden = true;
            if (otherToggle) otherToggle.setAttribute('aria-expanded', 'false');
          }
        }
      }
      return;
    }

    const toyboxShop = event.target.closest('[data-toybox-shop]');
    if (toyboxShop) {
      if (toyboxShop.disabled) return;
      const result = shopForActivePalToybox();
      renderCare(root);
      const responseEl = root.querySelector('[data-toybox-shop-response]');
      if (responseEl) {
        if (result && result.toy) {
          responseEl.textContent = (result.line ? result.line + ' ' : '') + `Brought back: ${result.toy.name}.`;
          responseEl.hidden = false;
        } else if (result && result.error === 'no-gloom') {
          responseEl.textContent = `Not enough Gloom. Need ${TOYBOX_TRIP_COST}.`;
          responseEl.hidden = false;
        } else if (result && result.error === 'all-owned') {
          responseEl.textContent = 'Every toy is already owned.';
          responseEl.hidden = false;
        }
      }
      return;
    }

    const toyboxShopAll = event.target.closest('[data-toybox-shop-all]');
    if (toyboxShopAll) {
      if (toyboxShopAll.disabled) return;
      const result = shopToyboxForAllOwnedPals();
      renderCare(root);
      const responseEl = root.querySelector('[data-toybox-shop-response]');
      if (responseEl) {
        if (result && result.stocked && result.stocked.length) {
          responseEl.textContent = `Bought toys for ${result.stocked.length} pal${result.stocked.length === 1 ? '' : 's'} for ${result.spent} gloom.`;
        } else {
          responseEl.textContent = 'No toys bought. Check gloom and roster.';
        }
        responseEl.hidden = false;
      }
      return;
    }

    const toyboxBuy = event.target.closest('[data-toybox-buy-item]');
    if (toyboxBuy) {
      if (toyboxBuy.disabled) return;
      const result = buyToyboxItemForActivePal(toyboxBuy.dataset.toyboxBuyItem);
      renderCare(root);
      const responseEl = root.querySelector('[data-toybox-shop-response]');
      if (responseEl) {
        if (result && result.toy) {
          responseEl.textContent = (result.line ? result.line + ' ' : '') + `Bought: ${result.toy.name}.`;
        } else if (result && result.error === 'no-gloom') {
          responseEl.textContent = 'Not enough Gloom.';
        } else if (result && result.error === 'already-owned') {
          responseEl.textContent = 'Already owned.';
        } else if (result && result.error === 'not-in-stock') {
          responseEl.textContent = 'That toy is no longer in stock.';
        } else {
          responseEl.textContent = 'Could not buy that toy.';
        }
        responseEl.hidden = false;
      }
      return;
    }

    if (event.target.closest('[data-dismiss-death]')) {
      const recentDeath = (getState().deathRecord || []).find((deathEntry) => !deathEntry.acknowledged);
      setAppState((s) => ({
        ...s,
        deathRecord: (s.deathRecord || []).map((d) =>
          d.acknowledged ? d : { ...d, acknowledged: true }
        ),
      }));

      const remainingOwned = (getState().ownedPals || []).filter((id) => {
        const p = getPalById(id);
        return p && !p.placeholder;
      });

      if (remainingOwned.length === 0) {
        const deathPanel = root.querySelector('[data-death-panel]');
        const gameOverPanel = root.querySelector('[data-game-over-panel]');
        const gameOverName = root.querySelector('[data-game-over-pal-name]');

        root.dataset.gameOverState = 'true';

        if (deathPanel) {
          deathPanel.hidden = true;
        }

        if (gameOverName && recentDeath) {
          gameOverName.textContent = `${recentDeath.palName} is gone.`;
        }

        if (gameOverPanel) {
          gameOverPanel.hidden = false;
        }

        return;
      }

      root.dataset.gameOverState = 'false';
      renderCare(root);
      return;
    }

    if (event.target.closest('[data-game-over-continue]')) {
      setAppState((currentState) => ({
        ...currentState,
        activePal: null,
        ownedPals: [],
        unlockedPals: [],
        palMoodLedger: {},
        plagued: false,
        needs: { ...DEFAULT_STATE.needs },
        care: { ...DEFAULT_CARE_STATE },
        clone: { ...DEFAULT_CLONE_STATE },
        seasonalEvent: { ...DEFAULT_SEASONAL_EVENT_STATE },
      }));
      root.dataset.gameOverState = 'false';
      navigateWithAudioResume('adopt.html');
      return;
    }
  });

  const image = root.querySelector('[data-pal-image]');
  const placeholder = root.querySelector('[data-pal-placeholder]');
  const frame = root.querySelector('[data-pal-frame]');

  if (image && frame && placeholder) {
    image.addEventListener('load', () => updateImageState(frame, image, placeholder));
    image.addEventListener('error', () => updateImageState(frame, image, placeholder));
  }

  // Auto-shop config: checkbox toggle + budget input. We use 'change' for the
  // checkbox (fires once) and 'change' for the number input (fires on blur or
  // Enter — avoids spamming setAppState on every keystroke).
  root.addEventListener('change', (event) => {
    const toggle = event.target.closest('[data-autoshop-toggle]');
    if (toggle) {
      const palId = toggle.dataset.autoshopToggle;
      const enabled = !!toggle.checked;
      setAppState((state) => {
        const ledger = state.palMoodLedger || {};
        const entry = ledger[palId] || {};
        return {
          ...state,
          palMoodLedger: {
            ...ledger,
            [palId]: { ...entry, autoShopEnabled: enabled },
          },
        };
      });
      renderCare(root);
      return;
    }
    const budget = event.target.closest('[data-autoshop-budget]');
    if (budget) {
      const palId = budget.dataset.autoshopBudget;
      const value = Math.max(0, Math.floor(Number(budget.value) || 0));
      setAppState((state) => {
        const ledger = state.palMoodLedger || {};
        const entry = ledger[palId] || {};
        return {
          ...state,
          palMoodLedger: {
            ...ledger,
            [palId]: { ...entry, autoShopDailyBudget: value },
          },
        };
      });
      renderCare(root);
      return;
    }
  });

  root.dataset.bound = 'true';
}

function renderHabitsEmptyState(root) {
  root.innerHTML = `
    <section class="panel empty-state-panel" role="status" aria-live="polite">
      <p class="eyebrow">NO PAL ASSIGNED</p>
      <h1 class="screen-title">Routine Ledger</h1>
      <p class="empty-copy">No Pal has selected you yet. That is about to change.</p>
      <div class="empty-actions">
        <a class="action-button" href="choose-pal.html">Choose Your Pal</a>
      </div>
    </section>
  `;
}

function renderHabits(root) {
  const state = getState();
  const pal = getPalById(state.activePal);

  if (!pal) {
    renderHabitsEmptyState(root);
    return;
  }

  const weekTiles = getHabitWeekTiles(state.habitHistory);
  const completedCount = weekTiles.filter((entry) => entry.completed).length;
  const loggedToday = Boolean(state.habitHistory[getLocalDateKey()]);

  root.querySelector('[data-habits-date]').textContent = formatDateLabel();
  const habitsNameEl = root.querySelector('[data-habits-name]');
  if (habitsNameEl) habitsNameEl.textContent = pal.name;
  const activeClone = getActiveClone(state);
  const cloneSubtitleEl = root.querySelector('[data-pal-clone-subtitle]');
  if (cloneSubtitleEl) {
    if (activeClone && activeClone.sequenceString) {
      cloneSubtitleEl.textContent = getCloneSubtitleText(activeClone, state);
      cloneSubtitleEl.hidden = false;
    } else {
      cloneSubtitleEl.hidden = true;
    }
  }
  const habitsIdEl = root.querySelector('[data-habits-id]');
  if (habitsIdEl) habitsIdEl.textContent = pal.id.toUpperCase();
  const habitsDialogueEl = root.querySelector('[data-habits-dialogue]');
  if (habitsDialogueEl) {
    habitsDialogueEl.textContent = state.habitHistory[getLocalDateKey()]
      ? `${getCareDialogue(pal.id, 'comfort')} Routine is now on record.`
      : `${getCareDialogue(pal.id, 'idle')} Habits remain optional only in theory.`;
  }
  const habitsSummaryEl = root.querySelector('[data-habits-summary]');
  if (habitsSummaryEl) {
    habitsSummaryEl.textContent = `${completedCount}/7 this week`;
    setDataTip(habitsSummaryEl, 'This week runs Sunday through Saturday. Logged days fill in, missed days stay dim, and future days wait their turn.');
  }
  // Luckdust progress bar
  const streak = state.streak || 0;
  const nextRewardIn = getNextLuckdustMilestone(streak);
  const daysIntoInterval = STREAK_REWARD_INTERVAL - nextRewardIn;
  const progressPct = Math.round((daysIntoInterval / STREAK_REWARD_INTERVAL) * 100);

  const progressFill = root.querySelector('[data-habit-progress-fill]');
  const progressLabel = root.querySelector('[data-habit-luckdust-label]');
  const progressHint = root.querySelector('[data-habit-progress-hint]');

  if (progressFill) {
    progressFill.style.width = `${progressPct}%`;
  }
  if (progressLabel) {
    progressLabel.textContent = nextRewardIn === 1
      ? 'Luckdust reward is 1 day away'
      : `${nextRewardIn} days until Luckdust reward`;
  }
  if (progressHint) {
    progressHint.textContent = streak > 0
      ? `Primary streak: ${streak} days. Daily check-ins and linked calendar work advance it.`
      : `Daily check-ins and linked calendar work advance the primary streak toward Luckdust.`;
  }
  setDataTip(root.querySelector('.habit-progress-block'), 'Luckdust comes from the primary streak. This block shows how close the next streak reward is.');
  root.querySelector('[data-habit-status]').textContent = getHabitStatusLine(state);

  const todayBadge = root.querySelector('[data-habit-today-badge]');
  if (todayBadge) {
    todayBadge.textContent = loggedToday ? 'LOGGED' : 'PENDING';
    todayBadge.classList.toggle('is-logged', loggedToday);
    todayBadge.classList.toggle('is-pending', !loggedToday);
  }

  const daysLoggedValue = root.querySelector('[data-habit-days-logged]');
  if (daysLoggedValue) {
    daysLoggedValue.textContent = `${completedCount} / 7`;
  }

  const nextRewardValue = root.querySelector('[data-habit-next-reward]');
  if (nextRewardValue) {
    nextRewardValue.textContent = nextRewardIn === 1 ? 'TODAY' : `${nextRewardIn} DAYS`;
  }

  const image = root.querySelector('[data-pal-image]');
  const placeholder = root.querySelector('[data-pal-placeholder]');
  const frame = root.querySelector('[data-pal-frame]');
  if (image && placeholder && frame) {
    image.alt = `${pal.name} portrait`;
    applyPalPlaceholder(placeholder, pal);
    applyPalFrameAccent(frame, pal, state);
    bindResolvedImage(image, frame, placeholder, pal.slug || pal.id, 'portrait');
  }

  const list = root.querySelector('[data-habit-grid]');
  list.innerHTML = weekTiles.map((entry) => `
    <li class="habit-day${entry.completed ? ' is-complete' : ''}${entry.isToday ? ' is-today' : ''}${entry.isFuture ? ' is-future' : ''}${entry.isMissed ? ' is-missed' : ''}"
        aria-label="${escapeHtml(`${entry.label}: ${entry.statusLabel}`)}"
        ${entry.isToday ? 'aria-current="date"' : ''}>
      <p class="habit-day-name">${entry.dayInitial}</p>
      <div class="habit-day-check" aria-hidden="true">${entry.completed ? '✓' : entry.isToday ? '•' : ''}</div>
      <p class="habit-day-date">${entry.dateNumber}</p>
    </li>
  `).join('');
}

function bindHabitsEvents(root) {
  if (root.dataset.bound === 'true') {
    return;
  }

  root.addEventListener('click', (event) => {
    const checkInButton = event.target.closest('[data-checkin-option]');
    if (checkInButton) {
      handleCheckIn(checkInButton.dataset.checkinOption);
      renderHabits(root);
      renderCheckinPanel(root, getState());
      renderStreak(root);
      return;
    }

    const oracleToggle = event.target.closest('[data-checkin-oracle-toggle]');
    if (oracleToggle) {
      const oracleEl = root.querySelector('[data-checkin-oracle]');
      if (oracleEl) {
        oracleEl.classList.toggle('is-oracle-collapsed');
        renderHabitsOracle(root);
      }
      return;
    }

    const questionToggle = event.target.closest('[data-checkin-question-toggle]');
    if (questionToggle) {
      const panel = root.querySelector('[data-checkin-panel]');
      if (panel) {
        panel.classList.toggle('is-question-collapsed');
        renderCheckinPanel(root, getState());
      }
      return;
    }

    const panelToggle = event.target.closest('[data-checkin-panel-toggle]');
    if (panelToggle) {
      const panel = root.querySelector('[data-checkin-panel]');
      if (panel) {
        panel.classList.toggle('is-panel-collapsed');
        renderCheckinPanel(root, getState());
      }
      return;
    }

    const oracleButton = event.target.closest('[data-oracle-consult]');
    if (oracleButton) {
      const segment = consultDreadOracle();
      buildOracle(root);
      renderHabitsOracle(root);
      buildEightBall(root);
      renderStreak(root);
      if (segment) {
        animateOracleConsultation(root, segment.id);
        animateEightBallReveal(root, segment);
      }
      return;
    }
  });

  const image = root.querySelector('[data-pal-image]');
  const placeholder = root.querySelector('[data-pal-placeholder]');
  const frame = root.querySelector('[data-pal-frame]');

  if (image && frame && placeholder) {
    image.addEventListener('load', () => updateImageState(frame, image, placeholder));
    image.addEventListener('error', () => updateImageState(frame, image, placeholder));
  }

  root.dataset.bound = 'true';
}

function renderStreakEmptyState(root) {
  root.innerHTML = `
    <section class="panel empty-state-panel" role="status" aria-live="polite">
      <p class="eyebrow">NO PAL ASSIGNED</p>
      <h1 class="screen-title">Persistence Report</h1>
      <p class="empty-copy">No Pal has selected you yet. That is about to change.</p>
      <div class="empty-actions">
        <a class="action-button" href="choose-pal.html">Choose Your Pal</a>
      </div>
    </section>
  `;
}

function renderStreak(root) {
  const state = getState();
  const pal = getPalById(state.activePal);

  if (!pal) {
    renderStreakEmptyState(root);
    return;
  }

  const todayKey = getLocalDateKey();
  const habitsLogged = getHabitCompletionCount(state.habitHistory, 7);
  const nextRewardIn = getNextLuckdustMilestone(state.streak);
  const trophyCase = root.querySelector('[data-trophy-case]');
  const streakStartDate = getStreakStartDate(state);
  const completedSinceStreak = (state.tasks || []).filter(function(t) {
    return t.completed && t.completedAt && getLocalDateKey(new Date(t.completedAt)) >= streakStartDate;
  }).length;
  const gloomSinceStreak = completedSinceStreak * TASK_REWARD;
  const trustGained = Math.min((state.streak || 0) * 2, 30);
  const lastBreakDate = state.meta && state.meta.lastStreakBreakDate
    ? getDateFromDateKey(state.meta.lastStreakBreakDate)
    : null;
  const todayDate = getDateFromDateKey(todayKey) || new Date();
  const daysSinceBreak = lastBreakDate
    ? Math.max(0, Math.floor((todayDate.getTime() - lastBreakDate.getTime()) / 86400000))
    : (state.streak || 0);

  const streakDateEl = root.querySelector('[data-streak-date]');
  if (streakDateEl) streakDateEl.textContent = formatDateLabel();
  const streakNameEl = root.querySelector('[data-streak-name]');
  if (streakNameEl) streakNameEl.textContent = pal.name;
  const activeClone = getActiveClone(state);
  const cloneSubtitleEl = root.querySelector('[data-pal-clone-subtitle]');
  if (cloneSubtitleEl) {
    if (activeClone && activeClone.sequenceString) {
      cloneSubtitleEl.textContent = getCloneSubtitleText(activeClone, state);
      cloneSubtitleEl.hidden = false;
    } else {
      cloneSubtitleEl.hidden = true;
    }
  }
  const streakIdEl = root.querySelector('[data-streak-id]');
  if (streakIdEl) streakIdEl.textContent = pal.id.toUpperCase();
  const streakDialogueEl = root.querySelector('[data-streak-dialogue]');
  if (streakDialogueEl) {
    streakDialogueEl.textContent = getStreakSpecificDialogue(pal.id, state);
  }
  const streakCurrentEl = root.querySelector('[data-streak-current]');
  if (streakCurrentEl) streakCurrentEl.textContent = String(state.streak).padStart(2, '0');
  const streakRecordEl = root.querySelector('[data-streak-record]');
  if (streakRecordEl) streakRecordEl.textContent = String(state.meta.longestStreak || state.streak || 0).padStart(2, '0');
  const streakNextEl = root.querySelector('[data-streak-next]');
  if (streakNextEl) streakNextEl.textContent = String(nextRewardIn).padStart(2, '0');
  const streakHabitsEl = root.querySelector('[data-streak-habits]');
  if (streakHabitsEl) streakHabitsEl.textContent = `${habitsLogged}/7`;
  const streakTrustEl = root.querySelector('[data-streak-trust-gained]');
  if (streakTrustEl) streakTrustEl.textContent = `+${trustGained}`;
  const streakGloomEl = root.querySelector('[data-streak-gloom-earned]');
  if (streakGloomEl) streakGloomEl.textContent = String(gloomSinceStreak);
  const streakTasksEl = root.querySelector('[data-streak-tasks-done]');
  if (streakTasksEl) streakTasksEl.textContent = String(completedSinceStreak);
  const streakDaysEl = root.querySelector('[data-streak-days-since-break]');
  if (streakDaysEl) streakDaysEl.textContent = String(daysSinceBreak);

  // Drive the impact bars relative to a generous "soft cap" so the visualization
  // always feels alive without ever pinning at 100% for casual play.
  const setImpactBar = (selector, value, cap) => {
    const el = root.querySelector(selector);
    if (!el) return;
    const safeCap = Math.max(1, cap);
    const pct = Math.max(2, Math.min(100, Math.round((value / safeCap) * 100)));
    el.style.setProperty('--fill', pct + '%');
  };
  setImpactBar('[data-streak-trust-bar]', Math.max(0, trustGained), 50);
  setImpactBar('[data-streak-gloom-bar]', Math.max(0, gloomSinceStreak), 30);
  setImpactBar('[data-streak-tasks-bar]', Math.max(0, completedSinceStreak), 40);
  // Days-since-break maxes against the user's personal record so a longer chain reads stronger.
  setImpactBar('[data-streak-days-bar]', Math.max(0, daysSinceBreak), Math.max(7, state.bestStreak || 7));

  const impactSummaryEl = root.querySelector('[data-streak-impact-summary]');
  if (impactSummaryEl) {
    if (!state.streak || state.streak === 0) {
      impactSummaryEl.textContent = 'The streak is fresh. The pal is watching, indifferently.';
    } else {
      const totalActs = (trustGained > 0 ? 1 : 0) + (gloomSinceStreak > 0 ? 1 : 0) + (completedSinceStreak > 0 ? 1 : 0);
      const tone = totalActs >= 3
        ? 'The chain is doing real work.'
        : totalActs === 2
          ? 'Quiet progress. Counts anyway.'
          : totalActs === 1
            ? 'Barely a flicker. Still a flicker.'
            : 'Nothing measurable yet. Show up tomorrow.';
      impactSummaryEl.textContent = `Day ${state.streak}: +${trustGained} trust, ${gloomSinceStreak} gloom, ${completedSinceStreak} tasks. ${tone}`;
    }
  }
  setDataTip(streakCurrentEl, getStreakTooltipCopy('current'));
  setDataTip(streakRecordEl, 'Your longest recorded streak under the current save.');
  setDataTip(streakNextEl, getStreakTooltipCopy('next'));
  setDataTip(streakHabitsEl, getStreakTooltipCopy('habits'));
  const trophyCountEl = root.querySelector('[data-trophy-count]');
  if (trophyCountEl) trophyCountEl.textContent = `${state.antiAchievements.unlockedIds.length} UNLOCKED`;

  const image = root.querySelector('[data-pal-image]');
  const placeholder = root.querySelector('[data-pal-placeholder]');
  const frame = root.querySelector('[data-pal-frame]');
  if (image && placeholder && frame) {
    image.alt = `${pal.name} portrait`;
    applyPalPlaceholder(placeholder, pal);
    applyPalFrameAccent(frame, pal, state);
    bindResolvedImage(image, frame, placeholder, pal.slug || pal.id, 'portrait');
  }

  const openDateHistory = Array.isArray(state.meta && state.meta.openDateHistory)
    ? state.meta.openDateHistory
    : [];
  const visitedDateKeys = new Set(openDateHistory);
  const streakList = root.querySelector('[data-streak-week]');
  if (streakList) {
    streakList.innerHTML = getRecentDateKeys(7).map((dateKey) => {
      const date = getDateFromKey(dateKey);
      const isToday = dateKey === todayKey;
      const isVisited = isToday || visitedDateKeys.has(dateKey);
      const dayName = date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();

      return `
      <div class="streak-orbit-day${isVisited ? ' is-visited' : ''}${isToday ? ' is-today' : ''}">
        <div class="streak-orbit-ring" aria-hidden="true"></div>
        <span class="streak-orbit-label">${isToday ? 'TODAY' : escapeHtml(dayName.slice(0, 3))}</span>
      </div>
    `;
    }).join('');
  }

  trophyCase.innerHTML = renderTrophyCaseInner(state, pal);
  renderDisappointmentPanel(root, state);
}

// Returns ASCII-y phosphor meter + polaroid trophy cards + locked teasers.
// Aimed at giving the player something to chase (locked silhouettes) while
// still celebrating what they unlocked (NEW pulse on newest, dust corners,
// glyph stamps, pal whispers).
function renderTrophyCaseInner(state, pal) {
  const allTrophies = (typeof ANTI_ACHIEVEMENTS === 'undefined' ? [] : ANTI_ACHIEVEMENTS);
  const unlockLog = (state.antiAchievements && state.antiAchievements.unlockLog) || [];
  const unlockedIds = new Set((state.antiAchievements && state.antiAchievements.unlockedIds) || []);
  const totalCount = allTrophies.length || 1;
  const unlockedCount = unlockedIds.size;
  const ratio = Math.min(1, unlockedCount / totalCount);

  // ASCII phosphor meter — 16 cells.
  const cells = 16;
  const filledCells = Math.round(ratio * cells);
  const meter = '█'.repeat(filledCells) + '▒'.repeat(Math.max(0, cells - filledCells));

  // Glyph chosen by id-hash so each trophy has a stable visual signature.
  const GLYPHS = ['☠', '✦', '⚝', '✧', '☄', '⚆', '✶', '⌬', '⚈', '⚇', '◈', '⌑'];
  function glyphFor(id) {
    const s = String(id || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return GLYPHS[h % GLYPHS.length];
  }

  // Header: progress meter + next-up hint.
  const nextLocked = allTrophies.find((t) => !unlockedIds.has(t.id));
  const nextHint = nextLocked
    ? `Next quarry: <em>${escapeHtml(nextLocked.unlock_condition || '???')}</em>`
    : 'Every dusty trophy claimed. The shelf groans.';
  const header = `
    <li class="trophy-case-header" aria-hidden="false">
      <div class="trophy-meter-row">
        <span class="trophy-meter-label">CASE</span>
        <span class="trophy-meter-bar">${meter}</span>
        <span class="trophy-meter-count">${unlockedCount}/${totalCount}</span>
      </div>
      <p class="trophy-next-hint">${nextHint}</p>
    </li>
  `;

  // Unlocked polaroid cards. Newest gets is-new pulse.
  const unlockedCards = unlockLog.map((entry, index) => {
    const achievement = allTrophies.find((item) => item.id === entry.id);
    const currentPalId = pal.id;
    const trophyPalId = entry.palId || currentPalId;
    const dialogue = achievement && achievement.palDialogue && achievement.palDialogue[currentPalId]
      ? achievement.palDialogue[currentPalId]
      : achievement && achievement.palDialogue && achievement.palDialogue[trophyPalId]
        ? achievement.palDialogue[trophyPalId]
        : entry.palReactionDialogue || '';
    const tipCopy = achievement && achievement.unlock_condition
      ? achievement.unlock_condition
      : 'Unlock condition unavailable.';
    const cls = ['trophy-card', 'is-unlocked'];
    if (index % 2) cls.push('is-tilted');
    if (index === 0) cls.push('is-new');
    return `
      <li class="${cls.join(' ')}" data-tip="${escapeHtml(tipCopy)}" tabindex="0">
        <span class="trophy-glyph" aria-hidden="true">${glyphFor(entry.id)}</span>
        <span class="trophy-corner trophy-corner-tl" aria-hidden="true"></span>
        <span class="trophy-corner trophy-corner-br" aria-hidden="true"></span>
        ${index === 0 ? '<span class="trophy-new-flag" aria-hidden="true">NEW</span>' : ''}
        <p class="trophy-date label">${escapeHtml(entry.date || '')}</p>
        <p class="trophy-title">${escapeHtml(entry.title || '')}</p>
        <p class="trophy-whisper">"${escapeHtml(dialogue)}"</p>
      </li>
    `;
  }).join('');

  // Locked teaser silhouettes (up to 3) — give the player something to chase.
  const locked = allTrophies.filter((t) => !unlockedIds.has(t.id)).slice(0, 3);
  const lockedCards = locked.map((t, i) => {
    const teaser = String(t.unlock_condition || '???')
      .split(' ')
      .slice(0, 6)
      .join(' ');
    return `
      <li class="trophy-card is-locked${i % 2 ? ' is-tilted' : ''}" data-tip="${escapeHtml(t.unlock_condition || 'Unknown unlock condition.')}" tabindex="0">
        <span class="trophy-glyph trophy-glyph-locked" aria-hidden="true">?</span>
        <p class="trophy-date label">SEALED</p>
        <p class="trophy-title">??? ??? ???</p>
        <p class="trophy-whisper trophy-whisper-locked">Hint: ${escapeHtml(teaser)}…</p>
      </li>
    `;
  }).join('');

  if (!unlockedCards && !lockedCards) {
    return `${header}<li class="trophy-card is-empty"><p class="trophy-title">No anti-achievements unlocked yet. Competence remains suspiciously absent from the evidence.</p></li>`;
  }

  return `${header}${unlockedCards}${lockedCards}`;
}

function bindStreakEvents(root) {
  if (root.dataset.bound === 'true') {
    return;
  }

  const image = root.querySelector('[data-pal-image]');
  const placeholder = root.querySelector('[data-pal-placeholder]');
  const frame = root.querySelector('[data-pal-frame]');

  if (image && frame && placeholder) {
    image.addEventListener('load', () => updateImageState(frame, image, placeholder));
    image.addEventListener('error', () => updateImageState(frame, image, placeholder));
  }

  root.dataset.bound = 'true';
}

function renderLabEmptyState(root) {
  root.innerHTML = `
    <section class="panel empty-state-panel" role="status" aria-live="polite">
      <p class="eyebrow">NO PAL ASSIGNED</p>
      <h1 class="screen-title">Clone Chamber</h1>
      <p class="empty-copy">No Pal has selected you yet. That is about to change.</p>
      <div class="empty-actions">
        <a class="action-button" href="choose-pal.html">Choose Your Pal</a>
      </div>
    </section>
  `;
}

function renderLab(root) {
  const state = getState();
  const divergencePanel = root.querySelector('[data-divergence-banner]');
  if (divergencePanel) {
    const justDiverged = state.meta.firstDivergenceDate === getLocalDateKey()
      && (state.clone.history || []).some((entry) => (entry.generation || 0) >= 2);
    divergencePanel.hidden = !justDiverged;
  }
  const clonePair = normalizeClonePair(state.clone.clonePair, state);
  const pal = getPalById(clonePair.palA || state.activePal);
  const basePal = getPalById(clonePair.palB || clonePair.palA || state.activePal);
  const compatibilityScore = clonePair.palA && clonePair.palB && clonePair.palA !== clonePair.palB
    ? getCompatibilityScore(state, clonePair.palA, clonePair.palB)
    : 0;

  if (!pal) {
    renderLabEmptyState(root);
    return;
  }

  root.querySelector('[data-lab-date]').textContent = formatDateLabel();
  root.querySelector('[data-lab-gloom]').textContent = String(state.gloom).padStart(3, '0');
  root.querySelector('[data-lab-luckdust]').textContent = String(state.luckdust).padStart(2, '0');
  const labNameEl = root.querySelector('[data-lab-name]');
  if (labNameEl) labNameEl.textContent = pal.name;
  const labIdEl = root.querySelector('[data-lab-id]');
  if (labIdEl) labIdEl.textContent = pal.id.toUpperCase();
  const labDialogueEl = root.querySelector('[data-lab-dialogue]');
  if (labDialogueEl) {
    labDialogueEl.textContent = state.clone.dialogue || getLabDialogue(pal.id, 'idle');
  }
  root.querySelector('[data-lab-status]').textContent = getCloneStatusLabel(state).toUpperCase();
  const labRiskEl = root.querySelector('[data-lab-risk]');
  if (labRiskEl) labRiskEl.textContent = `Mutation Risk ${String(pal.mutationRisk).padStart(2, '0')}/10 · Base ${String((basePal && basePal.mutationRisk) || pal.mutationRisk).padStart(2, '0')}/10`;
  root.querySelector('[data-lab-luck-score]').textContent = String(pal.luck).padStart(2, '0');
  root.querySelector('[data-lab-pessimism-score]').textContent = String(pal.pessimism).padStart(2, '0');
  root.querySelector('[data-lab-base-risk-score]').textContent = String((basePal && basePal.mutationRisk) || pal.mutationRisk).padStart(2, '0');
  root.querySelector('[data-lab-clone-bonus]').textContent = `+${getCloneGloomBonus(state)}`;
  setDataTip(root.querySelector('[data-lab-gloom]'), getCurrencyTooltipCopy('gloom'));
  setDataTip(root.querySelector('[data-lab-luckdust]'), getCurrencyTooltipCopy('luckdust'));
  setDataTip(root.querySelector('[data-lab-luck-score]'), getPalStatTooltipCopy('luck'));
  setDataTip(root.querySelector('[data-lab-pessimism-score]'), getPalStatTooltipCopy('pessimism'));
  setDataTip(root.querySelector('[data-lab-base-risk-score]'), getPalStatTooltipCopy('mutation'));
  setDataTip(root.querySelector('[data-lab-clone-bonus]'), getPalStatTooltipCopy('cloneBonus'));
  const activeClone = getActiveClone(state);
  const cloneSubtitleEl = root.querySelector('[data-lab-clone-subtitle]');
  if (cloneSubtitleEl) {
    if (activeClone && activeClone.sequenceString) {
      cloneSubtitleEl.textContent = getCloneSubtitleText(activeClone, state);
      cloneSubtitleEl.hidden = false;
    } else {
      cloneSubtitleEl.hidden = true;
    }
  }
  setDataTip(cloneSubtitleEl, activeClone && activeClone.sequenceString ? getPalStatTooltipCopy('cloneBonus') : '');

  const image = root.querySelector('[data-pal-image]');
  const placeholder = root.querySelector('[data-pal-placeholder]');
  const frame = root.querySelector('[data-pal-frame]');
  const shipNote = root.querySelector('[data-pal-ship-note]');
  if (image && placeholder && frame) {
    image.alt = `${pal.name} portrait`;
    applyPalPlaceholder(placeholder, pal);
    applyPalFrameAccent(frame, pal, state);
    bindResolvedImage(image, frame, placeholder, pal.slug || pal.id, 'portrait', shipNote);
  }

  const shipFrame = root.querySelector('[data-lab-ship-frame]');
  const shipImage = root.querySelector('[data-lab-ship-image]');
  const shipPlaceholder = root.querySelector('[data-lab-ship-placeholder]');
  const shipCopy = root.querySelector('[data-lab-ship-copy]');
  const cloneArtFrame = root.querySelector('[data-lab-clone-art-frame]');
  const cloneArtImage = root.querySelector('[data-lab-clone-art]');
  const cloneArtPlaceholder = root.querySelector('[data-lab-clone-art-placeholder]');
  const cloneArtCopy = root.querySelector('[data-lab-clone-art-copy]');
  const mediaNote = root.querySelector('[data-lab-media-note]');
  const adventureFrame = root.querySelector('[data-lab-adventure-frame]');
  const adventureImage = root.querySelector('[data-lab-adventure-image]');
  const adventurePlaceholder = root.querySelector('[data-lab-adventure-placeholder]');
  const adventureCopy = root.querySelector('[data-lab-adventure-copy]');
  const adventureTag = root.querySelector('[data-lab-adventure-tag]');

  if (shipFrame && shipImage && shipPlaceholder) {
    shipImage.alt = `${pal.name} ship`;
    shipPlaceholder.textContent = `${pal.name.slice(0, 4).toUpperCase()} SHIP`;
    bindResolvedImage(shipImage, shipFrame, shipPlaceholder, pal.slug || pal.id, 'ship');
  }
  if (shipCopy) {
    shipCopy.textContent = `${pal.name}'s ship is staged for chamber launch. ${basePal ? `${basePal.name} supplies the mutation base.` : 'The chamber is borrowing from the same source twice.'}`;
  }

  const chamberButton = root.querySelector('[data-start-clone]');
  const countdown = root.querySelector('[data-clone-countdown]');
  const cycle = state.clone.activeCycle;
  const cycleLengthNode = root.querySelector('[data-lab-cycle-length]');
  const compatibilityNode = root.querySelector('[data-lab-compatibility]');
  const archiveTotalNode = root.querySelector('[data-lab-archive-total]');
  const pairSummaryNode = root.querySelector('[data-lab-pair-summary]');
  const chamberPanel = root.querySelector('.chamber-panel');
  const ownedPalOptions = (state.ownedPals || []).map((palId) => getPalById(palId)).filter((entry) => {
    if (!entry || entry.placeholder) {
      return false;
    }

    const ledgerEntry = state.palMoodLedger[entry.id];
    return !(ledgerEntry && ledgerEntry.isDead);
  });
  const totalCycleDuration = cycle && typeof cycle.startedAt === 'number' && typeof cycle.endsAt === 'number'
    ? Math.max(0, cycle.endsAt - cycle.startedAt)
    : getCloneDurationMs(pal, state);

  if (cycleLengthNode) {
    cycleLengthNode.textContent = formatCountdown(totalCycleDuration);
  }
  setDataTip(countdown, 'Clone countdown tracks the active chamber cycle. When it reaches zero, the reveal is ready to archive.');

  if (archiveTotalNode) {
    archiveTotalNode.textContent = String((state.clone.history || []).length).padStart(2, '0');
  }

  if (compatibilityNode) {
    if (!clonePair.palA || !clonePair.palB) {
      compatibilityNode.textContent = '--';
    } else if (clonePair.palA === clonePair.palB) {
      compatibilityNode.textContent = 'PAIR';
    } else {
      const compatState = compatibilityScore >= COMPATIBILITY_HIGH_THRESHOLD
        ? 'HIGH'
        : compatibilityScore >= COMPATIBILITY_MINIMUM_TO_CLONE
          ? 'READY'
          : 'LOW';
      compatibilityNode.textContent = `${String(compatibilityScore).padStart(2, '0')} ${compatState}`;
    }
  }

  if (chamberPanel) {
    const startButton = chamberPanel.querySelector('[data-start-clone]');
    let selectorBlock = chamberPanel.querySelector('.clone-base-selector');
    if (!selectorBlock && startButton) {
      selectorBlock = document.createElement('div');
      selectorBlock.className = 'clone-base-selector';
      startButton.insertAdjacentElement('beforebegin', selectorBlock);
    }

    if (selectorBlock) {
      selectorBlock.innerHTML = `
        <p class="label">Select Clone Pair</p>
        <div class="clone-pair-grid">
          <label class="clone-pair-field">
            <span class="task-meta">Dominant Source</span>
            <select class="task-input calendar-select" data-clone-pal-a>
              ${ownedPalOptions.map((entry) => `<option value="${entry.id}"${entry.id === clonePair.palA ? ' selected' : ''}>${entry.name}</option>`).join('')}
            </select>
          </label>
          <label class="clone-pair-field">
            <span class="task-meta">Mutation Base</span>
            <select class="task-input calendar-select" data-clone-pal-b>
              ${ownedPalOptions.map((entry) => `<option value="${entry.id}"${entry.id === clonePair.palB ? ' selected' : ''}>${entry.name}</option>`).join('')}
            </select>
          </label>
        </div>
        <p class="task-meta">Cycle runs with ${escapeHtml(pal.name)} as dominant source and ${escapeHtml((basePal && basePal.name) || pal.name)} as mutation base.</p>
        <p class="task-meta" data-clone-pair-note></p>
      `;
    }
  }

  const pairNote = root.querySelector('[data-clone-pair-note]');
  let pairSummaryText = 'Select two owned pals to inspect compatibility and inherited drift.';
  if (clonePair.palA && clonePair.palB) {
    if (clonePair.palA === clonePair.palB) {
      pairSummaryText = 'Compatibility locked. The chamber requires two distinct source pals.';
    } else {
      const needed = Math.max(0, COMPATIBILITY_MINIMUM_TO_CLONE - compatibilityScore);
      const tier = compatibilityScore >= COMPATIBILITY_HIGH_THRESHOLD ? 'High' : compatibilityScore >= COMPATIBILITY_MINIMUM_TO_CLONE ? 'Sufficient' : 'Insufficient';
      pairSummaryText = needed > 0
        ? `Compatibility: ${compatibilityScore} - ${needed} more day${needed !== 1 ? 's' : ''} needed.`
        : `Compatibility: ${compatibilityScore} - ${tier} · ${compatibilityScore >= COMPATIBILITY_HIGH_THRESHOLD ? 'Stable inheritance likely.' : 'Chaotic inheritance remains possible.'}`;
    }
  }
  if (pairNote) {
    pairNote.textContent = clonePair.palA && clonePair.palB ? pairSummaryText : '';
  }
  if (pairSummaryNode) {
    pairSummaryNode.textContent = pairSummaryText;
  }

  if (cycle) {
    chamberButton.disabled = true;
    countdown.textContent = formatCountdown(cycle.endsAt - Date.now());
  } else {
    chamberButton.disabled = ownedPalOptions.length === 0;
    countdown.textContent = state.clone.revealedVariant ? '00:00' : formatCountdown(getCloneDurationMs(pal, state));
  }

  const revealPanel = ensureLabRevealShell(root.querySelector('[data-clone-reveal]'));
  const variant = state.clone.revealedVariant;
  const isRevealAnimating = Boolean(cloneRevealRuntime.inProgress && variant && cloneRevealRuntime.activeVariantId === variant.id);
  if (isRevealAnimating) {
    root.querySelector('[data-lab-status]').textContent = 'SEQUENCE FORMING';
  }

  const cloneDossier = getCloneDossierAssetData(state, pal, variant);
  if (cloneArtFrame && cloneArtImage && cloneArtPlaceholder) {
    cloneArtImage.alt = `${pal.name} clone dossier`;
    cloneArtPlaceholder.textContent = cloneDossier.note;
    bindStaticAssetImage(cloneArtImage, cloneArtFrame, cloneArtPlaceholder, cloneDossier.assetPath, cloneDossier.fallbackPaths);
  }
  if (cloneArtCopy) {
    cloneArtCopy.textContent = cloneDossier.copy;
  }
  if (mediaNote) {
    mediaNote.textContent = cloneDossier.note;
  }

  const adventureAsset = getLabAdventureAssetData(pal, basePal);
  if (adventureFrame && adventureImage && adventurePlaceholder) {
    adventureImage.alt = `${pal.name} campaign playback`;
    adventurePlaceholder.textContent = pal.planet ? String(pal.planet).slice(0, 5).toUpperCase() : 'ORBIT';
    bindStaticAssetImage(adventureImage, adventureFrame, adventurePlaceholder, adventureAsset.assetPath, adventureAsset.fallbackPaths);
  }
  if (adventureCopy) {
    adventureCopy.textContent = adventureAsset.copy;
  }
  if (adventureTag) {
    adventureTag.textContent = adventureAsset.tag;
  }

  revealPanel.hidden = !variant;
  if (isRevealAnimating) {
    revealPanel.classList.add('is-reveal-animating');
  } else if (variant) {
    revealPanel.classList.remove('is-reveal-animating');
    root.querySelector('[data-reveal-label]').textContent = variant.label;
    root.querySelector('[data-reveal-source]').textContent = `${(variant.sourcePalName || '').toUpperCase()} // ${(variant.tier || '').toUpperCase()}`;
    const archiveButton = root.querySelector('[data-archive-clone]');
    const orathName = formatOrathName(parseToOrath(variant.sequenceString || ''));
    const mutationInfo = getCloneMutationDisplay(variant);
    let finalCard = revealPanel.querySelector('[data-clone-final-card]');

    if (!finalCard) {
      finalCard = document.createElement('div');
      finalCard.className = 'clone-card-final';
      finalCard.dataset.cloneFinalCard = 'true';
      archiveButton.insertAdjacentElement('beforebegin', finalCard);
    }
    finalCard.innerHTML = `
      <p class="task-meta clone-card-sequence">Sequence <strong>${escapeHtml(variant.sequenceString || 'Ø')}<sup>${variant.generation || 1}</sup></strong></p>
      <p class="orath-name-display is-final">${escapeHtml(orathName || 'Echo')}</p>
      <p class="task-meta clone-card-summary">${escapeHtml(getCloneChangedTraitSummary(variant))}</p>
      ${mutationInfo ? `<div class="mutation-callout is-final"><p class="mutation-name">${escapeHtml(mutationInfo.name)}</p><p class="mutation-description">${escapeHtml(mutationInfo.description)}</p></div>` : '<p class="clone-stability-note is-final">STABLE ECHO</p>'}
    `;

    let noteEl = root.querySelector('[data-reveal-note]');
    if (!noteEl) {
      noteEl = document.createElement('p');
      noteEl.className = 'task-meta';
      noteEl.dataset.revealNote = '';
      root.querySelector('[data-reveal-label]').after(noteEl);
    }
    noteEl.textContent = variant.note;
    noteEl.hidden = false;
    archiveButton.hidden = false;

    const existingReadout = revealPanel.querySelector('.deeinaye-readout');
    if (existingReadout) {
      existingReadout.remove();
    }

    if (variant.sequenceString) {
      const dominantPal = getPalById(variant.dominantPalId);
      const basePalEntry = getPalById(variant.basePalId);
      const changed = variant.changedTraitKeys || [];
      const traitRows = CLONE_TRAIT_KEYS.map((key) => {
        const value = variant.traits ? (variant.traits[key] || '—') : '—';
        const isNew = changed.includes(key);
        const source = isNew ? (basePalEntry ? basePalEntry.name : '?') : (dominantPal ? dominantPal.name : '?');
        return `<li class="deeinaye-trait-row${isNew ? ' is-new' : ''}">
        <span class="label">${key}</span>
        <span class="deeinaye-value">${escapeHtml(value)}</span>
        <span class="deeinaye-source">[${escapeHtml(source)}${isNew ? ' ★' : ''}]</span>
      </li>`;
      }).join('');

      const readout = document.createElement('div');
      readout.className = 'deeinaye-readout';
      readout.innerHTML = `
      <p class="eyebrow">DEEINAYE TRAITS</p>
      <p class="task-meta">
        Sequence: <strong>${escapeHtml(variant.sequenceString)}<sup>${variant.traitsChanged || 0}</sup></strong>
        &nbsp;·&nbsp; Gen ${variant.generation || 1}
      </p>
      <ul class="deeinaye-trait-list">${traitRows}</ul>
    `;
      archiveButton.insertAdjacentElement('beforebegin', readout);
    }

    let nameInput = revealPanel.querySelector('[data-clone-name-input]');
    if (!nameInput) {
      const nameBlock = document.createElement('div');
      nameBlock.className = 'clone-name-block';
      nameBlock.innerHTML = `
        <label class="label" for="clone-name-field">Name This Clone</label>
        <div class="clone-name-row">
          <input id="clone-name-field" class="task-input" type="text"
            maxlength="32" placeholder="Optional. Leave blank for sequence ID."
            data-clone-name-input>
          <button type="button" class="ghost-link" data-save-clone-name>Save</button>
        </div>
      `;
      archiveButton.insertAdjacentElement('beforebegin', nameBlock);
      nameInput = nameBlock.querySelector('[data-clone-name-input]');
    }
    nameInput.value = variant.cloneName || '';

    let activateBtn = revealPanel.querySelector('[data-activate-clone]');
    if (!activateBtn) {
      activateBtn = document.createElement('button');
      activateBtn.type = 'button';
      activateBtn.className = 'ghost-link clone-activate-btn';
      activateBtn.dataset.activateClone = '';
      root.querySelector('[data-archive-clone]').insertAdjacentElement('afterend', activateBtn);
    }
    const isAlreadyActive = state.activeCloneId === variant.id;
    activateBtn.textContent = isAlreadyActive ? 'Active Clone' : 'Activate This Clone';
    activateBtn.disabled = isAlreadyActive;
  } else {
    revealPanel.classList.remove('is-reveal-animating', 'clone-card-final');
    const finalCard = revealPanel.querySelector('[data-clone-final-card]');
    const existingReadout = revealPanel.querySelector('.deeinaye-readout');
    const nameBlock = revealPanel.querySelector('.clone-name-block');
    const activateBtn = revealPanel.querySelector('[data-activate-clone]');
    if (finalCard) finalCard.remove();
    if (existingReadout) existingReadout.remove();
    if (nameBlock) nameBlock.remove();
    if (activateBtn) activateBtn.remove();
  }

  const history = root.querySelector('[data-clone-history]');
  history.innerHTML = state.clone.history.length
    ? state.clone.history.map((entry) => `
      <li class="clone-history-item">
        <p class="label">GEN ${entry.generation || 1} — ${escapeHtml(entry.sourcePalName || entry.basePalId || '?')}</p>
        <p class="clone-history-title">${escapeHtml(entry.label || entry.variantLabel || '—')}</p>
        ${entry.sequenceString
        ? `<p class="task-meta sequence-string">${escapeHtml(entry.sequenceString)}<sup>${entry.traitsChanged || 0}</sup></p>`
        : ''}
        <p class="task-meta">${new Date(entry.createdAt).toLocaleString()}</p>
      </li>
    `).join('')
    : '<li class="clone-history-item"><p class="clone-history-title">No clones recorded yet. The chamber remains accusatory but empty.</p></li>';
}

function startCloneCycle() {
  primeCloneAudioContext();
  stopCloneRevealSequence();
  const state = syncCloneCycle();
  const root = document.querySelector('[data-lab-root]');
  const sourceSelector = root && root.querySelector('[data-clone-pal-a]');
  const baseSelector = root && root.querySelector('[data-clone-pal-b]');
  const clonePair = normalizeClonePair({
    palA: sourceSelector && sourceSelector.value ? sourceSelector.value : state.clone.clonePair.palA,
    palB: baseSelector && baseSelector.value ? baseSelector.value : state.clone.clonePair.palB,
  }, state);
  const pal = getPalById(clonePair.palA || state.activePal);

  if (!pal || state.clone.activeCycle) {
    return;
  }

  if (clonePair.palA === clonePair.palB) {
    setAppState((s) => ({
      ...s,
      clone: {
        ...s.clone,
        dialogue: 'A clone pair requires two distinct pals. Self-reference is not enough.',
      },
    }));
    return;
  }

  const trustA = (state.palMoodLedger[clonePair.palA] || {}).trust || 0;
  const trustB = (state.palMoodLedger[clonePair.palB] || {}).trust || 0;
  if (trustA < TRUST_CLONE_MINIMUM || trustB < TRUST_CLONE_MINIMUM) {
    const lowTrustPal = trustA < TRUST_CLONE_MINIMUM
      ? getPalById(clonePair.palA)
      : getPalById(clonePair.palB);
    setAppState((s) => ({
      ...s,
      clone: {
        ...s.clone,
        dialogue: `${lowTrustPal ? lowTrustPal.name : 'A pal'} does not trust this process yet. Trust score too low to clone.`,
      },
    }));
    return;
  }

  const compatScore = getCompatibilityScore(state, clonePair.palA, clonePair.palB);
  if (compatScore < COMPATIBILITY_MINIMUM_TO_CLONE) {
    const daysNeeded = COMPATIBILITY_MINIMUM_TO_CLONE - compatScore;
    setAppState((s) => ({
      ...s,
      clone: {
        ...s.clone,
        dialogue: `These two pals have not coexisted long enough. ${daysNeeded} more day${daysNeeded !== 1 ? 's' : ''} of shared roster needed.`,
      },
    }));
    return;
  }

  const now = Date.now();
  setAppState({
    ...state,
    clone: {
      ...state.clone,
      clonePair,
      activeCycle: {
        sourcePalId: clonePair.palA || pal.id,
        basePalId: clonePair.palB || clonePair.palA || pal.id,
        compatScore,
        startedAt: now,
        endsAt: now + getCloneDurationMs(pal, state),
      },
      revealedVariant: null,
      dialogue: getLabDialogue(pal.id, 'started'),
    },
  });
}

function archiveCloneReveal() {
  stopCloneRevealSequence();
  const state = getState();
  if (!state.clone.revealedVariant) {
    return;
  }

  const pal = getPalById(state.activePal);
  setAppState({
    ...state,
    clone: {
      ...state.clone,
      revealedVariant: null,
      dialogue: getLabDialogue((pal && pal.id) || 'xio', 'idle'),
    },
  });
}

function bindLabEvents(root) {
  if (root.dataset.bound === 'true') {
    return;
  }

  root.addEventListener('click', (event) => {
    primeCloneAudioContext();

    if (event.target.closest('[data-start-clone]')) {
      startCloneCycle();
      renderLab(root);
      return;
    }

    if (event.target.closest('[data-archive-clone]')) {
      archiveCloneReveal();
      renderLab(root);
      return;
    }

    if (event.target.closest('[data-activate-clone]')) {
      const currentState = getState();
      const variant = currentState.clone.revealedVariant;
      if (variant) {
        setAppState((s) => ({
          ...s,
          activeCloneId: variant.id,
          gloom: (s.constellations && s.constellations.doolin)
            ? s.gloom + 3
            : s.gloom,
        }));
        renderLab(root);
      }
      return;
    }

    if (event.target.closest('[data-save-clone-name]')) {
      const input = root.querySelector('[data-clone-name-input]');
      const name = input ? input.value.trim() : '';
      const currentState = getState();
      const variant = currentState.clone.revealedVariant;
      if (variant) {
        const updatedVariant = { ...variant, cloneName: name || null };
        setAppState((s) => ({
          ...s,
          clone: {
            ...s.clone,
            revealedVariant: updatedVariant,
            history: (s.clone.history || []).map((h) =>
              h.id === variant.id ? { ...h, cloneName: name || null } : h
            ),
          },
        }));
      }
      renderLab(root);
      return;
    }
  });

  root.addEventListener('change', (event) => {
    if (!event.target.matches('[data-clone-pal-a], [data-clone-pal-b]')) {
      return;
    }

    const currentState = getState();
    const sourceSelector = root.querySelector('[data-clone-pal-a]');
    const baseSelector = root.querySelector('[data-clone-pal-b]');
    const clonePair = normalizeClonePair({
      palA: sourceSelector && sourceSelector.value ? sourceSelector.value : null,
      palB: baseSelector && baseSelector.value ? baseSelector.value : null,
    }, currentState);

    setAppState((s) => ({
      ...s,
      clone: {
        ...s.clone,
        clonePair,
      },
    }));
    renderLab(root);
  });

  const image = root.querySelector('[data-pal-image]');
  const placeholder = root.querySelector('[data-pal-placeholder]');
  const frame = root.querySelector('[data-pal-frame]');

  if (image && frame && placeholder) {
    image.addEventListener('load', () => updateImageState(frame, image, placeholder));
    image.addEventListener('error', () => updateImageState(frame, image, placeholder));
  }

  root.dataset.bound = 'true';
}

function renderCalendarEmptyState(root) {
  root.innerHTML = `
    <section class="panel empty-state-panel">
      <p class="eyebrow">CALENDAR // UNASSIGNED</p>
      <h1 class="screen-title">No Pal is available to judge your plans.</h1>
      <p class="empty-copy">Choose a Pal first so the calendar can flavor events, reminders, and schedule drift correctly.</p>
      <div class="empty-actions">
        <a class="action-button" href="choose-pal.html">Choose a Pal</a>
        <a class="ghost-link" href="tasks.html">Return to Tasks</a>
      </div>
    </section>
  `;
}

function setCalendarTimeFieldState(form, allDay) {
  form.querySelectorAll('[data-calendar-time-input]').forEach((input) => {
    input.disabled = allDay;
  });
}

function getAvailableEventLibrary() {
  // Stable order so subsection headers are predictable. Daily seed only nudges
  // within-group order so users see fresh items at the top of each section.
  var todaySeed = getLocalDateKey().replace(/-/g, '');
  var numSeed = parseInt(todaySeed, 10) || 0;

  var sorted = EVENT_LIBRARY.slice().sort(function(a, b) {
    var hashA = 0;
    var hashB = 0;
    for (var i = 0; i < a.id.length; i += 1) hashA += a.id.charCodeAt(i) * (numSeed + i);
    for (var j = 0; j < b.id.length; j += 1) hashB += b.id.charCodeAt(j) * (numSeed + j);
    return (hashA % 1000) - (hashB % 1000);
  });

  return {
    events: sorted,
    groups: [
      'all', 'appointment', 'maintenance', 'social',
      'focus', 'celebration', 'recovery',
    ],
  };
}

var EVENT_LIBRARY_GROUP_META = {
  all:         { icon: '*', label: 'ALL',         color: '#85f7b8', blurb: 'Every event in the library.' },
  appointment: { icon: '+', label: 'APPOINTMENT', color: '#ff9d3d', blurb: 'Doctors, dentists, the chair.' },
  maintenance: { icon: '%', label: 'MAINTENANCE', color: '#a3e36b', blurb: 'Bills, renewals, upkeep.' },
  social:      { icon: '@', label: 'SOCIAL',      color: '#ffb86b', blurb: 'Friends, family, hangs.' },
  focus:       { icon: '#', label: 'FOCUS',       color: '#9bd9ff', blurb: 'Deep work, deadlines, meetings.' },
  celebration: { icon: '*', label: 'CELEBRATION', color: '#ffd166', blurb: 'Wins, milestones, joy.' },
  recovery:    { icon: '~', label: 'RECOVERY',    color: '#85f7b8', blurb: 'Rest, slowdown, restore.' },
};

function getEventLibraryGroupMeta(key) {
  var meta = EVENT_LIBRARY_GROUP_META[key];
  if (meta) return meta;
  return { icon: '*', label: (key || 'ITEM').toUpperCase(), color: '#85f7b8' };
}

function renderEventLibrary(root) {
  var panel = root.querySelector('[data-event-library-panel]');
  var tabsContainer = root.querySelector('[data-event-library-tabs]');
  var listContainer = root.querySelector('[data-event-library-list]');
  if (!panel || !tabsContainer || !listContainer) return;

  var lib = getAvailableEventLibrary();
  var activeFilter = panel.dataset.activeFilter || 'all';
  var search = (panel.dataset.search || '').trim().toLowerCase();

  var tabsHtml = '';
  lib.groups.forEach(function(groupId) {
    var meta = getEventLibraryGroupMeta(groupId);
    var cls = groupId === activeFilter ? 'tab-btn active' : 'tab-btn';
    tabsHtml += '<button type="button" class="' + cls + '" data-event-library-filter="' + groupId
      + '" style="--tab-accent:' + meta.color + ';">'
      + '<span class="tab-btn-icon" aria-hidden="true">' + meta.icon + '</span>'
      + '<span class="tab-btn-label">' + meta.label + '</span>'
      + '</button>';
  });
  tabsContainer.innerHTML = tabsHtml;

  var filtered = activeFilter === 'all'
    ? lib.events
    : lib.events.filter(function(entry) { return entry.category === activeFilter; });

  if (search) {
    filtered = filtered.filter(function(entry) {
      return entry.title.toLowerCase().indexOf(search) !== -1;
    });
  }

  // Bucket by group so we can render subsection headers (much easier to scan).
  var buckets = {};
  var orderedGroups = [];
  filtered.forEach(function(entry) {
    if (!buckets[entry.category]) {
      buckets[entry.category] = [];
      orderedGroups.push(entry.category);
    }
    buckets[entry.category].push(entry);
  });
  // Keep section order matching the tab order so muscle memory works.
  orderedGroups.sort(function(a, b) {
    return lib.groups.indexOf(a) - lib.groups.indexOf(b);
  });

  function renderCardHtml(entry) {
    var load = entry.intensity + entry.socialWeight + entry.energyCost + entry.dreadLevel;
    var gloom = 5 + Math.floor(load / 2);
    var meta = getEventLibraryGroupMeta(entry.category);
    var recBadge = entry.recurrence === 'none'
      ? ''
      : '<span class="library-card-rec">' + entry.recurrence.toUpperCase() + '</span>';
    return '<button type="button" class="library-card event-library-item"'
      + ' data-add-library-event="' + entry.id + '"'
      + ' data-category="' + entry.category + '"'
      + ' style="--card-accent:' + meta.color + ';">'
      + '<span class="library-card-stripe" aria-hidden="true"></span>'
      + '<span class="library-card-head">'
      +   '<span class="library-card-icon" aria-hidden="true">' + meta.icon + '</span>'
      +   '<span class="library-card-cat">' + meta.label + '</span>'
      +   recBadge
      +   '<span class="library-card-gloom">+' + gloom + '</span>'
      + '</span>'
      + '<span class="library-card-title">' + escapeHtml(entry.title) + '</span>'
      + '<span class="library-card-stats">'
      +   '<span class="lib-stat" title="Intensity"><span class="lib-stat-key">INT</span>' + buildLibraryStatBar(entry.intensity, 5) + '</span>'
      +   '<span class="lib-stat" title="Social"><span class="lib-stat-key">SOC</span>' + buildLibraryStatBar(entry.socialWeight, 5) + '</span>'
      +   '<span class="lib-stat" title="Energy"><span class="lib-stat-key">NRG</span>' + buildLibraryStatBar(entry.energyCost, 5) + '</span>'
      +   '<span class="lib-stat" title="Dread"><span class="lib-stat-key">DRD</span>' + buildLibraryStatBar(entry.dreadLevel, 5) + '</span>'
      + '</span>'
      + '<span class="library-card-add" aria-hidden="true">+ ADD</span>'
      + '</button>';
  }

  var listHtml = '';
  // When the user is filtering to a single group, skip the section header (the
  // tab itself is the header). When showing 'all' or a multi-group search,
  // bucket the results so they can be scanned.
  var showSectionHeaders = (activeFilter === 'all') || orderedGroups.length > 1;

  orderedGroups.forEach(function(groupId) {
    var meta = getEventLibraryGroupMeta(groupId);
    var rows = buckets[groupId];
    if (showSectionHeaders) {
      listHtml += '<div class="library-section-header" style="--section-accent:' + meta.color + ';">'
        + '<span class="library-section-icon" aria-hidden="true">' + meta.icon + '</span>'
        + '<span class="library-section-title">' + meta.label + '</span>'
        + '<span class="library-section-count">' + rows.length + '</span>'
        + (meta.blurb ? '<span class="library-section-blurb">' + meta.blurb + '</span>' : '')
        + '</div>';
    }
    listHtml += '<div class="library-section-grid">';
    rows.forEach(function(entry) { listHtml += renderCardHtml(entry); });
    listHtml += '</div>';
  });

  if (filtered.length === 0) {
    listHtml = '<p class="empty-state-text library-empty">'
      + (search ? 'No matches for "' + escapeHtml(search) + '".' : 'No events in this category yet.')
      + '</p>';
  }
  listContainer.innerHTML = listHtml;
}

function renderCalendar(root) {
  const state = getState();
  const pal = getPalById(state.activePal);

  if (!pal) {
    renderCalendarEmptyState(root);
    return;
  }

  const selectedDate = state.calendar.selectedDate || getLocalDateKey();
  const visibleMonth = state.calendar.visibleMonth || selectedDate.slice(0, 7);
  const selectedOccurrences = getCalendarOccurrencesForDate(state.calendar.events, selectedDate);
  const monthGrid = buildCalendarMonthGrid(visibleMonth, state.calendar.events, selectedDate, {
    habitHistory: state.habitHistory || {},
    completionLog: (state.calendar && state.calendar.completionLog) || [],
  });
  const monthEventCount = monthGrid
    .filter((entry) => entry.isCurrentMonth)
    .reduce((sum, entry) => sum + entry.eventCount, 0);
  const selectedLoad = selectedOccurrences.reduce((sum, event) => sum + getCalendarEventLoad(event), 0);
  const conflictState = hasCalendarConflict(selectedOccurrences);
  const seasonalEvent = resolveSeasonalEvent(getDateFromKey(selectedDate));
  const seasonalLines = getSeasonalEventLines(seasonalEvent, pal.id);
  const draftEvent = getCalendarEventById(state.calendar.events, state.calendar.draftEventId);
  const calendarTemplate = getCalendarPalTemplate(pal.id);
  const taskSummary = getTaskSummary(getTaskConsoleEntries(state));
  const habitsLogged = getHabitCompletionCount(state.habitHistory, 7);
  const relatedMood = getMoodDisplayState(getPalEmotionalSnapshot(state, pal.id).mood);

  root.querySelector('[data-calendar-date]').textContent = formatDateLabel();
  const calendarNameEl = root.querySelector('[data-calendar-name]');
  if (calendarNameEl) calendarNameEl.textContent = pal.name;
  const activeClone = getActiveClone(state);
  const cloneSubtitleEl = root.querySelector('[data-pal-clone-subtitle]');
  if (cloneSubtitleEl) {
    if (activeClone && activeClone.sequenceString) {
      cloneSubtitleEl.textContent = getCloneSubtitleText(activeClone, state);
      cloneSubtitleEl.hidden = false;
    } else {
      cloneSubtitleEl.hidden = true;
    }
  }
  const calendarIdEl = root.querySelector('[data-calendar-id]');
  if (calendarIdEl) calendarIdEl.textContent = pal.id.toUpperCase();
  const calendarSelectedDateEl = root.querySelector('[data-calendar-selected-date]');
  if (calendarSelectedDateEl) calendarSelectedDateEl.textContent = getDateFromKey(selectedDate).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const calendarDialogueEl = root.querySelector('[data-calendar-dialogue]');
  if (calendarDialogueEl) {
    calendarDialogueEl.textContent = getCalendarSelectedCommentary(state, pal, selectedDate, selectedOccurrences);
  }
  const calendarDialogueMetaEl = root.querySelector('[data-calendar-dialogue-meta]');
  if (calendarDialogueMetaEl) {
    calendarDialogueMetaEl.textContent = seasonalEvent
      ? seasonalLines.banner_line
      : calendarTemplate
        ? `${selectedOccurrences.length} event${selectedOccurrences.length === 1 ? '' : 's'} logged for this day. ${calendarTemplate.summary}`
        : `${selectedOccurrences.length} event${selectedOccurrences.length === 1 ? '' : 's'} logged for this day.`;
  }
  root.querySelector('[data-calendar-month-label]').textContent = formatCalendarMonthLabel(visibleMonth);
  root.querySelector('[data-calendar-month-count]').textContent = String(monthEventCount).padStart(2, '0');
  root.querySelector('[data-calendar-day-count]').textContent = String(selectedOccurrences.length).padStart(2, '0');
  root.querySelector('[data-calendar-load]').textContent = getCalendarLoadLabel(selectedLoad);
  const calendarGlancePanel = root.querySelector('.calendar-glance-panel');
  if (calendarGlancePanel) {
    calendarGlancePanel.dataset.load = getCalendarLoadLabel(selectedLoad).toLowerCase();
  }
  root.querySelector('[data-calendar-theme]').textContent = (seasonalEvent ? seasonalEvent.theme_token : 'default').toUpperCase();
  root.querySelector('[data-calendar-related-tasks]').textContent = String(taskSummary.remaining).padStart(2, '0');
  root.querySelector('[data-calendar-related-habits]').textContent = `${habitsLogged}/7`;
  root.querySelector('[data-calendar-related-streak]').textContent = String(state.streak).padStart(2, '0');
  root.querySelector('[data-calendar-related-note]').textContent = state.calendar.lastInteraction && state.calendar.lastInteraction.message
    ? `${state.calendar.lastInteraction.message} Current care weather: ${relatedMood}.`
    : `${pal.name}'s calendar activity feeds Tasks, Habits, Streak, and emotional state from here.`;
  root.querySelector('[data-calendar-day-title]').textContent = getDateFromKey(selectedDate).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  root.querySelector('[data-calendar-day-note]').textContent = conflictState
    ? 'Conflict detected. Two timed events overlap on this day.'
    : seasonalEvent
      ? seasonalLines.reaction_line
      : 'Select a day, inspect the emotional load, and file new trouble below.';

  const image = root.querySelector('[data-pal-image]');
  const placeholder = root.querySelector('[data-pal-placeholder]');
  const frame = root.querySelector('[data-pal-frame]');
  if (image && placeholder && frame) {
    applyPalPlaceholder(placeholder, pal);
    applyPalFrameAccent(frame, pal, state);
    bindResolvedImage(image, frame, placeholder, pal.slug || pal.id, 'portrait');
  }

  const grid = root.querySelector('[data-calendar-grid]');
  grid.innerHTML = monthGrid.map((entry) => `
    <button
      type="button"
      class="calendar-day-cell${entry.isCurrentMonth ? '' : ' is-outside'}${entry.isToday ? ' is-today' : ''}${entry.isSelected ? ' is-selected' : ''}${entry.hasOverdue ? ' is-overdue' : ''}${entry.hasSoon ? ' is-soon' : ''}${entry.hasSeasonalEvent ? ' is-seasonal' : ''}${entry.hasHabit ? ' has-habit' : ''}${entry.completedCount ? ' has-completed' : ''}"
      data-calendar-day="${entry.dateKey}"
      aria-pressed="${entry.isSelected}"
    >
      <span class="calendar-day-number">${entry.dayNumber}</span>
      <span class="calendar-day-meta">${entry.eventCount ? `${entry.eventCount} EVT` : 'OPEN'}</span>
      <span class="calendar-day-load">${entry.eventLoad ? getCalendarLoadLabel(entry.eventLoad) : 'CLEAR'}</span>
      <span class="calendar-day-dots" aria-hidden="true">${entry.hasHabit ? '<span class="calendar-day-dot is-habit" title="Habit logged"></span>' : ''}${entry.completedCount ? '<span class="calendar-day-dot is-done" title="Event completed"></span>' : ''}${entry.hasSeasonalEvent ? '<span class="calendar-day-dot is-seasonal" title="Seasonal event"></span>' : ''}</span>
    </button>
  `).join('');

  const eventList = root.querySelector('[data-calendar-event-list]');
  const completedList = root.querySelector('[data-calendar-completed-list]');
  const completedCollapse = root.querySelector('[data-calendar-completed-collapse]');
  const completedCountEl = root.querySelector('[data-calendar-completed-count]');

  const renderEventCard = (event, isComplete) => {
    const categoryMeta = getCalendarCategoryMeta(event.category);
    const status = isComplete ? 'complete' : getCalendarOccurrenceStatus(event);
    const completeBtn = isComplete
      ? '<span class="calendar-event-done-pill">Done</span>'
      : `<button type="button" class="action-button" data-complete-calendar="${event.id}" data-complete-date="${event.occurrenceDate}">Mark Complete</button>`;
    return `
      <li class="calendar-event-card is-${escapeHtml(event.category)} is-${status}">
        <div class="calendar-event-header">
          <div>
            <p class="label">${escapeHtml(formatCalendarTimeLabel(event))}</p>
            <h3 class="calendar-event-title">${escapeHtml(event.title)}</h3>
          </div>
          <span class="calendar-category-pill is-${escapeHtml(event.category)}">${escapeHtml(categoryMeta.label)}</span>
        </div>
        <p class="task-meta">${escapeHtml(CALENDAR_RECURRENCE_LABELS[event.recurrence] || 'One Time')} // DREAD ${event.dreadLevel} // ENERGY ${event.energyCost}${isComplete ? ' // DONE' : ''}</p>
        <p class="section-copy">${escapeHtml(event.notes || 'No notes. The event survives on implication alone.')}</p>
        <div class="calendar-event-actions">
          ${completeBtn}
          <button type="button" class="ghost-link" data-edit-calendar="${event.id}">Edit</button>
          <button type="button" class="ghost-link" data-delete-calendar="${event.id}">Delete</button>
        </div>
      </li>
    `;
  };

  const activeOccurrences = [];
  const completedOccurrences = [];
  selectedOccurrences.forEach((event) => {
    if (isCalendarOccurrenceComplete(state, event.id, event.occurrenceDate)) {
      completedOccurrences.push(event);
    } else {
      activeOccurrences.push(event);
    }
  });

  eventList.innerHTML = activeOccurrences.length
    ? activeOccurrences.map((event) => renderEventCard(event, false)).join('')
    : (selectedOccurrences.length
        ? '<li class="calendar-event-card is-empty"><p class="calendar-event-title">All events handled for this day.</p><p class="task-meta">Open the list below to revisit them.</p></li>'
        : '<li class="calendar-event-card is-empty"><p class="calendar-event-title">No events filed for this day.</p><p class="task-meta">The grid is open and the Pal has noticed.</p></li>');

  if (completedCollapse && completedList && completedCountEl) {
    if (completedOccurrences.length) {
      completedCollapse.hidden = false;
      completedList.innerHTML = completedOccurrences.map((event) => renderEventCard(event, true)).join('');
      completedCountEl.textContent = String(completedOccurrences.length);
    } else {
      completedCollapse.hidden = true;
      completedCollapse.removeAttribute('open');
      completedList.innerHTML = '';
      completedCountEl.textContent = '0';
    }
  }

  const form = root.querySelector('[data-calendar-form]');
  const formNote = root.querySelector('[data-calendar-form-note]');
  root.querySelector('[data-calendar-form-heading]').textContent = draftEvent ? 'Rewire Existing Event' : 'Add Event To Orbit';
  form.querySelector('[name="eventId"]').value = draftEvent ? draftEvent.id : '';
  form.querySelector('[name="title"]').value = draftEvent ? draftEvent.title : '';
  form.querySelector('[name="date"]').value = draftEvent ? draftEvent.date : selectedDate;
  form.querySelector('[name="startTime"]').value = draftEvent ? draftEvent.startTime : '';
  form.querySelector('[name="endTime"]').value = draftEvent ? draftEvent.endTime : '';
  form.querySelector('[name="allDay"]').checked = draftEvent ? draftEvent.allDay : false;
  form.querySelector('[name="category"]').value = draftEvent ? draftEvent.category : 'focus';
  form.querySelector('[name="recurrence"]').value = draftEvent ? draftEvent.recurrence : 'none';
  form.querySelector('[name="intensity"]').value = String(draftEvent ? draftEvent.intensity : 2);
  form.querySelector('[name="socialWeight"]').value = String(draftEvent ? draftEvent.socialWeight : 1);
  form.querySelector('[name="energyCost"]').value = String(draftEvent ? draftEvent.energyCost : 2);
  form.querySelector('[name="dreadLevel"]').value = String(draftEvent ? draftEvent.dreadLevel : 2);
  form.querySelector('[name="notes"]').value = draftEvent ? draftEvent.notes : '';
  setCalendarTimeFieldState(form, form.querySelector('[name="allDay"]').checked);
  formNote.textContent = draftEvent
    ? `Editing ${draftEvent.recurrence === 'none' ? 'this event' : 'this recurring series'}. Save to keep the orbit stable.`
    : 'Recurring events repeat until removed. Time conflicts are surfaced in the day panel.';

  const eventLibraryPanel = root.querySelector('[data-event-library-panel]');
  if (eventLibraryPanel && !eventLibraryPanel.hidden) {
    renderEventLibrary(root);
  }
  renderSeasonalEventPanel(root, state, pal);
}

function bindCalendarEvents(root) {
  if (root.dataset.bound === 'true') {
    return;
  }

  root.addEventListener('input', (event) => {
    if (event.target && event.target.matches('[data-event-library-search]')) {
      var panel = root.querySelector('[data-event-library-panel]');
      if (panel) {
        panel.dataset.search = event.target.value || '';
        renderEventLibrary(root);
      }
    }
  });

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-open-event-library]')) {
      var openPanel = root.querySelector('[data-event-library-panel]');
      if (openPanel) {
        openPanel.hidden = false;
        openPanel.dataset.activeFilter = 'all';
        openPanel.dataset.search = '';
        var evtSearchInput = openPanel.querySelector('[data-event-library-search]');
        if (evtSearchInput) evtSearchInput.value = '';
        renderEventLibrary(root);
        // Make sure the panel is visible (it lives inside the form panel and
        // would otherwise open below the fold for users with a tall form).
        try {
          openPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {
          openPanel.scrollIntoView();
        }
      }
      return;
    }

    if (event.target.closest('[data-close-event-library]')) {
      var closePanel = root.querySelector('[data-event-library-panel]');
      if (closePanel) closePanel.hidden = true;
      return;
    }

    var filterTarget = event.target.closest('[data-event-library-filter]');
    if (filterTarget) {
      var filterPanel = root.querySelector('[data-event-library-panel]');
      if (filterPanel) {
        filterPanel.dataset.activeFilter = filterTarget.dataset.eventLibraryFilter;
        renderEventLibrary(root);
      }
      return;
    }

    if (event.target.closest('[data-add-library-event]')) {
      var addButton = event.target.closest('[data-add-library-event]');
      var eventId = addButton.dataset.addLibraryEvent;
      var entry = EVENT_LIBRARY.find(function(eventEntry) { return eventEntry.id === eventId; });
      if (!entry) return;

      // Pre-fill the form with the library entry, but DO NOT commit yet.
      // The user reviews/edits date, time, recurrence, notes, etc. and
      // clicks Save to actually file the event.
      var libState = getState();
      var librarySelectedDate = (libState.calendar && libState.calendar.selectedDate) || getLocalDateKey();
      var calendarForm = root.querySelector('[data-calendar-form]');
      if (calendarForm) {
        // Clear any in-progress edit so this becomes a fresh "new event" draft.
        if (libState.calendar && libState.calendar.draftEventId) {
          setAppState(function(currentState) {
            return {
              ...currentState,
              calendar: { ...currentState.calendar, draftEventId: null },
            };
          });
        }

        var setField = function(name, value) {
          var field = calendarForm.querySelector('[name="' + name + '"]');
          if (field) field.value = value;
        };
        setField('eventId', '');
        setField('title', entry.title);
        setField('date', librarySelectedDate);
        setField('startTime', '');
        setField('endTime', '');
        setField('category', entry.category);
        setField('recurrence', entry.recurrence);
        setField('intensity', String(entry.intensity));
        setField('socialWeight', String(entry.socialWeight));
        setField('energyCost', String(entry.energyCost));
        setField('dreadLevel', String(entry.dreadLevel));
        setField('notes', '');
        var allDayField = calendarForm.querySelector('[name="allDay"]');
        if (allDayField) {
          allDayField.checked = true;
          if (typeof setCalendarTimeFieldState === 'function') {
            setCalendarTimeFieldState(calendarForm, true);
          }
        }
        var heading = root.querySelector('[data-calendar-form-heading]');
        if (heading) heading.textContent = 'Add Event To Orbit';
        var note = root.querySelector('[data-calendar-form-note]');
        if (note) note.textContent = 'Pre-filled from library. Edit anything you need, then save to file it.';
      }

      var hiddenPanel = root.querySelector('[data-event-library-panel]');
      if (hiddenPanel) hiddenPanel.hidden = true;

      // Bring the form into view and focus the title so editing is one step away.
      if (calendarForm) {
        try {
          calendarForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {
          calendarForm.scrollIntoView();
        }
        var titleField = calendarForm.querySelector('[name="title"]');
        if (titleField) {
          try { titleField.focus({ preventScroll: true }); } catch (e) { titleField.focus(); }
          titleField.select && titleField.select();
        }
      }
      return;
    }

    const previousMonth = event.target.closest('[data-calendar-prev]');
    if (previousMonth) {
      setAppState((currentState) => ({
        ...currentState,
        calendar: {
          ...currentState.calendar,
          visibleMonth: shiftMonthKey(currentState.calendar.visibleMonth || getMonthKey(), -1),
          draftEventId: null,
        },
      }));
      renderCalendar(root);
      return;
    }

    const nextMonth = event.target.closest('[data-calendar-next]');
    if (nextMonth) {
      setAppState((currentState) => ({
        ...currentState,
        calendar: {
          ...currentState.calendar,
          visibleMonth: shiftMonthKey(currentState.calendar.visibleMonth || getMonthKey(), 1),
          draftEventId: null,
        },
      }));
      renderCalendar(root);
      return;
    }

    const todayBtn = event.target.closest('[data-calendar-today]');
    if (todayBtn) {
      const todayKey = getLocalDateKey();
      setAppState((currentState) => ({
        ...currentState,
        calendar: {
          ...currentState.calendar,
          selectedDate: todayKey,
          visibleMonth: todayKey.slice(0, 7),
          draftEventId: null,
        },
      }));
      renderCalendar(root);
      return;
    }

    const dayButton = event.target.closest('[data-calendar-day]');
    if (dayButton) {
      const dateKey = dayButton.dataset.calendarDay;
      setAppState((currentState) => ({
        ...currentState,
        calendar: {
          ...currentState.calendar,
          selectedDate: dateKey,
          visibleMonth: dateKey.slice(0, 7),
          draftEventId: null,
        },
      }));
      renderCalendar(root);
      return;
    }

    const editButton = event.target.closest('[data-edit-calendar]');
    if (editButton) {
      const eventId = editButton.dataset.editCalendar;
      const nextState = setAppState((currentState) => {
        const targetEvent = getCalendarEventById(currentState.calendar.events, eventId);
        return {
          ...currentState,
          calendar: {
            ...currentState.calendar,
            draftEventId: eventId,
            selectedDate: targetEvent ? targetEvent.date : currentState.calendar.selectedDate,
            visibleMonth: targetEvent ? targetEvent.date.slice(0, 7) : currentState.calendar.visibleMonth,
          },
        };
      });
      renderCalendar(root);
      const form = root.querySelector('[data-calendar-form]');
      if (nextState && form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    const deleteButton = event.target.closest('[data-delete-calendar]');
    if (deleteButton) {
      const state = getState();
      const pal = getPalById(state.activePal);
      const targetEvent = getCalendarEventById(state.calendar.events, deleteButton.dataset.deleteCalendar);
      if (!targetEvent || !pal) {
        return;
      }

      const message = getCalendarDialogueLine(pal.id, 'deleted', `${targetEvent.id}:${targetEvent.updatedAt}`, true);
      setAppState((currentState) => {
        const deletedState = {
          ...currentState,
          calendar: {
            ...currentState.calendar,
            events: currentState.calendar.events.filter((entry) => entry.id !== targetEvent.id),
            draftEventId: currentState.calendar.draftEventId === targetEvent.id ? null : currentState.calendar.draftEventId,
            selectedDate: targetEvent.date,
            visibleMonth: targetEvent.date.slice(0, 7),
          },
        };
        const impactResult = applyCalendarPalImpact(deletedState, pal, targetEvent, 'deleted', message);
        const rewardSuffix = impactResult.impact.summary ? ` ${impactResult.impact.summary}.` : '';
        const copySuffix = impactResult.impact.rewardCopy ? ` ${impactResult.impact.rewardCopy}` : '';

        return {
          ...impactResult.nextState,
          calendar: {
            ...impactResult.nextState.calendar,
            lastInteraction: {
              type: 'deleted',
              message: `${message}${rewardSuffix}${copySuffix}`.trim(),
              date: targetEvent.date,
              eventId: targetEvent.id,
              timestamp: Date.now(),
            },
          },
        };
      });
      renderCalendar(root);
      return;
    }

    const completeButton = event.target.closest('[data-complete-calendar]');
    if (completeButton) {
      const eventId = completeButton.dataset.completeCalendar;
      const occurrenceDate = completeButton.dataset.completeDate;
      if (!completeCalendarOccurrence(eventId, occurrenceDate)) {
        return;
      }
      renderCalendar(root);
      return;
    }

    const clearButton = event.target.closest('[data-calendar-clear]');
    if (clearButton) {
      setAppState((currentState) => ({
        ...currentState,
        calendar: {
          ...currentState.calendar,
          draftEventId: null,
        },
      }));
      renderCalendar(root);
    }
  });

  root.addEventListener('change', (event) => {
    const form = event.target.closest('[data-calendar-form]');
    if (!form) {
      return;
    }

    if (event.target.name === 'allDay') {
      setCalendarTimeFieldState(form, event.target.checked);
    }
  });

  root.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-calendar-form]');
    if (!form) {
      return;
    }

    event.preventDefault();

    const note = root.querySelector('[data-calendar-form-note]');
    const state = getState();
    const pal = getPalById(state.activePal);
    if (!pal) {
      return;
    }

    const formData = new FormData(form);
    const eventId = String(formData.get('eventId') || '').trim();
    const title = String(formData.get('title') || '').trim();
    const date = String(formData.get('date') || '').trim();
    const allDay = formData.get('allDay') === 'on';
    const startTime = String(formData.get('startTime') || '').trim();
    const endTime = String(formData.get('endTime') || '').trim();

    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      note.textContent = 'Title and date are required. Even dread benefits from labels.';
      return;
    }

    if (!allDay && startTime && endTime && getCalendarTimeMinutes(endTime) <= getCalendarTimeMinutes(startTime)) {
      note.textContent = 'End time must be later than start time. Time still moves in one direction here.';
      return;
    }

    const existingEvent = getCalendarEventById(state.calendar.events, eventId);
    const interactionType = existingEvent
      ? (existingEvent.date !== date ? 'rescheduled' : 'edited')
      : 'created';

    if (!existingEvent) {
      const lowerTitle = title.toLowerCase();
      const duplicateEvent = (state.calendar.events || []).find((entry) =>
        entry && entry.date === date && typeof entry.title === 'string' && entry.title.trim().toLowerCase() === lowerTitle
      );
      if (duplicateEvent) {
        note.textContent = 'An event with that title already exists on that date. Duplicates rejected.';
        return;
      }
    }
    const category = String(formData.get('category') || 'focus');
    const categoryReactionType = getCalendarCategoryMeta(category).reactionType;
    const seasonalEvent = resolveSeasonalEvent(getDateFromKey(date));

    const nextEvent = normalizeCalendarEvent({
      id: existingEvent ? existingEvent.id : createId('calendar'),
      title,
      date,
      startTime,
      endTime,
      allDay,
      category,
      recurrence: String(formData.get('recurrence') || 'none'),
      notes: String(formData.get('notes') || '').trim(),
      intensity: Number(formData.get('intensity') || 0),
      socialWeight: Number(formData.get('socialWeight') || 0),
      energyCost: Number(formData.get('energyCost') || 0),
      dreadLevel: Number(formData.get('dreadLevel') || 0),
      seasonalEventId: seasonalEvent ? seasonalEvent.event_id : null,
      createdAt: existingEvent ? existingEvent.createdAt : Date.now(),
      updatedAt: Date.now(),
    });

    const leadMessage = getCalendarDialogueLine(pal.id, interactionType, `${nextEvent.id}:${date}`, true);
    const categoryMessage = categoryReactionType !== 'created'
      ? ` ${getCalendarDialogueLine(pal.id, categoryReactionType, `${nextEvent.id}:${category}`)}`
      : '';

    setAppState((currentState) => {
      const calendarState = {
        ...currentState,
        calendar: {
          ...currentState.calendar,
          events: existingEvent
            ? currentState.calendar.events.map((entry) => (entry.id === nextEvent.id ? nextEvent : entry))
            : [nextEvent, ...currentState.calendar.events],
          draftEventId: null,
          selectedDate: nextEvent.date,
          visibleMonth: nextEvent.date.slice(0, 7),
        },
      };
      const latestReaction = `${leadMessage}${categoryMessage}`.trim();
      const impactResult = applyCalendarPalImpact(calendarState, pal, nextEvent, interactionType, latestReaction);
      const rewardSuffix = impactResult.impact.summary ? ` ${impactResult.impact.summary}.` : '';
      const copySuffix = impactResult.impact.rewardCopy ? ` ${impactResult.impact.rewardCopy}` : '';

      let nextState = {
        ...impactResult.nextState,
        calendar: {
          ...impactResult.nextState.calendar,
          lastInteraction: {
            type: interactionType,
            message: `${latestReaction}${rewardSuffix}${copySuffix}`.trim(),
            date: nextEvent.date,
            eventId: nextEvent.id,
            timestamp: Date.now(),
          },
        },
      };

      if (currentState.activePal === 'xio' && nextEvent.startTime && nextEvent.date) {
        const eventStart = new Date(`${nextEvent.date}T${nextEvent.startTime}`).getTime();
        const leadTime = eventStart - Date.now();
        if (leadTime < 2 * 60 * 60 * 1000) {
          const entry = nextState.palMoodLedger.xio || {};
          nextState = {
            ...nextState,
            palMoodLedger: {
              ...nextState.palMoodLedger,
              xio: {
                ...entry,
                xioLeadTimeViolations: (entry.xioLeadTimeViolations || 0) + 1,
              },
            },
          };
        } else {
          const cleanEvents = (nextState.calendar.events || []).filter((event) => {
            if (!event.date || !event.startTime || !event.createdAt) return false;
            const start = new Date(`${event.date}T${event.startTime}`).getTime();
            return start - event.createdAt >= 2 * 60 * 60 * 1000;
          });
          if (cleanEvents.length >= 3) {
            nextState = applyRecoveryGesture(nextState, 'xio', 'lead_time_clean');
          }
        }
      }

      return nextState;
    });

    renderCalendar(root);
  });

  root.dataset.bound = 'true';
}

function initCalendarPage() {
  const root = document.querySelector('[data-calendar-root]');
  if (!root) {
    return;
  }

  if (redirectToChoosePalIfNoActivePal()) {
    return;
  }

  syncNeedDecay();
  syncCloneCycle();
  bindCalendarEvents(root);
  renderCalendar(root);
}

function getCollectionStatus(pal, state) {
  if (!pal) {
    return 'archived';
  }

  if (state.activePal === pal.id) {
    return 'active';
  }

  if ((state.unlockedPals || []).includes(pal.id)) {
    return 'unlocked';
  }

  return 'archived';
}

function getCollectionStatusLabel(status) {
  if (status === 'active') {
    return 'Active';
  }

  if (status === 'unlocked') {
    return 'Unlocked';
  }

  return 'Archived';
}

function getCollectionMutationLabel(pal) {
  if (pal.mutationRisk >= 8) {
    return 'Severe Drift';
  }

  if (pal.mutationRisk >= 5) {
    return 'Noticeable Drift';
  }

  return 'Stable Echo';
}

function getCollectionArchiveLine(pal) {
  const planet = pal.planet || 'Unassigned orbit';
  const moon = pal.moon || 'No moon logged';
  const tribe = pal.tribe || 'No tribe recorded';

  return `${planet}. ${moon}. ${tribe}.`;
}

function getCollectionBehaviorLine(pal) {
  const notes = [];

  if (pal.luck >= 9) {
    notes.push('Probability tends to behave around this one.');
  }

  if (pal.pessimism >= 7) {
    notes.push('Expect commentary that arrives pre-disappointed.');
  }

  if (pal.mutationRisk >= 7) {
    notes.push('The lab would like a word and several restraints.');
  }

  if (!notes.length) {
    notes.push('Operationally stable, emotionally unconvinced.');
  }

  return notes.join(' ');
}

function isOwnedPalAvailable(state, palId) {
  if (!state || typeof palId !== 'string') {
    return false;
  }

  const ledgerEntry = state.palMoodLedger && state.palMoodLedger[palId];
  return (state.ownedPals || []).includes(palId) && !(ledgerEntry && ledgerEntry.isDead);
}

function focusPalForCare(palId) {
  const state = getState();
  if (!isOwnedPalAvailable(state, palId)) {
    return false;
  }

  setAppState((currentState) => applyActivePalSelection(currentState, palId));
  return true;
}

function focusPalForLab(palId) {
  const state = getState();
  if (!isOwnedPalAvailable(state, palId)) {
    return false;
  }

  setAppState((currentState) => {
    const nextState = applyActivePalSelection(currentState, palId);
    const preferredBasePalId = nextState.clone && nextState.clone.clonePair
      && nextState.clone.clonePair.palB !== palId
      ? nextState.clone.clonePair.palB
      : null;
    return {
      ...nextState,
      clone: {
        ...nextState.clone,
        clonePair: normalizeClonePair({
          palA: palId,
          palB: preferredBasePalId,
        }, nextState),
      },
    };
  });
  return true;
}

function isPalConnectionLit(state, palId) {
  const pal = getPalById(palId);
  if (!pal || !pal.bestPal) return false;
  const bestPalEntry = (typeof PALS === 'undefined' ? [] : PALS)
    .find((entry) => entry.name === pal.bestPal);
  if (!bestPalEntry) return false;
  const owned = state.ownedPals || [];
  return owned.includes(palId) && owned.includes(bestPalEntry.id);
}

function getCompletedConstellations(state) {
  return (typeof PALS === 'undefined' ? [] : PALS)
    .filter((pal) => !pal.placeholder)
    .filter((pal) => isPalConnectionLit(state, pal.id))
    .filter((pal) => {
      const bestPalEntry = (typeof PALS === 'undefined' ? [] : PALS)
        .find((entry) => entry.name === pal.bestPal);
      return bestPalEntry && isPalConnectionLit(state, bestPalEntry.id);
    })
    .map((pal) => pal.id);
}

function getConstellationTrait(palId) {
  const CONSTELLATION_TRAITS = {
    ahote: 'Scattered Light - clones gain +1 Gloom bonus regardless of traitsChanged',
    brutus: 'Still Depth - clone decay reduction doubles for this clone',
    centrama: 'Prepared Edge - clones start with trust 20 instead of 10',
    doolin: 'Golden Return - activating this clone awards 3 Gloom immediately',
    elbjorg: 'Fortified - clones reduce plague growth rate by 20%',
    veruca: 'Seen Clearly - clone subtitle shows full trait readout on home screen',
    winta: 'Scene Presence - clone earns double compatibility gain per day',
    xio: 'Planned Outcome - clone timer reduced by 25%',
    yun: 'Still Body - clone needs decay at half rate while untouched',
    zenji: 'Favorable Reading - clone has guaranteed uncommon rarity minimum',
  };
  return CONSTELLATION_TRAITS[palId] || null;
}

// Builds a deterministic per-pal asterism: 4-6 satellite stars positioned
// around the central portrait, connected by a thin polyline so each pal
// reads like its own miniature constellation (e.g. Ahote = an asterism,
// Brutus = a different asterism, etc.). Coordinates are in a 0-100 viewBox.
function buildPalAsterism(palId) {
  const id = String(palId || 'x');
  const seed = id.split('').reduce((s, c, i) => s + c.charCodeAt(0) * (i + 1), 0);
  const count = 4 + (seed % 3); // 4, 5, or 6 satellites
  const pts = [];
  for (let i = 0; i < count; i++) {
    const angleDeg = ((seed * 37 + i * (97 + (seed % 23))) % 360);
    const angle = angleDeg * (Math.PI / 180);
    const dist = 56 + ((seed * 13 + i * 29) % 30); // 56-86 from center in viewBox
    pts.push({
      x: Math.max(6, Math.min(94, 50 + Math.cos(angle) * dist * 0.5)),
      y: Math.max(6, Math.min(94, 50 + Math.sin(angle) * dist * 0.5)),
      r: 1.4 + ((seed + i * 11) % 8) * 0.2, // 1.4-2.8
    });
  }
  return pts;
}

// Returns a human-readable description of what the link/star currently means.
// Used for the click-to-explain detail panel below the constellation map.
function describePalConstellationStatus(pal, state) {
  const owned = (state.ownedPals || []).includes(pal.id);
  const isActive = state.activePal === pal.id;
  const isLit = isPalConnectionLit(state, pal.id);
  const isComplete = (getCompletedConstellations(state) || []).includes(pal.id);
  const trait = getConstellationTrait(pal.id);
  const partnerName = pal.bestPal || null;
  const partnerEntry = partnerName
    ? (typeof PALS === 'undefined' ? [] : PALS).find((p) => p.name === partnerName)
    : null;
  const partnerOwned = partnerEntry && (state.ownedPals || []).includes(partnerEntry.id);

  let status;
  let statusClass;
  if (!owned) {
    status = 'DORMANT - pal not yet adopted';
    statusClass = 'is-locked';
  } else if (isComplete) {
    status = `COMPLETE LOOP - mutual bond with ${partnerName}`;
    statusClass = 'is-complete-loop';
  } else if (isLit) {
    status = `LIT - bonded with ${partnerName}`;
    statusClass = 'is-bonded';
  } else if (partnerEntry && !partnerOwned) {
    status = `WAITING - adopt ${partnerName} to light this link`;
    statusClass = 'is-waiting';
  } else {
    status = 'ADOPTED - solo star';
    statusClass = 'is-solo';
  }

  const lines = [];
  if (isActive) lines.push('Currently the active pal in the field.');
  if (partnerName) {
    lines.push(`Best pal: ${partnerName}.`);
  } else {
    lines.push('No best-pal link recorded.');
  }
  if (trait) {
    lines.push(`Effect when loop completes: ${trait}`);
  }
  if (!owned) {
    lines.push('Adopt this pal to bring its star online.');
  }

  return { status, statusClass, lines };
}

// Renders the Pal Constellation as a star-map with pulsing connections.
// Each pal is a star (sized by luck, tinted by pal.color); each pal -> bestPal
// pair draws a line. Lines are dim when one or both pals are unowned, pulse
// phosphor when both are owned (lit), and burn brightest when the loop
// completes (mutual best-pal, both owned).
function renderConstellationMap(container, state) {
  const palList = (typeof PALS === 'undefined' ? [] : PALS).filter((p) => !p.placeholder);
  if (!palList.length) {
    container.innerHTML = '<p class="pal-constellation-empty">No specimens on file.</p>';
    return;
  }

  const owned = new Set(state.ownedPals || []);
  const activeId = state.activePal;
  const completed = new Set(getCompletedConstellations(state));

  // Resolve bestPal name -> id once.
  const nameToId = new Map();
  palList.forEach((p) => { if (p.name) nameToId.set(p.name.toLowerCase(), p.id); });

  // Place pals around a circle. Active pal sits at top (12 o'clock).
  const ordered = [...palList];
  const activeIndex = ordered.findIndex((p) => p.id === activeId);
  if (activeIndex > 0) {
    const [activePal] = ordered.splice(activeIndex, 1);
    ordered.unshift(activePal);
  }

  const positions = new Map();
  const radius = 38;          // % of stage from center
  const cx = 50; const cy = 50;
  const total = ordered.length;
  ordered.forEach((pal, i) => {
    const angle = (-Math.PI / 2) + (i / total) * Math.PI * 2;
    positions.set(pal.id, {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  });

  // Build link list (deduped pal<->bestPal pairs).
  const drawn = new Set();
  const links = [];
  palList.forEach((pal) => {
    if (!pal.bestPal) return;
    const partnerId = nameToId.get(String(pal.bestPal).toLowerCase());
    if (!partnerId) return;
    const key = [pal.id, partnerId].sort().join('::');
    if (drawn.has(key)) return;
    drawn.add(key);
    links.push({ a: pal.id, b: partnerId });
  });

  const litCount = links.filter((l) => owned.has(l.a) && owned.has(l.b)).length;

  // Build SVG markup. We use viewBox 100x100 with preserveAspectRatio=none so
  // lines/stars stay aligned to the percentage layout regardless of aspect.
  const linkMarkup = links.map((link, idx) => {
    const a = positions.get(link.a);
    const b = positions.get(link.b);
    if (!a || !b) return '';
    const bothOwned = owned.has(link.a) && owned.has(link.b);
    const palA = getPalById(link.a);
    const palB = getPalById(link.b);
    const colA = (palA && palA.color) || '#0fff8c';
    const colB = (palB && palB.color) || '#0fff8c';
    const completeLoop = completed.has(link.a) && completed.has(link.b);
    const cls = ['pal-constellation-link'];
    if (bothOwned) cls.push('is-illuminated');
    if (completeLoop) cls.push('is-complete-loop');
    const gradId = `pcg-${link.a}-${link.b}`;
    const grad = `<linearGradient id="${gradId}" x1="${a.x}%" y1="${a.y}%" x2="${b.x}%" y2="${b.y}%" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${escapeHtml(colA)}" />
        <stop offset="100%" stop-color="${escapeHtml(colB)}" />
      </linearGradient>`;
    const stroke = bothOwned ? `url(#${gradId})` : 'currentColor';
    const dash = bothOwned ? '' : 'stroke-dasharray="2.5 3"';
    // Animated traveling pulse for lit links.
    const pulse = bothOwned
      ? `<circle r="0.9" fill="${escapeHtml(colA)}" class="pal-constellation-pulse">
           <animateMotion dur="${2.4 + (idx % 5) * 0.25}s" repeatCount="indefinite"
             path="M ${a.x} ${a.y} L ${b.x} ${b.y}" />
           <animate attributeName="opacity" values="0;1;1;0" dur="${2.4 + (idx % 5) * 0.25}s" repeatCount="indefinite" />
         </circle>`
      : '';
    return `${grad}
      <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="${cls.join(' ')}" stroke="${stroke}" ${dash}></line>
      ${pulse}`;
  }).join('');

  const svg = `<svg class="pal-constellation-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <defs></defs>
    ${linkMarkup}
  </svg>`;

  // Star nodes — sized by luck, tinted by pal.color. Each node carries a
  // mini per-pal asterism (deterministic) so each pal reads as its own
  // tiny constellation, plus a click-to-explain affordance.
  const nodes = ordered.map((pal) => {
    const pos = positions.get(pal.id);
    const isOwned = owned.has(pal.id);
    const isActive = pal.id === activeId;
    const isComplete = completed.has(pal.id);
    const isLit = isPalConnectionLit(state, pal.id);
    const portrait = `../assets/pals/base-pals/${pal.id}.png`;
    const cls = ['pal-constellation-node'];
    if (isActive) cls.push('is-active');
    if (isComplete) cls.push('is-complete-loop');
    else if (isLit) cls.push('is-bonded');
    if (!isOwned) cls.push('is-locked');
    const size = 38 + Math.min(18, Math.max(0, (pal.luck || 5) * 1.6));
    const tint = pal.color || '#0fff8c';
    const status = isComplete ? '★' : isLit ? 'LIT' : (isOwned ? '' : '·');

    // Per-pal asterism: thin polyline + twinkly satellite stars.
    const asterism = buildPalAsterism(pal.id);
    const polyPts = asterism.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const starsMarkup = asterism.map((p, i) => `
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.r.toFixed(2)}"
        class="pal-node-asterism-star" style="animation-delay:${(i * 0.4).toFixed(2)}s"></circle>
    `).join('');
    const asterismSvg = `
      <svg class="pal-node-asterism" viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        <polyline class="pal-node-asterism-line" points="${polyPts}" />
        ${starsMarkup}
      </svg>
    `;

    return `
      <button type="button" class="${cls.join(' ')}" data-pal-id="${escapeHtml(pal.id)}"
         style="left:${pos.x}%; top:${pos.y}%; --node-size:${size}px; --node-tint:${tint};"
         aria-label="${escapeHtml(pal.name)}${isActive ? ' (active)' : ''}${isLit ? ' — connection lit' : ''}">
        ${asterismSvg}
        <span class="pal-constellation-node-glow" aria-hidden="true"></span>
        <img src="${portrait}" alt="" loading="lazy">
        ${status ? `<span class="pal-constellation-node-badge">${status}</span>` : ''}
        <span class="pal-constellation-node-label">${escapeHtml(pal.name)}</span>
      </button>
    `;
  }).join('');

  container.innerHTML = `
    <div class="pal-constellation-stage">
      <div class="pal-constellation-stars" aria-hidden="true"></div>
      ${svg}
      ${nodes}
    </div>
    <div class="pal-constellation-legend">
      <span class="pal-constellation-legend-item"><span class="pal-constellation-legend-swatch is-bond"></span>Lit (${litCount})</span>
      <span class="pal-constellation-legend-item"><span class="pal-constellation-legend-swatch is-neutral"></span>Dormant</span>
      <span class="pal-constellation-legend-item"><span class="pal-constellation-legend-swatch is-estrange"></span>★ Completed loop</span>
    </div>
    <div class="constellation-detail" data-constellation-detail aria-live="polite">
      <p class="constellation-detail-hint">Tap a star to read its effect.</p>
    </div>
  `;

  // Click-to-explain: populate the detail panel with status + effect copy.
  const detail = container.querySelector('[data-constellation-detail]');
  if (detail) {
    container.querySelectorAll('.pal-constellation-node[data-pal-id]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        const id = btn.getAttribute('data-pal-id');
        const pal = getPalById(id);
        if (!pal) return;
        const info = describePalConstellationStatus(pal, state);
        const tint = pal.color || '#0fff8c';
        detail.className = `constellation-detail ${info.statusClass}`;
        detail.style.setProperty('--detail-tint', tint);
        detail.innerHTML = `
          <header class="constellation-detail-header">
            <strong class="constellation-detail-name">${escapeHtml(pal.name)}</strong>
            <span class="constellation-detail-status">${escapeHtml(info.status)}</span>
          </header>
          <ul class="constellation-detail-lines">
            ${info.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}
          </ul>
          <a class="constellation-detail-cta" href="care.html">Visit ${escapeHtml(pal.name)} →</a>
        `;
        container.querySelectorAll('.pal-constellation-node.is-selected').forEach((n) => n.classList.remove('is-selected'));
        btn.classList.add('is-selected');
      });
    });
  }
}

function renderCollection(root) {
  const state = getState();
  const unlockedCount = (state.unlockedPals || []).length;
  const activePal = getPalById(state.activePal);
  const activeClone = getActiveClone(state);
  const highRiskCount = PALS.filter((pal) => pal.mutationRisk >= 7).length;
  const unlockedConstellations = Object.keys(state.constellations || {}).length;
  const wallSort = root.dataset.wallSort || 'date';
  const wallGrid = root.querySelector('[data-wall-grid]');
  const sortedItems = sortInventoryForWall(state.inventory, wallSort);

  root.querySelector('[data-collection-date]').textContent = formatDateLabel();
  root.querySelector('[data-collection-total]').textContent = String(PALS.length).padStart(2, '0');
  root.querySelector('[data-collection-unlocked]').textContent = String(unlockedCount).padStart(2, '0');
  root.querySelector('[data-collection-risk]').textContent = String(highRiskCount).padStart(2, '0');
  root.querySelector('[data-collection-constellations]').textContent = String(unlockedConstellations).padStart(2, '0');
  const collectionActiveLabel = root.querySelector('[data-collection-active-label]');
  if (collectionActiveLabel) {
    collectionActiveLabel.textContent = activePal
      ? `ACTIVE PAL ${activePal.id.toUpperCase()}`
      : 'ACTIVE PAL NONE';
  }
  root.querySelector('[data-collection-copy]').textContent = activePal
    ? `${activePal.name} is the current field specimen. ${activeClone ? `${activeClone.cloneName || activeClone.sequenceString || 'An unnamed clone'} currently supplies the archive bonus.` : 'No active clone bonus is currently wired into the roster.'}`
    : 'No active pal is assigned. The archive remains comprehensive anyway.';
  root.querySelector('[data-wall-count]').textContent = `${state.inventory.length} ITEMS`;

  const constellationList = root.querySelector('[data-constellation-list]');
  const constellationCount = root.querySelector('[data-constellation-count]');
  const litConnections = (typeof PALS === 'undefined' ? [] : PALS)
    .filter((pal) => !pal.placeholder && isPalConnectionLit(state, pal.id));

  if (constellationCount) {
    constellationCount.textContent = `${litConnections.length} LIT`;
  }

  if (constellationList) {
    renderConstellationMap(constellationList, state);
  }

  const list = root.querySelector('[data-collection-list]');
  applyScreenBrandArt(root, activePal && activePal.id);
  list.innerHTML = PALS.map((pal) => {
    const status = getCollectionStatus(pal, state);
    const statusLabel = getCollectionStatusLabel(status);
    const canInspect = isOwnedPalAvailable(state, pal.id);
    const isLit = isPalConnectionLit(state, pal.id);
    const isComplete = Boolean((state.constellations || {})[pal.id]);
    const relationshipEntry = (state.palMoodLedger && state.palMoodLedger[pal.id]) || {};
    const trustValue = relationshipEntry.trust || 0;
    const trustTier = getPalTrustTier(pal.id, state);
    const trustTooltip = escapeHtml(getTrustTooltipCopy(trustTier, trustValue));
    const tribe = pal.tribe ? escapeHtml(pal.tribe) : '';
    const portraitSrc = `../assets/pals/base-pals/${pal.id}.png`;
    const connLabel = isComplete ? 'CONST ★' : isLit ? 'CONN LIT' : 'DORMANT';
    const connClass = isComplete ? 'is-complete' : isLit ? 'is-lit' : 'is-dormant';

    return `
      <article class="care-roster-card collection-pal-card${status === 'active' ? ' is-active' : ''}${canInspect ? '' : ' is-locked'}" data-collection-card="${pal.id}">
        <div class="care-roster-portrait" aria-hidden="true">
          <img src="${portraitSrc}" alt="" loading="lazy">
          <span class="care-roster-portrait-ring"></span>
          ${status === 'active' ? '<span class="care-roster-portrait-tag">ACTIVE</span>' : ''}
        </div>
        <div class="care-roster-body">
          <div class="care-roster-header">
            <div class="care-roster-heading">
              <p class="care-roster-name">${escapeHtml(pal.name)}</p>
              <p class="care-roster-tribe">SPECIMEN ${escapeHtml(pal.id.toUpperCase())}${tribe ? ` // ${tribe}` : ''}</p>
            </div>
            <span class="care-roster-chip is-${status}">${escapeHtml(statusLabel)}</span>
          </div>
          <div class="collection-pal-meta">
            <span class="collection-pal-stat"><span class="collection-pal-stat-label">LCK</span><span class="collection-pal-stat-value">${String(pal.luck).padStart(2, '0')}</span></span>
            <span class="collection-pal-stat"><span class="collection-pal-stat-label">PES</span><span class="collection-pal-stat-value">${String(pal.pessimism).padStart(2, '0')}</span></span>
            <span class="collection-pal-stat"><span class="collection-pal-stat-label">MUT</span><span class="collection-pal-stat-value">${String(pal.mutationRisk).padStart(2, '0')}</span></span>
            <span class="collection-pal-conn ${connClass}">${connLabel}</span>
          </div>
          <div class="care-roster-meta-row">
            <span class="care-roster-trust-chip trust-tier-${trustTier}" data-tip="${trustTooltip}" tabindex="0">
              <span class="care-roster-trust-label">TRUST</span>
              <span class="care-roster-trust-value">${trustValue}</span>
              <span class="care-roster-trust-tier">${trustTier.toUpperCase()}</span>
            </span>
            <div class="collection-pal-actions">
              <button type="button" class="ghost-link care-roster-action" data-collection-care="${pal.id}"${canInspect ? '' : ' disabled'}>${canInspect ? 'INSPECT' : 'LOCKED'}</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');

  const rarityLabels = {
    common: 'COMMON',
    uncommon: 'UNCOMMON',
    rare: 'RARE',
    cursed: 'CURSED',
  };

  const rarityColors = {
    common: 'var(--text-dim)',
    uncommon: 'var(--gloom)',
    rare: 'var(--luck)',
    cursed: 'var(--plague-lit)',
  };

  wallGrid.innerHTML = sortedItems.length
    ? sortedItems.map((item) => {
        const blueprint = getItemBlueprintById(item.catalogId || item.id);
        const provenance = item.provenance
          || (blueprint && blueprint.provenance)
          || '';
        const isGhost = item.source === 'ghost';
        const ghostPalName = item.ghostPalName || '';
        const rarityColor = rarityColors[item.rarity] || 'var(--text-dim)';
        const rarityLabel = rarityLabels[item.rarity] || item.rarity.toUpperCase();

        return `
          <li class="wall-item${isGhost ? ' is-ghost-item' : ''}" title="${escapeHtml(item.name)} — ${escapeHtml(item.flavor_text)}${provenance ? ' (' + escapeHtml(provenance) + ')' : ''}">
            <div class="wall-item-thumb${isGhost ? ' is-ghost' : ''}"
                 data-wall-thumb
                 style="--wall-accent:${rarityColor}">
              <img class="wall-item-image"
                   data-wall-image="${escapeHtml(item.image_ref)}"
                   alt="${escapeHtml(item.name)} artifact"
                   hidden>
              <span class="wall-item-fallback">
                ${escapeHtml(item.name.slice(0, 2).toUpperCase())}
              </span>
            </div>
            <div class="wall-item-copy">
              <div class="wall-item-header">
                <p class="wall-item-name">${escapeHtml(item.name)}</p>
                <span class="wall-item-rarity-badge"
                      style="color:${rarityColor}">
                  ${rarityLabel}
                </span>
              </div>
              <p class="dialogue-text wall-item-flavor">
                ${escapeHtml(item.flavor_text)}
              </p>
              ${provenance
                ? `<p class="wall-item-provenance">${escapeHtml(provenance)}</p>`
                : ''}
              <div class="wall-item-meta-row">
                <p class="task-meta">${escapeHtml(item.date_acquired)}</p>
                ${isGhost && ghostPalName
                  ? `<p class="wall-item-ghost-tag">left by ${escapeHtml(ghostPalName)}</p>`
                  : `<p class="task-meta">${escapeHtml(item.source)}</p>`}
              </div>
            </div>
          </li>
        `;
      }).join('')
    : `<li class="wall-item wall-item-empty">
         <div class="wall-item-copy">
           <p class="wall-item-name">Nothing yet.</p>
           <p class="dialogue-text">
             Items appear here after Daily Disappointment rolls,
             streak milestones, seasonal events, and when a Pal dies.
             Keep going.
           </p>
         </div>
       </li>`;

  wallGrid.querySelectorAll('.wall-item-image').forEach((image) => {
    const thumb = image.closest('[data-wall-thumb]');
    if (!thumb) {
      return;
    }

    loadPalImage(image.dataset.wallImage, 'item').then((result) => {
      const showImage = Boolean(result.src);
      thumb.classList.toggle('has-image', showImage);
      image.hidden = !showImage;

      if (showImage) {
        image.src = result.src;
      } else {
        image.removeAttribute('src');
      }
    });
  });

  const cloneArchiveList = root.querySelector('[data-clone-archive-list]');
  const cloneArchiveCount = root.querySelector('[data-clone-archive-count]');
  const cloneSort = root.dataset.cloneSort || 'date';
  const cloneHistory = [...(state.clone.history || [])];
  const sortedClones = cloneSort === 'rarity'
    ? cloneHistory.sort((left, right) => {
      const rarityDiff = (ITEM_RARITY_ORDER[getCloneRarity(right, state)] || 0) - (ITEM_RARITY_ORDER[getCloneRarity(left, state)] || 0);
      if (rarityDiff !== 0) {
        return rarityDiff;
      }

      return (right.createdAt || 0) - (left.createdAt || 0);
    })
    : cloneHistory.sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0));

  if (cloneArchiveCount) {
    cloneArchiveCount.textContent = `${cloneHistory.length} STORED`;
  }

  if (cloneArchiveList) {
    cloneArchiveList.innerHTML = sortedClones.length
      ? sortedClones.map((entry) => {
        const rarity = getCloneRarity(entry, state);
        const tier = entry.tier || 'stable';
        const nameDisplay = entry.cloneName
          ? `${entry.cloneName} · ${entry.sequenceString || ''}${entry.traitsChanged || 0} · Gen ${entry.generation || 1}`
          : `${entry.sequenceString || ''}${entry.traitsChanged || 0} · Gen ${entry.generation || 1}`;
        return `
          <li class="clone-archive-card is-${rarity}${entry.tier ? ` is-${entry.tier}` : ''}">
            <div class="clone-archive-header">
              <div class="clone-archive-tags">
                <p class="label">${escapeHtml(rarity.toUpperCase())}</p>
                <span class="clone-tier-badge is-${escapeHtml(tier)}">${escapeHtml(tier.toUpperCase())}</span>
              </div>
              <p class="task-meta">GEN ${entry.generation || 1}</p>
            </div>
            <p class="clone-history-title">${escapeHtml(nameDisplay)}</p>
            <p class="task-meta">${escapeHtml(entry.label || entry.variantLabel || '—')}</p>
            ${entry.sequenceString
              ? `<p class="task-meta sequence-string">${escapeHtml(entry.sequenceString)}<sup>${entry.traitsChanged || 0}</sup></p>`
              : ''}
            <p class="task-meta">${escapeHtml(entry.sourcePalName || entry.basePalId || '?')}</p>
            <p class="task-meta">${new Date(entry.createdAt).toLocaleString()}</p>
          </li>
        `;
      }).join('')
      : '<li class="clone-archive-card"><p class="task-meta">No clones archived yet. The chamber has not filed anything worth preserving.</p></li>';
  }
}

function bindCollectionEvents(root) {
  if (root.dataset.bound === 'true') {
    return;
  }

  root.addEventListener('click', (event) => {
    const careButton = event.target.closest('[data-collection-care]');
    if (careButton) {
      if (focusPalForCare(careButton.dataset.collectionCare)) {
        navigateWithAudioResume('home.html');
      }
      return;
    }

    const labButton = event.target.closest('[data-collection-lab]');
    if (labButton) {
      if (focusPalForLab(labButton.dataset.collectionLab)) {
        navigateWithAudioResume('lab.html');
      }
      return;
    }

    const sortButton = event.target.closest('[data-wall-sort]');
    if (!sortButton) {
      const cloneSortButton = event.target.closest('[data-clone-sort]');
      if (!cloneSortButton) {
        return;
      }

      root.dataset.cloneSort = cloneSortButton.dataset.cloneSort;
      renderCollection(root);
      return;
    }

    root.dataset.wallSort = sortButton.dataset.wallSort;
    renderCollection(root);
  });

  root.dataset.bound = 'true';
}

function getPredeteminedSecondPal(state) {
  const owned = state.ownedPals || [];
  const candidates = (typeof PALS === 'undefined' ? [] : PALS)
    .filter((pal) => !pal.placeholder && !owned.includes(pal.id))
    .sort((a, b) => getPalMiseryScore(b) - getPalMiseryScore(a));
  return candidates[0] || null;
}

function shouldShowSecondPalAnnouncement(state) {
  const owned = (state.ownedPals || []).length;
  return (
    owned === 1 &&
    state.luckdust >= PAL_ACQUISITION_COST &&
    !state.meta.secondPalUnlockSeen
  );
}

function canAcquireNewPal(state) {
  const owned = (state.ownedPals || []).filter((palId) => {
    const pal = getPalById(palId);
    return pal && !pal.placeholder;
  });

  if (!owned.length) {
    return { allowed: false, reason: 'Use the Adoption Oracle to receive your first pal.' };
  }

  if (owned.length >= 6) {
    return { allowed: false, reason: 'Roster cap reached.' };
  }

  if (state.luckdust < PAL_ACQUISITION_COST) {
    return { allowed: false, reason: `Requires ${PAL_ACQUISITION_COST} Luckdust.` };
  }

  return { allowed: true, reason: null };
}

function acquirePal(palId) {
  const state = getState();
  const check = canAcquireNewPal(state);
  if (!check.allowed) return { success: false, reason: check.reason };

  const predetermined = getPredeteminedSecondPal(state);
  if (!predetermined) return { success: false, reason: 'No pals available to acquire.' };
  if (palId !== predetermined.id) {
    return { success: false, reason: `The next pal is predetermined. ${predetermined.name} has already decided.` };
  }

  setAppState((s) => ({
    ...s,
    luckdust: s.luckdust - PAL_ACQUISITION_COST,
    ownedPals: [...(s.ownedPals || []), predetermined.id],
    unlockedPals: [...new Set([...(s.unlockedPals || []), predetermined.id])],
    meta: {
      ...s.meta,
      secondPalAcquiredDate: getLocalDateKey(),
    },
  }));
  return { success: true, palId: predetermined.id };
}

function renderChoosePal(root) {
  const getOptionalNode = (selector) => {
    try {
      return root.querySelector(selector);
    } catch (error) {
      return null;
    }
  };
  const state = getState();
  const predetermined = getPredeteminedSecondPal(state);
  const owned = state.ownedPals || [];
  const needsFirstAssignment = owned.length === 0;
  const canAfford = state.luckdust >= PAL_ACQUISITION_COST;
  const acquisitionState = typeof canAcquireNewPal === 'function'
    ? canAcquireNewPal(state)
    : {
      allowed: !needsFirstAssignment && canAfford,
      reason: needsFirstAssignment
        ? 'Use the Adoption Oracle to receive your first pal.'
        : canAfford
          ? null
          : `Requires ${PAL_ACQUISITION_COST} Luckdust.`,
    };
  const grid = root.querySelector('[data-choose-pal-grid]');
  const currentPal = getPalById(state.activePal);
  const palEntries = typeof PALS !== 'undefined'
    ? PALS
    : (typeof PAL_DATA !== 'undefined' ? Object.values(PAL_DATA) : []);
  const availableCount = palEntries.filter((pal) => !pal.placeholder && !owned.includes(pal.id)).length;
  const statusCopy = needsFirstAssignment
    ? 'Your first pal is assigned by questionnaire. The roster opens after that.'
    : predetermined
      ? (acquisitionState.allowed
        ? `${predetermined.name} is the next incoming pal. Spend ${PAL_ACQUISITION_COST} Luckdust to expand the roster.`
        : acquisitionState.reason || `${predetermined.name} has already decided, but the roster cannot expand yet.`)
      : acquisitionState.reason || 'No further pals are queued.';

  root.querySelector('[data-choose-pal-date]').textContent = formatDateLabel();
  root.querySelector('[data-current-pal-label]').textContent = currentPal
    ? `CURRENT ${currentPal.name.toUpperCase()}`
    : owned.length
      ? 'ROSTER READY'
      : 'NONE SELECTED';
  root.querySelector('[data-choose-pal-copy]').textContent = needsFirstAssignment
    ? 'Your first pal is assigned by the Adoption Oracle. After that, this board becomes the roster switcher.'
    : `You currently own ${owned.length} pal${owned.length === 1 ? '' : 's'}. Unowned pals cost ${PAL_ACQUISITION_COST} Luckdust unless the roster is full.`;
  const luckdustNode = getOptionalNode('[data-choose-pal-luckdust]');
  const ownedNode = getOptionalNode('[data-choose-pal-owned]');
  const availableNode = getOptionalNode('[data-choose-pal-available]');
  const nextNode = getOptionalNode('[data-choose-pal-next]');
  const statusNode = getOptionalNode('[data-choose-pal-status]');
  const adoptionLink = getOptionalNode('[data-adoption-link]');

  if (luckdustNode) {
    luckdustNode.textContent = String(state.luckdust).padStart(2, '0');
  }
  if (ownedNode) {
    ownedNode.textContent = String(owned.length).padStart(2, '0');
  }
  if (availableNode) {
    availableNode.textContent = String(availableCount).padStart(2, '0');
  }
  if (nextNode) {
    nextNode.textContent = predetermined ? predetermined.name.toUpperCase() : 'NONE';
  }
  if (statusNode) {
    statusNode.textContent = statusCopy;
  }
  if (adoptionLink) {
    adoptionLink.hidden = !needsFirstAssignment;
  }

  grid.innerHTML = palEntries.map((pal) => {
    const isCurrent = state.activePal === pal.id;
    const isOwned = owned.includes(pal.id);
    const isActive = state.activePal === pal.id;
    const isPredetermined = predetermined && pal.id === predetermined.id;
    const isPlaceholder = Boolean(pal.placeholder);
    const diagnosis = pal.diagnosis || 'TBD';
    const catchphrase = pal.catchphrase || 'TBD';
    let btnLabel = 'Choose Pal';
    let btnDisabled = false;
    let btnData = `data-select-pal="${pal.id}"`;

    if (isPlaceholder) {
      btnLabel = 'Coming Soon';
      btnDisabled = true;
    } else if (isActive) {
      btnLabel = 'Keep Current Pal';
    } else if (isOwned) {
      btnLabel = 'Switch To';
    } else if (needsFirstAssignment) {
      btnLabel = 'Questionnaire Required';
      btnDisabled = true;
    } else if (isPredetermined) {
      btnLabel = canAfford
        ? `Accept ${pal.name} (${PAL_ACQUISITION_COST} Luckdust)`
        : `Requires ${PAL_ACQUISITION_COST} Luckdust`;
      btnDisabled = !canAfford;
      btnData = `data-acquire-pal="${pal.id}"`;
    } else {
      btnLabel = 'Not Available Yet';
      btnDisabled = true;
    }

    // TODO(veruca-catchphrase): replace Veruca's duplicate catchphrase once the canon line is written.
    return `
      <article class="panel choose-pal-card${isCurrent ? ' is-current' : ''}${isPlaceholder ? ' is-placeholder' : ''}${isPredetermined ? ' is-predetermined' : ''}" data-choose-card="${pal.id}" style="--pal-accent:${escapeHtml(pal.color || '#8a8a8a')}">
        <div class="choose-pal-media" data-choose-frame="${pal.id}">
          <img class="choose-pal-image" data-choose-image="${pal.id}" alt="${escapeHtml(pal.name)} adoption portrait">
          <div class="choose-pal-avatar" data-choose-placeholder="${pal.id}">${escapeHtml(pal.name.slice(0, 2).toUpperCase())}</div>
          <p class="choose-pal-ship-note label" data-choose-ship-note="${pal.id}" hidden>Ship Visual</p>
          ${isPlaceholder ? '<div class="choose-pal-overlay">COMING SOON</div>' : ''}
        </div>
        <div class="choose-pal-copy">
          <div class="collection-card-header choose-pal-header">
            <div>
              <p class="eyebrow">${escapeHtml(formatPalOrbitLabel(pal))}</p>
              <h2 class="collection-card-title">${escapeHtml(pal.name)}</h2>
            </div>
            <span class="collection-tag${isCurrent ? ' is-active' : ''}${isOwned && !isCurrent ? ' is-unlocked' : ''}">${isPlaceholder ? 'Placeholder' : isCurrent ? 'Current' : isOwned ? 'Owned' : 'Available'}</span>
          </div>

          <div class="choose-pal-stat-grid">
            <article class="collection-stat-card">
              <p class="label">Luck</p>
              <p class="collection-stat-value" data-tip="${escapeHtml(getPalStatTooltipCopy('luck'))}" tabindex="0">${String(pal.luck).padStart(2, '0')}</p>
            </article>
            <article class="collection-stat-card">
              <p class="label">Pessimism</p>
              <p class="collection-stat-value" data-tip="${escapeHtml(getPalStatTooltipCopy('pessimism'))}" tabindex="0">${String(pal.pessimism).padStart(2, '0')}</p>
            </article>
            <article class="collection-stat-card">
              <p class="label">Mutation Risk</p>
              <p class="collection-stat-value" data-tip="${escapeHtml(getPalStatTooltipCopy('mutation'))}" tabindex="0">${String(pal.mutationRisk).padStart(2, '0')}</p>
            </article>
          </div>

          <article class="dialogue-box">
            <p class="label">Catchphrase</p>
            <p class="dialogue-text">${escapeHtml(catchphrase)}</p>
          </article>

          <article class="collection-note">
            <p class="label">Profile</p>
            <p class="dialogue-text">${escapeHtml(pal.personality || pal.bio || 'Profile pending.')} ${pal.bestPal ? `Best Pal: ${escapeHtml(pal.bestPal)}.` : ''}</p>
            <p class="task-meta">${escapeHtml(diagnosis)} // ${escapeHtml(pal.tribe || 'TBD')}</p>
          </article>

          <button type="button" class="action-button choose-pal-button" ${btnData}${btnDisabled ? ' disabled' : ''}>
            ${btnLabel}
          </button>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('[data-choose-card]').forEach((card) => {
    const pal = getPalById(card.dataset.chooseCard);
    const image = card.querySelector('[data-choose-image]');
    const placeholder = card.querySelector('[data-choose-placeholder]');
    const frame = card.querySelector('[data-choose-frame]');
    const shipNote = card.querySelector('[data-choose-ship-note]');

    applyPalPlaceholder(placeholder, pal);
    bindResolvedImage(image, frame, placeholder, pal.slug || pal.id, 'portrait', shipNote);
  });
}

function bindChoosePalEvents(root) {
  if (root.dataset.bound === 'true') {
    return;
  }

  root.addEventListener('click', (event) => {
    const acquireButton = event.target.closest('[data-acquire-pal]');
    if (acquireButton && !acquireButton.disabled) {
      const palId = acquireButton.dataset.acquirePal;
      const result = acquirePal(palId);
      if (result.success) {
        setAppState((s) => ({
          ...s,
          meta: { ...s.meta, secondPalUnlockSeen: true },
        }));
        const card = root.querySelector(`[data-choose-card="${palId}"]`);
        if (card) {
          card.classList.add('pal-unlock-animation');
          card.addEventListener('animationend', () => {
            card.classList.remove('pal-unlock-animation');
            renderChoosePal(root);
          }, { once: true });
        } else {
          renderChoosePal(root);
        }
      } else {
        const copyEl = root.querySelector('[data-choose-pal-copy]');
        if (copyEl) {
          copyEl.textContent = result.reason || 'Acquisition failed.';
        }
      }
      return;
    }

    const selectButton = event.target.closest('[data-select-pal]');
    if (!selectButton) {
      return;
    }

    const pal = getPalById(selectButton.dataset.selectPal);
    if (!pal || pal.placeholder) {
      return;
    }

    const state = getState();
    if (!(state.ownedPals || []).length) {
      navigateWithAudioResume(getNoActivePalRoute(state));
      return;
    }

    setAppState((currentState) => {
      return applyActivePalSelection(currentState, pal.id);
    });

    navigateWithAudioResume('home.html');
  });

  root.dataset.bound = 'true';
}

function initChoosePalPage() {
  const root = document.querySelector('[data-choose-pal-root]');
  if (!root) {
    return;
  }

  const state = getState();
  if (!state.activePal && !(state.ownedPals || []).length) {
    navigateWithAudioResume(getNoActivePalRoute(state));
    return;
  }

  syncNeedDecay();
  syncCloneCycle();
  bindChoosePalEvents(root);
  renderChoosePal(root);
}

function initCollectionPage() {
  const root = document.querySelector('[data-collection-root]');
  if (!root) {
    return;
  }

  syncNeedDecay();
  syncCloneCycle();
  applyScreenBrandArt(root, getState().activePal);
  bindCollectionEvents(root);
  renderCollection(root);
}

function initDatabasePage() {
  const root = document.querySelector('[data-database-root]');
  if (!root) {
    return;
  }

  const state = getState();
  const activePal = getPalById(state.activePal);
  applyScreenBrandArt(root, activePal && activePal.id);
  const palCount = typeof PALS === 'undefined' ? 0 : PALS.length;
  const screenRegistry = [
    {
      file: 'index.html',
      href: '../index.html',
      title: 'App Router',
      purpose: 'root entry that redirects to onboarding, roster, or home based on saved state.',
      access: 'Launch the app. This entry redirects to onboarding, Choose Pal, or Home.',
      mode: 'entry',
    },
    {
      file: 'tasks.html',
      href: 'tasks.html',
      title: 'Daily Decline',
      purpose: 'main task loop, check-in, emotional weather, and orbit summary.',
      access: 'Bottom nav -> Home',
      mode: 'routed',
    },
    {
      file: 'home.html',
      href: 'home.html',
      title: 'Maintenance Loop',
      purpose: 'needs, care actions, plague management, and oracle outcomes.',
      access: 'Bottom nav -> Care',
      mode: 'routed',
    },
    {
      file: 'habits.html',
      href: 'habits.html',
      title: 'Routine Ledger',
      purpose: 'seven-day habit window and streak-adjacent upkeep.',
      access: 'Bottom nav -> Habits',
      mode: 'routed',
    },
    {
      file: 'streak.html',
      href: 'streak.html',
      title: 'Persistence Report',
      purpose: 'streak state, anti-achievements, and open-history pressure.',
      access: 'Bottom nav -> Streak',
      mode: 'routed',
    },
    {
      file: 'calendar.html',
      href: 'calendar.html',
      title: 'Emotional Orbit',
      purpose: 'schedule pressure, month routing, and event authoring.',
      access: 'Bottom nav -> Calendar',
      mode: 'routed',
    },
    {
      file: 'adopt.html',
      href: 'adopt.html',
      title: 'Adoption Oracle',
      purpose: 'standalone quiz that assigns a pal profile through four prompt answers.',
      access: 'Choose Pal -> Adoption Oracle, or Database -> Open Page',
      mode: 'standalone',
    },
    {
      file: 'choose-pal.html',
      href: 'choose-pal.html',
      title: 'Choose Your Pal',
      purpose: 'first assignment, roster switching, and acquisition gating.',
      access: 'Utility row -> Change Pal',
      mode: 'routed',
    },
    {
      file: 'lab.html',
      href: 'lab.html',
      title: 'Clone Chamber',
      purpose: 'pair selection, compatibility, chamber timing, and reveals.',
      access: 'Utility row -> Lab',
      mode: 'routed',
    },
    {
      file: 'collection.html',
      href: 'collection.html',
      title: 'Specimen Archive',
      purpose: 'roster archive, wall items, constellations, and clone history.',
      access: 'Utility row -> Archive',
      mode: 'routed',
    },
    {
      file: 'database.html',
      href: 'database.html',
      title: 'Internal Reference',
      purpose: 'live reference, lore catalog, and state-linked documentation.',
      access: 'Utility row -> Database',
      mode: 'routed',
    },
    {
      file: 'onboarding.html',
      href: 'onboarding.html',
      title: 'Initial Assignment Pending',
      purpose: 'transmission-led onboarding before the first roster choice.',
      access: 'Choose Pal -> Replay Intro, or Database -> Open Page',
      mode: 'routed',
    },
    {
      file: 'companion.html',
      href: 'companion.html',
      title: 'Talk to Your Pal',
      purpose: 'standalone companion chat shell with its own presentation layer.',
      access: 'Utility row -> Talk',
      mode: 'standalone',
    },
  ];
  const eventCount = typeof SEASONAL_EVENTS === 'undefined' ? 0 : SEASONAL_EVENTS.length;
  const achievementCount = typeof ANTI_ACHIEVEMENTS === 'undefined' ? 0 : ANTI_ACHIEVEMENTS.length;
  const taskSummary = getTaskSummary(getTaskConsoleEntries(state));
  const habitCount = getHabitCompletionCount(state.habitHistory, 7);
  const activeClone = getActiveClone(state);
  const ownedEntries = [...new Set(state.ownedPals || [])]
    .map((palId) => getPalById(palId))
    .filter(Boolean);
  const cloneHistory = [...((state.clone && state.clone.history) || [])]
    .sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0));
  const unlockedConstellations = Object.keys(state.constellations || {}).length;
  const dateLabel = root.querySelector('[data-database-date]');
  const activeLabel = root.querySelector('[data-database-active]');
  const palCountNode = root.querySelector('[data-database-pal-count]');
  const screenCountNode = root.querySelector('[data-database-screen-count]');
  const eventCountNode = root.querySelector('[data-database-event-count]');
  const achievementCountNode = root.querySelector('[data-database-achievement-count]');

  if (dateLabel) {
    dateLabel.textContent = formatDateLabel();
  }

  if (activeLabel) {
    activeLabel.textContent = activePal ? `ACTIVE PAL ${activePal.name.toUpperCase()}` : 'ACTIVE PAL NONE';
  }

  if (palCountNode) {
    palCountNode.textContent = String(palCount).padStart(2, '0');
  }

  if (screenCountNode) {
    screenCountNode.textContent = String(screenRegistry.length).padStart(2, '0');
  }

  if (eventCountNode) {
    eventCountNode.textContent = String(eventCount).padStart(2, '0');
  }

  if (achievementCountNode) {
    achievementCountNode.textContent = String(achievementCount).padStart(2, '0');
  }

  const screenCountNote = root.querySelector('[data-database-screen-count-note]');
  if (screenCountNote) {
    screenCountNote.textContent = `${screenRegistry.length} PAGES`;
  }

  const accessCountNote = root.querySelector('[data-database-access-count-note]');
  if (accessCountNote) {
    accessCountNote.textContent = `${screenRegistry.length} ROUTES`;
  }

  const ownedCountNode = root.querySelector('[data-database-owned-count]');
  if (ownedCountNode) {
    ownedCountNode.textContent = String(ownedEntries.length).padStart(2, '0');
  }

  const openTaskCountNode = root.querySelector('[data-database-open-task-count]');
  if (openTaskCountNode) {
    openTaskCountNode.textContent = String(taskSummary.remaining).padStart(2, '0');
  }

  const habitCountNode = root.querySelector('[data-database-habit-count]');
  if (habitCountNode) {
    habitCountNode.textContent = `${habitCount}/7`;
  }

  const cloneCountNode = root.querySelector('[data-database-clone-count]');
  if (cloneCountNode) {
    cloneCountNode.textContent = String(cloneHistory.length).padStart(2, '0');
  }

  const saveCopyNode = root.querySelector('[data-database-save-copy]');
  if (saveCopyNode) {
    saveCopyNode.textContent = activePal
      ? `${activePal.name} is active. ${taskSummary.remaining} task${taskSummary.remaining === 1 ? '' : 's'} remain open, ${habitCount}/7 recent habits are logged, and ${unlockedConstellations} constellation${unlockedConstellations === 1 ? '' : 's'} are unlocked. ${activeClone ? `${activeClone.cloneName || activeClone.sequenceString || 'An unnamed clone'} is the current clone bonus source.` : 'No active clone bonus is currently applied.'}`
      : 'No active pal is assigned in this save. The database is still able to describe the rest of the system.';
  }

  const screenGrid = root.querySelector('[data-database-screen-grid]');
  const accessGrid = root.querySelector('[data-database-access-grid]');
  if (accessGrid) {
    accessGrid.innerHTML = screenRegistry.map((entry) => `
      <article class="database-access-card">
        <div class="database-access-header">
          <div>
            <p class="label">${escapeHtml(entry.title)}</p>
            <h3 class="database-access-title">${escapeHtml(entry.file)}</h3>
          </div>
          <span class="database-screen-chip${entry.mode === 'standalone' ? ' is-standalone' : ''}">${escapeHtml(entry.mode)}</span>
        </div>
        <p class="database-access-route">${escapeHtml(entry.access)}</p>
        <div class="database-screen-actions">
          <p class="task-meta">${escapeHtml(entry.href)}</p>
          <a class="ghost-link database-screen-open" href="${escapeHtml(entry.href)}">Open Page</a>
        </div>
      </article>
    `).join('');
  }

  if (screenGrid) {
    screenGrid.innerHTML = screenRegistry.map((entry) => `
      <article class="database-screen-card">
        <div class="database-screen-card-header">
          <div>
            <p class="label">${escapeHtml(entry.file)}</p>
            <h3 class="database-screen-card-title">${escapeHtml(entry.title)}</h3>
          </div>
          <span class="database-screen-chip${entry.mode === 'standalone' ? ' is-standalone' : ''}">${escapeHtml(entry.mode)}</span>
        </div>
        <p class="dialogue-text">${escapeHtml(entry.purpose)}</p>
        <div class="database-screen-actions">
          <p class="task-meta">${escapeHtml(entry.href)}</p>
          <a class="ghost-link database-screen-open" href="${escapeHtml(entry.href)}">Open Page</a>
        </div>
      </article>
    `).join('');
  }

  const rosterCountNode = root.querySelector('[data-database-roster-count]');
  if (rosterCountNode) {
    rosterCountNode.textContent = `${ownedEntries.length} TRACKED`;
  }

  const rosterGrid = root.querySelector('[data-database-roster-grid]');
  if (rosterGrid) {
    rosterGrid.innerHTML = ownedEntries.length
      ? ownedEntries.map((pal) => {
        const ledger = state.palMoodLedger[pal.id] || {};
        const hunger = Math.round(typeof ledger.hunger === 'number' ? ledger.hunger : 0);
        const mood = Math.round(typeof ledger.mood === 'number' ? ledger.mood : 0);
        const plague = Math.round(typeof ledger.plague === 'number' ? ledger.plague : 0);
        const trust = Math.round(typeof ledger.trust === 'number' ? ledger.trust : 0);
        const isDead = Boolean(ledger.isDead);
        const isActive = state.activePal === pal.id;
        const isLit = isPalConnectionLit(state, pal.id);
        const isComplete = Boolean((state.constellations || {})[pal.id]);
        const activeCloneRole = activeClone && [activeClone.sourcePalId, activeClone.basePalId, activeClone.dominantPalId].includes(pal.id)
          ? (activeClone.basePalId === pal.id && activeClone.sourcePalId !== pal.id && activeClone.dominantPalId !== pal.id ? 'Active Clone Base' : 'Active Clone Source')
          : null;
        const plagueLabel = isDead ? 'Lost' : getPlagueStageLabel(plague).toUpperCase();
        const relationshipMode = isDead ? 'LOST' : (ledger.relationshipMode || 'observing').toUpperCase();
        const liveCopy = isDead
          ? `${pal.name} is preserved in the death record. Their last state is retained for reference only.`
          : (ledger.latestReaction || pal.bio || 'No live reaction logged yet.');
        return `
          <article class="database-roster-card" style="--pal-accent:${escapeHtml(pal.color || '#8a8a8a')}">
            <div class="database-roster-header">
              <div>
                <p class="label">SPECIMEN ${escapeHtml(pal.id.toUpperCase())}</p>
                <h3 class="database-roster-title">${escapeHtml(pal.name)}</h3>
              </div>
              <div class="database-roster-chip-row">
                ${isActive ? '<span class="database-roster-chip is-active">Active</span>' : ''}
                ${isDead ? '<span class="database-roster-chip is-dead">Lost</span>' : ''}
              </div>
            </div>
            <div class="database-roster-chip-row">
              <span class="database-roster-chip${isComplete ? ' is-complete' : isLit ? ' is-lit' : ''}">${escapeHtml(isComplete ? 'Constellation Complete' : isLit ? 'Connection Lit' : 'Connection Dormant')}</span>
              ${activeCloneRole ? `<span class="database-roster-chip is-clone">${escapeHtml(activeCloneRole)}</span>` : ''}
            </div>
            <p class="task-meta">Trust ${String(trust).padStart(2, '0')} · ${escapeHtml(getPalTrustTier(pal.id, state).toUpperCase())} · ${escapeHtml(relationshipMode)}</p>
            <p class="task-meta">Hunger ${String(hunger).padStart(2, '0')} · Mood ${String(mood).padStart(2, '0')} · Plague ${String(plague).padStart(2, '0')} · ${escapeHtml(plagueLabel)}</p>
            <p class="dialogue-text">${escapeHtml(liveCopy)}</p>
          </article>
        `;
      }).join('')
      : '<article class="database-roster-card"><p class="task-meta">No owned pals are logged in this save yet.</p></article>';
  }

  const lineageCountNode = root.querySelector('[data-database-lineage-count]');
  if (lineageCountNode) {
    lineageCountNode.textContent = `${cloneHistory.length} LOGGED`;
  }

  const lineageList = root.querySelector('[data-database-lineage-list]');
  if (lineageList) {
    lineageList.innerHTML = cloneHistory.length
      ? cloneHistory.slice(0, 6).map((entry) => {
        const rarity = getCloneRarity(entry, state);
        const tier = entry.tier || 'stable';
        const isActiveBonus = Boolean(activeClone && activeClone.id === entry.id);
        const timestamp = entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Timestamp unavailable';
        return `
          <li class="database-lineage-card is-${rarity}${isActiveBonus ? ' is-active' : ''}">
            <div class="clone-archive-header">
              <div class="clone-archive-tags">
                <p class="label">${escapeHtml(rarity.toUpperCase())}</p>
                <span class="clone-tier-badge is-${escapeHtml(tier)}">${escapeHtml(tier.toUpperCase())}</span>
                ${isActiveBonus ? '<span class="database-roster-chip is-active">Active Bonus</span>' : ''}
              </div>
              <p class="task-meta">GEN ${entry.generation || 1}</p>
            </div>
            <p class="clone-history-title">${escapeHtml(entry.cloneName || entry.sequenceString || entry.label || 'Unnamed variation')}</p>
            <p class="task-meta">${escapeHtml(entry.label || entry.variantLabel || 'Uncatalogued mutation')}</p>
            ${entry.sequenceString
              ? `<p class="task-meta sequence-string">${escapeHtml(entry.sequenceString)}<sup>${entry.traitsChanged || 0}</sup></p>`
              : ''}
            <p class="task-meta">${escapeHtml(entry.sourcePalName || entry.basePalId || '?')}</p>
            <p class="task-meta">${escapeHtml(timestamp)}</p>
          </li>
        `;
      }).join('')
      : '<li class="database-lineage-card"><p class="task-meta">No clones are logged in this save yet. The chamber is still producing threats rather than lineage.</p></li>';
  }

  // ── WORLD LORE ──────────────────────────────────────
  const worldGrid = root.querySelector('[data-world-lore-grid]');
  if (worldGrid && typeof WORLD_LORE !== 'undefined') {
    const LORE_ORDER = ['gloom', 'luckdust', 'ickysoul', 'contact', 'glint'];
    worldGrid.innerHTML = LORE_ORDER
      .filter((key) => WORLD_LORE[key])
      .map((key) => {
        const entry = WORLD_LORE[key];
        return `
          <article class="lore-entry">
            <p class="label">${escapeHtml(entry.name)}</p>
            <p class="lore-entry-body">${escapeHtml(entry.lore)}</p>
          </article>
        `;
      }).join('');
  }

  // ── PLANETS ─────────────────────────────────────────
  const planetGrid = root.querySelector('[data-planet-grid]');
  const planetCount = root.querySelector('[data-planet-count]');
  const planets = typeof PLANETS !== 'undefined' ? PLANETS : [];

  if (planetCount) {
    planetCount.textContent = `${planets.length} LOGGED`;
  }

  if (planetGrid) {
    planetGrid.innerHTML = planets.map((planet) => {
      const pal = PALS && PALS.find((p) => p.id === planet.pal);
      return `
        <article class="lore-entry lore-entry-planet lore-entry-has-art" data-planet-entry="${escapeHtml(planet.id)}">
          <div class="lore-entry-art" data-planet-art-frame="${escapeHtml(planet.id)}">
            <img class="lore-entry-image" data-planet-art="${escapeHtml(planet.id)}" alt="${escapeHtml(planet.name)} orbital illustration" hidden>
            <span class="lore-entry-fallback" data-planet-fallback="${escapeHtml(planet.id)}">${escapeHtml(planet.name.slice(0, 3).toUpperCase())}</span>
          </div>
          <div class="lore-entry-copy">
            <div class="lore-entry-header">
              <p class="label">${escapeHtml(planet.name)}</p>
              ${pal ? `<span class="lore-entry-tag">${escapeHtml(pal.name)}</span>` : ''}
            </div>
            ${planet.description
              ? `<p class="lore-entry-body">${escapeHtml(planet.description)}</p>`
              : ''}
            ${planet.theme
              ? `<p class="lore-entry-meta">Theme: ${escapeHtml(planet.theme)}</p>`
              : ''}
            ${planet.environment
              ? `<p class="lore-entry-meta">Environment: ${escapeHtml(planet.environment)}</p>`
              : ''}
          </div>
        </article>
      `;
    }).join('');

    planetGrid.querySelectorAll('[data-planet-art-frame]').forEach((frame) => {
      const planet = planets.find((entry) => entry.id === frame.dataset.planetArtFrame);
      const image = frame.querySelector('[data-planet-art]');
      const fallback = frame.querySelector('[data-planet-fallback]');
      bindStaticAssetImage(image, frame, fallback, planet && planet.image);
    });
  }

  // ── MOONS ───────────────────────────────────────────
  const moonGrid = root.querySelector('[data-moon-grid]');
  const moonCount = root.querySelector('[data-moon-count]');
  const moons = typeof MOONS !== 'undefined' ? MOONS : [];

  if (moonCount) {
    moonCount.textContent = `${moons.length} LOGGED`;
  }

  if (moonGrid) {
    moonGrid.innerHTML = moons.map((moon) => {
      const planet = planets.find((p) => p.id === moon.planet);
      return `
        <article class="lore-entry lore-entry-moon lore-entry-has-art" data-moon-entry="${escapeHtml(moon.id)}">
          <div class="lore-entry-art" data-moon-art-frame="${escapeHtml(moon.id)}">
            <img class="lore-entry-image" data-moon-art="${escapeHtml(moon.id)}" alt="${escapeHtml(moon.name)} moon illustration" hidden>
            <span class="lore-entry-fallback" data-moon-fallback="${escapeHtml(moon.id)}">${escapeHtml(moon.name.slice(0, 3).toUpperCase())}</span>
          </div>
          <div class="lore-entry-copy">
            <div class="lore-entry-header">
              <p class="label">${escapeHtml(moon.name)}</p>
              ${planet ? `<span class="lore-entry-tag">${escapeHtml(planet.name)}</span>` : ''}
            </div>
            ${moon.description
              ? `<p class="lore-entry-body">${escapeHtml(moon.description)}</p>`
              : ''}
            ${moon.theme
              ? `<p class="lore-entry-meta">Theme: ${escapeHtml(moon.theme)}</p>`
              : ''}
          </div>
        </article>
      `;
    }).join('');

    moonGrid.querySelectorAll('[data-moon-art-frame]').forEach((frame) => {
      const moon = moons.find((entry) => entry.id === frame.dataset.moonArtFrame);
      const planet = planets.find((entry) => moon && entry.id === moon.planet);
      const image = frame.querySelector('[data-moon-art]');
      const fallback = frame.querySelector('[data-moon-fallback]');
      bindStaticAssetImage(image, frame, fallback, moon && moon.image, planet && planet.image ? [planet.image] : []);
    });
  }

  // ── TRIBES ──────────────────────────────────────────
  const tribeGrid = root.querySelector('[data-tribe-grid]');
  const tribeCount = root.querySelector('[data-tribe-count]');
  const tribes = typeof TRIBES !== 'undefined' ? TRIBES : [];

  if (tribeCount) {
    tribeCount.textContent = `${tribes.length} LOGGED`;
  }

  if (tribeGrid) {
    tribeGrid.innerHTML = tribes.map((tribe) => {
      const tribePlanet = planets.find((p) => p.id === tribe.planet);
      const activities = Array.isArray(tribe.what_they_do)
        ? tribe.what_they_do : [];
      return `
        <article class="lore-entry lore-entry-tribe">
          <div class="lore-entry-header">
            <p class="label">${escapeHtml(tribe.name)}</p>
            ${tribePlanet
              ? `<span class="lore-entry-tag">${escapeHtml(tribePlanet.name)}</span>`
              : ''}
          </div>
          ${tribe.description
            ? `<p class="lore-entry-body">${escapeHtml(tribe.description)}</p>`
            : ''}
          ${activities.length
            ? `<ul class="lore-entry-list">
                ${activities.map((a) =>
                  `<li class="lore-entry-list-item">${escapeHtml(a)}</li>`
                ).join('')}
               </ul>`
            : ''}
        </article>
      `;
    }).join('');
  }
}

function initHomePage() {
  const root = document.querySelector('[data-home-root]');
  if (!root) {
    return;
  }

  // Tasks page: brand corner shows the active pal's portrait PNG, not the legacy ahote logo.
  const activePalId = getState().activePal;
  const activePalData = activePalId ? getPalById(activePalId) : null;
  if (activePalData && activePalData.image) {
    root.style.setProperty('--screen-brand-image', `url("${toRelativeAssetPath(activePalData.image)}")`);
  } else {
    root.style.removeProperty('--screen-brand-image');
  }

  if (redirectToChoosePalIfNoActivePal()) {
    return;
  }

  if (getState().activePal === 'doolin') {
    setAppState((state) => ({
      ...state,
      palMoodLedger: {
        ...state.palMoodLedger,
        doolin: {
          ...(state.palMoodLedger.doolin || getDefaultPalMoodEntry('doolin')),
          dialogueDismissedWithoutView: 0,
        },
      },
    }));
  }

  syncNeedDecay();
  syncCloneCycle();
  bindHomeEvents(root);
  renderHome(root);
}

let careRefreshHandle = null;
let labRefreshHandle = null;
let carePageRoot = null;
let labPageRoot = null;

function handleCarePageVisibilityChange() {
  if (document.visibilityState !== 'visible' || !carePageRoot) {
    return;
  }

  syncNeedDecay();
  renderCare(carePageRoot);
}

function handleLabPageVisibilityChange() {
  if (document.visibilityState !== 'visible' || !labPageRoot) {
    return;
  }

  syncNeedDecay();
  syncCloneCycle();
  renderLab(labPageRoot);
}

function initCarePage() {
  const root = document.querySelector('[data-care-root]');
  if (!root) {
    return;
  }

  applyScreenBrandArt(root, getState().activePal);

  if (redirectToChoosePalIfNoActivePal()) {
    return;
  }

  const openedAt = Date.now();
  setAppState((state) => ({
    ...state,
    palMoodLedger: {
      ...state.palMoodLedger,
      ...(state.activePal && state.palMoodLedger[state.activePal]
        ? {
          [state.activePal]: {
            ...state.palMoodLedger[state.activePal],
            lastCareScreenOpenTime: openedAt,
          },
        }
        : {}),
    },
  }));

  if (getState().activePal === 'doolin') {
    const startingSeqLength = ((getState().palMoodLedger.doolin || {}).lastCareActionSequence || []).length;
    window.setTimeout(() => {
      const currentState = getState();
      const entry = currentState.palMoodLedger.doolin || {};
      if (
        currentState.activePal === 'doolin'
        && entry.relationshipMode === 'withdrawn'
        && entry.lastCareScreenOpenTime === openedAt
        && ((entry.lastCareActionSequence || []).length === startingSeqLength)
      ) {
        setAppState((state) => applyRecoveryGesture(state, 'doolin', 'sixty_seconds'));
      }
    }, 60000);
  }

  syncNeedDecay();
  syncCloneCycle();
  buildOracle(root);
  bindCareEvents(root);
  renderCare(root);
  const careVisitStartedAt = Date.now();
  const lastVisitTimestamp = typeof getState().meta.lastVisitTimestamp === 'number'
    ? getState().meta.lastVisitTimestamp
    : careVisitStartedAt;
  const hoursSinceLastVisit = Math.max(0, (careVisitStartedAt - lastVisitTimestamp) / (1000 * 60 * 60));
  let stareActivated = false;
  if (typeof window.initCarePokeSystem === 'function') {
    stareActivated = Boolean(window.initCarePokeSystem(root, {
      hoursSinceLastVisit,
      visitStartedAt: careVisitStartedAt,
    }));
  }
  if (typeof window.initCareSpriteSystem === 'function') {
    window.initCareSpriteSystem(root);
  }
  if (!stareActivated) {
    setAppState((state) => ({
      ...state,
      meta: {
        ...state.meta,
        lastVisitTimestamp: careVisitStartedAt,
      },
    }));
  }
  carePageRoot = root;

  if (careRefreshHandle) {
    window.clearInterval(careRefreshHandle);
  }

  careRefreshHandle = window.setInterval(() => {
    syncNeedDecay();
    renderCare(root);
    if (typeof window.syncCarePokeSystem === 'function') {
      window.syncCarePokeSystem(root);
    }
    if (typeof window.syncCareSpriteSystem === 'function') {
      window.syncCareSpriteSystem(root);
    }
  }, CARE_REFRESH_INTERVAL);

  document.removeEventListener('visibilitychange', handleCarePageVisibilityChange);
  document.addEventListener('visibilitychange', handleCarePageVisibilityChange);
}

function initHabitsPage() {
  const root = document.querySelector('[data-habits-root]');
  if (!root) {
    return;
  }

  if (redirectToChoosePalIfNoActivePal()) {
    return;
  }

  syncNeedDecay();
  syncCloneCycle();
  bindHabitsEvents(root);
  buildOracle(root);
  renderHabits(root);
  renderHabitsOracle(root);
  renderCheckinPanel(root, getState());
  renderStreak(root);
}

function renderHabitsOracle(root) {
  const state = getState();
  const activeLedger = (state.palMoodLedger || {})[state.activePal] || {};
  buildEightBall(root);
  const todayKey = getLocalDateKey();
  const alreadyConsulted = state.lastSpinDate === todayKey;
  const oracleResultEl = root.querySelector('[data-oracle-result]');
  if (oracleResultEl) {
    oracleResultEl.innerHTML = escapeHtml(getOracleResultText(state)).replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
  }
  const oracleButton = root.querySelector('[data-oracle-consult]');
  if (oracleButton) {
    oracleButton.disabled = activeLedger.isGhost || alreadyConsulted;
    oracleButton.setAttribute('aria-disabled', String(oracleButton.disabled));
    if (alreadyConsulted) {
      oracleButton.textContent = 'Already Consulted Today';
    } else if (activeLedger.isGhost) {
      oracleButton.textContent = 'Oracle Unreachable';
    } else {
      oracleButton.textContent = 'Consult Anyway';
    }
  }
  const hintEl = root.querySelector('[data-eightball-hint]');
  if (hintEl) {
    hintEl.textContent = alreadyConsulted
      ? "Today's reading stands. Return tomorrow."
      : 'The void answers. Sometimes.';
  }
  const oracleEl = root.querySelector('[data-checkin-oracle]');
  if (oracleEl) {
    oracleEl.classList.toggle('is-oracle-spent', alreadyConsulted);

    const toggle = oracleEl.querySelector('[data-checkin-oracle-toggle]');
    const body = oracleEl.querySelector('[data-checkin-oracle-body]');

    // Auto-collapse the oracle once it's been consulted today, but only the
    // first time we render it spent — let the user re-expand manually if they
    // want to re-read the result.
    if (alreadyConsulted) {
      if (oracleEl.dataset.spentCollapsedApplied !== 'true') {
        oracleEl.classList.add('is-oracle-collapsed');
        oracleEl.dataset.spentCollapsedApplied = 'true';
      }
    } else {
      oracleEl.classList.remove('is-oracle-collapsed');
      delete oracleEl.dataset.spentCollapsedApplied;
    }

    if (toggle && body) {
      toggle.hidden = !alreadyConsulted;
      const collapsed = oracleEl.classList.contains('is-oracle-collapsed');
      toggle.setAttribute('aria-expanded', String(!collapsed));
      toggle.textContent = collapsed ? 'Show Oracle Reading' : 'Hide Oracle Reading';
      body.setAttribute('aria-hidden', String(collapsed));
    }
  }
}

function initStreakPage() {
  const root = document.querySelector('[data-streak-root]');
  if (!root) {
    return;
  }

  if (redirectToChoosePalIfNoActivePal()) {
    return;
  }

  syncNeedDecay();
  syncCloneCycle();
  bindStreakEvents(root);
  renderStreak(root);
}

function initLabPage() {
  const root = document.querySelector('[data-lab-root]');
  if (!root) {
    return;
  }

  // V1.0: cloning is not yet shipped. Redirect any user who reaches the Lab.
  if (typeof window !== 'undefined' && !window.__PPALS_DEV__) {
    window.location.replace('home.html');
    return;
  }

  stopCloneRevealSequence();

  applyScreenBrandArt(root, getState().activePal);

  if (redirectToChoosePalIfNoActivePal()) {
    return;
  }

  syncNeedDecay();
  syncCloneCycle();
  bindLabEvents(root);
  renderLab(root);
  labPageRoot = root;

  if (labRefreshHandle) {
    window.clearInterval(labRefreshHandle);
  }

  labRefreshHandle = window.setInterval(() => {
    syncCloneCycle();
    renderLab(root);
  }, LAB_REFRESH_INTERVAL);

  document.removeEventListener('visibilitychange', handleLabPageVisibilityChange);
  document.addEventListener('visibilitychange', handleLabPageVisibilityChange);
}

function initOnboardingPage() {
  const fallbackTransmissionScreens = [
    {
      id: 'transmission_1',
      eyebrow: 'INCOMING TRANSMISSION',
      title: 'Something found you.',
      fallbackBody: [
        'You were not looking for it. You did not apply. There was no announcement.',
        'A Pal identified your Gloom output as sufficient for their requirements and made contact. The criteria are unknown. The Pal will not explain their reasoning. They may not fully understand it themselves.',
        'You have been selected. This is not a compliment. It is a logistics decision.',
      ],
    },
    {
      id: 'transmission_2',
      eyebrow: 'TRANSMISSION CONTINUES',
      title: 'About Gloom.',
      fallbackBody: [
        'Gloom is what Pals call the energy produced when a conscious being does something they do not want to do anyway.',
        'You produce it constantly. You may not have noticed.',
        'Pals require it to function. Your Pal\'s own relationship with effort has become complicated. The arrangement is mutually convenient and mutually embarrassing. Neither party needs to discuss it further.',
      ],
    },
    {
      id: 'transmission_3',
      eyebrow: 'TRANSMISSION CONTINUES',
      title: 'What this requires of you.',
      fallbackBody: [
        'Your Pal will need food, stimulation, and the occasional acknowledgment that the situation is not ideal.',
        'They will not thank you. They did not choose gratitude as a survival strategy.',
        'In return they will be present, occasionally honest, and more attached than either of you will admit out loud.',
      ],
    },
    {
      id: 'transmission_4',
      eyebrow: 'END OF TRANSMISSION',
      title: 'One of them is already waiting.',
      fallbackBody: [
        'They have opinions about the arrangement.',
        'Go meet them.',
      ],
      isFinal: true,
    },
  ];

  const loreTransmissionScreens = typeof WORLD_LORE !== 'undefined'
    && WORLD_LORE
    && WORLD_LORE.onboarding
    && Array.isArray(WORLD_LORE.onboarding.screens)
      ? WORLD_LORE.onboarding.screens
      : [];

  const loreTextById = new Map(
    loreTransmissionScreens
      .filter((screen) => screen && typeof screen.id === 'string')
      .map((screen) => [screen.id, typeof screen.text === 'string' ? screen.text : ''])
  );

  const TRANSMISSION_SCREENS = fallbackTransmissionScreens.map((screen) => {
    const sourceText = loreTextById.get(screen.id);
    const body = sourceText
      ? sourceText.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
      : screen.fallbackBody;

    return {
      id: screen.id,
      eyebrow: screen.eyebrow,
      title: screen.title,
      body,
      isFinal: Boolean(screen.isFinal),
    };
  });

  let currentScreen = 0;
  const root = document.querySelector('[data-onboarding-root]');
  if (!root) return;
  const nextButton = root.querySelector('[data-transmission-next]');
  const skipButton = root.querySelector('[data-transmission-skip]');

  const leaveOnboarding = () => {
    const nextState = setAppState((s) => ({
      ...s,
      meta: { ...s.meta, onboardingSeen: true },
    }));

    navigateWithAudioResume(getNoActivePalRoute(nextState));
  };

  const advanceTransmission = () => {
    if (currentScreen >= TRANSMISSION_SCREENS.length - 1) {
      leaveOnboarding();
      return;
    }

    currentScreen += 1;
    renderTransmissionScreen(currentScreen);
  };

  function renderTransmissionScreen(index) {
    const screen = TRANSMISSION_SCREENS[index];
    if (!screen) return;

    const eyebrow = root.querySelector('[data-transmission-eyebrow]');
    const title = root.querySelector('[data-transmission-title]');
    const body = root.querySelector('[data-transmission-body]');
    const btn = root.querySelector('[data-transmission-next]');
    const counter = root.querySelector('[data-transmission-counter]');

    if (eyebrow) eyebrow.textContent = screen.eyebrow;
    if (title) title.textContent = screen.title;
    if (body) {
      body.innerHTML = screen.body
        .map((p) => `<p class="section-copy">${escapeHtml(p)}</p>`)
        .join('');
    }
    if (btn) {
      btn.textContent = screen.isFinal ? 'Meet Your Pal' : 'Continue';
    }
    if (counter) {
      counter.textContent = `${index + 1} / ${TRANSMISSION_SCREENS.length}`;
    }

    root.classList.remove('transmission-visible');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.add('transmission-visible');
      });
    });
  }

  root.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-transmission-next]');
    if (!btn) return;
    advanceTransmission();
  });

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-transmission-skip]')) {
      leaveOnboarding();
    }
  });

  if (nextButton) {
    nextButton.onclick = (event) => {
      event.stopPropagation();
      advanceTransmission();
    };
  }

  if (skipButton) {
    skipButton.onclick = (event) => {
      event.stopPropagation();
      leaveOnboarding();
    };
  }

  renderTransmissionScreen(0);
}
appState = setAppState(prepareSessionState(loadState()));

window.PessimisticPals = {
  getState,
  setAppState,
  saveState,
  loadState,
  getPalById,
  loadPalImage,
  applyActivePalSelection,
};

function applyDisplayPrefs() {
  const meta = (getState() || {}).meta || {};
  const body = document.body;
  if (!body) return;
  body.dataset.crtScanlines = meta.crtScanlines === false ? 'off' : 'on';
  body.dataset.crtCursor = meta.crtCursor === false ? 'off' : 'on';
  body.dataset.reduceMotion = meta.reduceMotion === true ? 'on' : 'off';
  body.dataset.straightLayout = meta.straightLayout === true ? 'on' : 'off';
}

function injectActivePalChip() {
  const page = document.body.dataset.page;
  if (page === 'index' || page === 'onboarding' || page === 'choose-pal') return;
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;
  if (topbar.querySelector('.active-pal-chip')) return;

  const state = getState();
  const palId = state && state.activePal;
  if (!palId) return;
  const pal = (typeof getPalById === 'function') ? getPalById(palId) : null;
  if (!pal) return;

  const ledger = (state.palMoodLedger && state.palMoodLedger[palId]) || {};
  const mode = ledger.relationshipMode || 'neutral';

  const chip = document.createElement('a');
  chip.className = 'active-pal-chip';
  if (mode === 'bonded') chip.classList.add('is-bonded');
  if (mode === 'estranged') chip.classList.add('is-estranged');
  chip.href = 'care.html';
  chip.setAttribute('aria-label', `Active pal: ${pal.name}. Open Care.`);

  const portrait = document.createElement('img');
  portrait.className = 'active-pal-chip-portrait';
  const imgSrc = pal.image || pal.portrait_image_ref || '';
  if (imgSrc && typeof toRelativeAssetPath === 'function') {
    portrait.src = toRelativeAssetPath(imgSrc);
  } else {
    portrait.src = imgSrc;
  }
  portrait.alt = '';
  chip.appendChild(portrait);

  const text = document.createElement('span');
  text.className = 'active-pal-chip-text';
  const eyebrow = document.createElement('span');
  eyebrow.className = 'active-pal-chip-eyebrow';
  eyebrow.textContent = mode === 'bonded' ? 'Bonded' : (mode === 'estranged' ? 'Estranged' : 'Active Pal');
  const name = document.createElement('span');
  name.className = 'active-pal-chip-name';
  name.textContent = pal.name;
  text.appendChild(eyebrow);
  text.appendChild(name);
  chip.appendChild(text);

  topbar.appendChild(chip);
}

function injectPalConstellation() {
  const page = document.body.dataset.page;
  // Constellation lives on the Collection (pal archive) page only — that's
  // where roster/relationship data belongs. Keeps Tasks/Care uncluttered.
  if (page !== 'collection') return;
  const screen = document.querySelector('.screen');
  if (!screen) return;
  if (document.querySelector('.pal-constellation')) return;

  const state = getState();
  const ownedIds = Array.isArray(state && state.ownedPals) ? state.ownedPals : [];
  const ownedPals = ownedIds
    .map((id) => (typeof getPalById === 'function' ? getPalById(id) : null))
    .filter(Boolean);
  if (ownedPals.length === 0) return;

  // Map pal name (case-insensitive) -> id, for resolving pal.bestPal references.
  const allPals = (typeof PALS !== 'undefined' && Array.isArray(PALS)) ? PALS : [];
  const nameToId = new Map();
  allPals.forEach((p) => { if (p && p.name) nameToId.set(p.name.toLowerCase(), p.id); });

  const section = document.createElement('section');
  section.className = 'panel pal-constellation';

  const heading = document.createElement('div');
  heading.className = 'pal-constellation-heading';
  heading.innerHTML = '<p class="eyebrow">PAL CONSTELLATION</p><p class="section-note">Bonded links illuminate</p>';
  section.appendChild(heading);

  const stage = document.createElement('div');
  stage.className = 'pal-constellation-stage';

  const stars = document.createElement('div');
  stars.className = 'pal-constellation-stars';
  stars.setAttribute('aria-hidden', 'true');
  stage.appendChild(stars);

  // SVG layer for connecting lines (drawn first so nodes paint over it).
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'pal-constellation-svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  stage.appendChild(svg);

  // Place owned pals around an arc so the active pal sits centered+forward.
  const positions = new Map();
  const activeId = state.activePal;
  const reordered = [...ownedPals];
  // Put active pal first so it ends up at the apex.
  const activeIndex = reordered.findIndex((p) => p.id === activeId);
  if (activeIndex > 0) {
    const [activePal] = reordered.splice(activeIndex, 1);
    reordered.unshift(activePal);
  }

  const count = reordered.length;
  reordered.forEach((pal, i) => {
    let x;
    let y;
    if (count === 1) {
      x = 50; y = 50;
    } else {
      // Place the active pal (i=0) at top center, others spread around lower arc.
      if (i === 0) {
        x = 50; y = 32;
      } else {
        const others = count - 1;
        const t = (i - 1) / Math.max(1, others - 1 || 1);
        // arc from 12% to 88% horizontally, 78% vertically with slight curve
        x = 12 + t * 76;
        const curve = Math.sin(t * Math.PI) * 12; // bow up in middle
        y = 78 - curve;
      }
    }
    positions.set(pal.id, { x, y });
  });

  // Draw bestPal links between owned pals (no duplicates).
  const drawn = new Set();
  reordered.forEach((pal) => {
    if (!pal.bestPal) return;
    const partnerId = nameToId.get(String(pal.bestPal).toLowerCase());
    if (!partnerId) return;
    if (!positions.has(partnerId)) return;
    const key = [pal.id, partnerId].sort().join('::');
    if (drawn.has(key)) return;
    drawn.add(key);

    const a = positions.get(pal.id);
    const b = positions.get(partnerId);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', String(a.x));
    line.setAttribute('y1', String(a.y));
    line.setAttribute('x2', String(b.x));
    line.setAttribute('y2', String(b.y));
    line.setAttribute('class', 'pal-constellation-link');

    const aMode = (state.palMoodLedger && state.palMoodLedger[pal.id] && state.palMoodLedger[pal.id].relationshipMode) || 'neutral';
    const bMode = (state.palMoodLedger && state.palMoodLedger[partnerId] && state.palMoodLedger[partnerId].relationshipMode) || 'neutral';
    if (aMode === 'bonded' && bMode === 'bonded') {
      line.classList.add('is-illuminated');
    }
    svg.appendChild(line);
  });

  // Place nodes.
  reordered.forEach((pal) => {
    const pos = positions.get(pal.id);
    const node = document.createElement('a');
    node.className = 'pal-constellation-node';
    node.href = 'care.html';
    node.style.left = `${pos.x}%`;
    node.style.top = `${pos.y}%`;
    node.setAttribute('aria-label', `${pal.name}${pal.id === activeId ? ' (active)' : ''}`);

    if (pal.id === activeId) node.classList.add('is-active');
    const mode = (state.palMoodLedger && state.palMoodLedger[pal.id] && state.palMoodLedger[pal.id].relationshipMode) || 'neutral';
    if (mode === 'bonded') node.classList.add('is-bonded');
    if (mode === 'estranged') node.classList.add('is-estranged');

    const img = document.createElement('img');
    const src = pal.image || pal.portrait_image_ref || '';
    img.src = (src && typeof toRelativeAssetPath === 'function') ? toRelativeAssetPath(src) : src;
    img.alt = '';
    node.appendChild(img);

    const label = document.createElement('span');
    label.className = 'pal-constellation-node-label';
    label.textContent = pal.name;
    node.appendChild(label);

    stage.appendChild(node);
  });

  section.appendChild(stage);

  const legend = document.createElement('div');
  legend.className = 'pal-constellation-legend';
  legend.innerHTML = ''
    + '<span class="pal-constellation-legend-item"><span class="pal-constellation-legend-swatch is-bond"></span>Bonded link</span>'
    + '<span class="pal-constellation-legend-item"><span class="pal-constellation-legend-swatch is-neutral"></span>Dim link</span>'
    + '<span class="pal-constellation-legend-item"><span class="pal-constellation-legend-swatch is-estrange"></span>Estranged</span>';
  section.appendChild(legend);

  // Insert just after the topbar (or as first panel if no topbar).
  const topbar = screen.querySelector('.topbar');
  if (topbar && topbar.parentElement === screen) {
    topbar.insertAdjacentElement('afterend', section);
  } else {
    screen.insertBefore(section, screen.firstChild);
  }
}

function injectSettingsGear() {
  if (document.querySelector('#settings-gear')) return;
  if (document.body.dataset.page === 'index' || document.body.dataset.page === 'onboarding') return;
  const btn = document.createElement('button');
  btn.id = 'settings-gear';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Settings');
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  btn.addEventListener('click', () => {
    // If we're already on the settings page, treat the gear as a toggle and
    // step back to wherever the user came from. Falls back to home if there
    // is no usable history entry.
    if (document.body.dataset.page === 'settings') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigateWithAudioResume('../pages/home.html');
      }
      return;
    }
    navigateWithAudioResume('../pages/settings.html');
  });
  document.body.appendChild(btn);
}

function initSettingsPage() {
  const root = document.querySelector('[data-settings-root]');
  if (!root) return;
  const meta = (getState() || {}).meta || {};

  const setStatus = (msg) => {
    const el = root.querySelector('[data-settings-status]');
    if (el) el.textContent = `Status: ${msg}`;
  };

  const renderControls = () => {
    const m = (getState() || {}).meta || {};
    root.querySelectorAll('.settings-toggle').forEach((input) => {
      const key = input.dataset.setting;
      input.checked = m[key] === true;
    });
    root.querySelectorAll('.settings-slider').forEach((slider) => {
      const key = slider.dataset.setting;
      const fallback = key === 'uiVolume' ? 0.6 : 0.6;
      const v = typeof m[key] === 'number' ? m[key] : fallback;
      slider.value = String(Math.round(v * 100));
      const display = root.querySelector('[data-setting-display="' + key + '"]');
      if (display) display.textContent = `${Math.round(v * 100)}%`;
    });
  };

  root.querySelectorAll('.settings-toggle').forEach((input) => {
    input.addEventListener('change', () => {
      const key = input.dataset.setting;
      const value = !!input.checked;
      setAppState((s) => {
        s.meta = s.meta || {};
        s.meta[key] = value;
        return s;
      });
      applyDisplayPrefs();
      if (key === 'audioEnabled' && typeof tryPlayAudio === 'function') {
        if (value) {
          tryPlayAudio(true);
        } else if (typeof audioDeck !== 'undefined' && audioDeck && audioDeck.player) {
          audioDeck.player.pause();
        }
        if (typeof syncAudioDockUi === 'function') syncAudioDockUi();
      }
      setStatus(`${key} = ${value}`);
    });
  });

  const volSlider = root.querySelector('[data-setting="audioVolume"]');
  if (volSlider) {
    volSlider.addEventListener('input', () => {
      const v = Math.max(0, Math.min(1, Number(volSlider.value) / 100));
      const display = root.querySelector('[data-setting-display="audioVolume"]');
      if (display) display.textContent = `${Math.round(v * 100)}%`;
      setAppState((s) => {
        s.meta = s.meta || {};
        s.meta.audioVolume = v;
        return s;
      });
      if (typeof audioDeck !== 'undefined' && audioDeck && audioDeck.player) {
        audioDeck.player.volume = v;
      }
      if (typeof syncAudioDockUi === 'function') syncAudioDockUi();
    });
  }

  const uiVolSlider = root.querySelector('[data-setting="uiVolume"]');
  if (uiVolSlider) {
    uiVolSlider.addEventListener('input', () => {
      const v = Math.max(0, Math.min(1, Number(uiVolSlider.value) / 100));
      const display = root.querySelector('[data-setting-display="uiVolume"]');
      if (display) display.textContent = `${Math.round(v * 100)}%`;
      setAppState((s) => {
        s.meta = s.meta || {};
        s.meta.uiVolume = v;
        return s;
      });
    });
    // Preview a tap on release so the user hears the new level.
    uiVolSlider.addEventListener('change', () => {
      if (typeof PPalsFeedback !== 'undefined' && PPalsFeedback.SFX) {
        PPalsFeedback.SFX.tap();
      }
    });
  }

  const exportBtn = root.querySelector('[data-settings-export]');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY) || JSON.stringify(getState());
        const blob = new Blob([raw], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `ppals-save-${stamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus('save exported');
      } catch (err) {
        setStatus(`export failed: ${err.message}`);
      }
    });
  }

  const importBtn = root.querySelector('[data-settings-import]');
  const importInput = root.querySelector('[data-settings-import-input]');
  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          if (!parsed || typeof parsed !== 'object') throw new Error('invalid file');
          if (!confirm('Replace current save with imported file? This cannot be undone.')) {
            setStatus('import cancelled');
            importInput.value = '';
            return;
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          setStatus('save imported — reloading');
          setTimeout(() => window.location.reload(), 400);
        } catch (err) {
          setStatus(`import failed: ${err.message}`);
        }
        importInput.value = '';
      };
      reader.onerror = () => setStatus('import failed: read error');
      reader.readAsText(file);
    });
  }

  const resetBtn = root.querySelector('[data-settings-reset]');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const confirm1 = confirm('Reset ALL data? Pals, tasks, streaks, everything will be erased.');
      if (!confirm1) return;
      const confirm2 = confirm('Are you absolutely sure? This cannot be undone.');
      if (!confirm2) return;
      try {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem('ppals_audio_resume');
        setStatus('reset complete — reloading');
        setTimeout(() => window.location.replace('../index.html'), 400);
      } catch (err) {
        setStatus(`reset failed: ${err.message}`);
      }
    });
  }

  renderControls();
  applyDisplayPrefs();
}

window.addEventListener('DOMContentLoaded', () => {
  initDataTipSystem();
  applyDisplayPrefs();

  function injectDevToggle() {
    if (document.querySelector('#dev-toggle')) return;
    const btn = document.createElement('button');
    btn.id = 'dev-toggle';
    btn.textContent = 'DEV';
    btn.setAttribute('type', 'button');
    btn.style.cssText = 'position:fixed;bottom:80px;right:12px;z-index:9999;background:#ff3b3b;color:#fff;border:none;padding:6px 10px;font-size:10px;letter-spacing:2px;cursor:pointer;font-family:inherit;';
    btn.addEventListener('click', () => {
      navigateWithAudioResume('../pages/devtools.html');
    });
    document.body.appendChild(btn);
  }

  const page = document.body.dataset.page || inferCurrentPage();
  applySeasonalTheme(appState);
  initAudioSystem(page);

  // Re-parent the bottom nav to <body> so it shares the same stacking context
  // as the audio dock (which is also appended to <body> by initAudioSystem).
  // Without this, any ancestor with transform / filter / will-change /
  // backdrop-filter / contain / isolation creates a new containing block for
  // position:fixed and traps the nav inside the <main> stacking context — at
  // which point the body-level audio dock paints on top of it no matter what
  // z-index we use. Moving the nav to <body> guarantees nav (z=200) sits above
  // dock (z=50). Safe even if already a body child (no-op).
  document.querySelectorAll('.bottom-nav').forEach((nav) => {
    if (nav.parentElement !== document.body) {
      document.body.appendChild(nav);
    }
  });

  try {
    if (page === 'index') {
      routeFromIndex();
      return;
    }

    if (page === 'home') {
      initHomePage();
      return;
    }

    if (page === 'choose-pal') {
      initChoosePalPage();
      return;
    }

    if (page === 'care') {
      initCarePage();
      return;
    }

    if (page === 'habits') {
      initHabitsPage();
      return;
    }

    if (page === 'streak') {
      initStreakPage();
      return;
    }

    if (page === 'calendar') {
      initCalendarPage();
      return;
    }

    if (page === 'lab') {
      initLabPage();
      return;
    }

    if (page === 'collection') {
      initCollectionPage();
      return;
    }

    if (page === 'database') {
      initDatabasePage();
      return;
    }

    if (page === 'settings') {
      initSettingsPage();
      return;
    }

    if (page === 'onboarding') {
      initOnboardingPage();
    }
  } finally {
    injectDevToggle();
    injectSettingsGear();
    try { /* injectActivePalChip removed: portrait now lives in the .screen::before brand-corner box. */ } catch (err) { /* non-fatal */ }
    try { /* injectPalConstellation: now rendered in-place inside collection.html via renderConstellationMap. */ } catch (err) { /* non-fatal */ }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'D' && e.shiftKey) {
        navigateWithAudioResume('../pages/devtools.html');
      }
    });
  }
});
