function getCalendarCompletionEntry(state, eventId, dateKey) {
  return Array.isArray(state.calendar && state.calendar.completionLog)
    ? state.calendar.completionLog.find((entry) => entry.eventId === eventId && entry.date === dateKey) || null
    : null;
}

function getCalendarOverdueOccurrences(state, referenceDate = new Date(), lookbackDays = 7) {
  const overdue = [];

  for (let offset = lookbackDays; offset >= 0; offset -= 1) {
    const date = new Date(referenceDate);
    date.setDate(referenceDate.getDate() - offset);
    const dateKey = getLocalDateKey(date);

    getCalendarOccurrencesForDate(state.calendar.events, dateKey).forEach((occurrence) => {
      if (isCalendarOccurrenceComplete(state, occurrence.id, dateKey)) {
        return;
      }

      if (getCalendarOccurrenceStatus(occurrence, referenceDate) === 'overdue') {
        overdue.push(occurrence);
      }
    });
  }

  return overdue.sort((left, right) => left.occurrenceDate.localeCompare(right.occurrenceDate));
}

function getTaskConsoleEntries(state, referenceDate = new Date()) {
  // Calendar events are intentionally NOT merged into the task console.
  // Tasks live on the Task Console; calendar events live on the Schedule.
  // Calendar pressure (overdue mood penalties, dialogue) is handled separately
  // via getCalendarPressureSnapshot / applyCalendarOverduePressure.
  return state.tasks.map((task) => ({
    ...task,
    source: task.source || 'manual',
    status: task.completed ? 'complete' : 'open',
  }));
}

function getCalendarPressureSnapshot(state, referenceDate = new Date()) {
  const overdueOccurrences = getCalendarOverdueOccurrences(state, referenceDate, 7);
  const nextOccurrence = getNextCalendarOccurrence(state, referenceDate, 14);

  return {
    overdueOccurrences,
    overdueCount: overdueOccurrences.length,
    overdueLoad: overdueOccurrences.reduce((sum, occurrence) => sum + getCalendarEventLoad(occurrence), 0),
    oldestOverdue: overdueOccurrences[0] || null,
    nextOccurrence,
    nextStatus: nextOccurrence ? getCalendarOccurrenceStatus(nextOccurrence, referenceDate) : null,
  };
}

function getCalendarInterferenceState(state, palId, referenceDate = new Date()) {
  const seasonalEvent = getActiveSeasonalEvent(state);
  if (seasonalEvent) {
    const seasonalLines = getSeasonalEventLines(seasonalEvent, palId);
    return {
      token: (seasonalEvent.theme_token || 'default').toUpperCase(),
      headline: seasonalLines.banner_line,
      detail: seasonalLines.reaction_line,
    };
  }

  const pressure = getCalendarPressureSnapshot(state, referenceDate);
  if (pressure.overdueCount > 0) {
    const reaction = getCalendarDialogueLine(palId || 'xio', 'overdue', `interference:${getLocalDateKey(referenceDate)}:${pressure.overdueCount}`);
    const headline = pressure.overdueCount === 1
      ? `${pressure.oldestOverdue.title} slipped past its orbit window.`
      : `${pressure.overdueCount} orbit items are overdue and degrading the atmosphere.`;
    const detail = pressure.oldestOverdue
      ? `${reaction} Oldest unresolved: ${pressure.oldestOverdue.title} from ${pressure.oldestOverdue.occurrenceDate}.`
      : reaction;

    return {
      token: 'OVERDUE',
      headline,
      detail,
    };
  }

  if (pressure.nextOccurrence) {
    const reactionType = pressure.nextStatus === 'soon'
      ? 'reminderSoon'
      : getCalendarCategoryMeta(pressure.nextOccurrence.category).reactionType;
    const reaction = getCalendarDialogueLine(palId || 'xio', reactionType, `interference:${pressure.nextOccurrence.id}:${pressure.nextOccurrence.occurrenceDate}`);

    return {
      token: 'ORBIT',
      headline: `Next scheduled disturbance: ${pressure.nextOccurrence.title}.`,
      detail: `${reaction} ${pressure.nextOccurrence.occurrenceDate} // ${formatCalendarTimeLabel(pressure.nextOccurrence)}.`,
    };
  }

  return {
    token: 'DEFAULT',
    headline: 'No active event. The ordinary atmosphere remains in charge.',
    detail: 'The calendar has not scheduled any additional nonsense.',
  };
}

function applyCalendarOverduePressure(state, referenceDate = new Date()) {
  const pal = getPalById(state.activePal);
  if (!pal || !state.palMoodLedger[pal.id]) {
    return state;
  }

  const pressure = getCalendarPressureSnapshot(state, referenceDate);
  if (!pressure.overdueCount) {
    return state;
  }

  const moodPenalty = Math.min(5, pressure.overdueCount + Math.floor(pressure.overdueLoad / 10));
  const needMoodPenalty = Math.min(12, pressure.overdueCount * 2 + Math.floor(pressure.overdueLoad / 8));
  const boredomPenalty = Math.min(10, pressure.overdueCount + Math.floor(pressure.overdueLoad / 12));
  const reaction = getCalendarDialogueLine(pal.id, 'overdue', `care-pressure:${getLocalDateKey(referenceDate)}:${pressure.overdueCount}`);
  const pressureNote = pressure.overdueCount === 1
    ? '1 overdue orbit item is draining care reserves.'
    : `${pressure.overdueCount} overdue orbit items are draining care reserves.`;

  return {
    ...state,
    needs: normalizeNeeds({
      ...state.needs,
      mood: state.needs.mood - needMoodPenalty,
      boredom: state.needs.boredom - boredomPenalty,
    }),
    care: {
      ...state.care,
      reactionType: 'calendar_overdue',
      dialogue: `${reaction} ${pressureNote}`,
    },
    palMoodLedger: {
      ...state.palMoodLedger,
      [pal.id]: {
        ...state.palMoodLedger[pal.id],
        mood: clampNumber(state.palMoodLedger[pal.id].mood - moodPenalty, 0, MAX_RELUCTANT_MOOD),
        latestReaction: `${reaction} ${pressureNote}`,
      },
    },
  };
}

function getCalendarMonthOccurrenceCount(events, monthKey) {
  return buildCalendarMonthGrid(monthKey, events, `${monthKey}-01`)
    .filter((entry) => entry.isCurrentMonth)
    .reduce((sum, entry) => sum + entry.eventCount, 0);
}

function getNextCalendarOccurrence(state, referenceDate = new Date(), searchDays = 30) {
  for (let offset = 0; offset <= searchDays; offset += 1) {
    const date = new Date(referenceDate);
    date.setDate(referenceDate.getDate() + offset);
    const dateKey = getLocalDateKey(date);
    const match = getCalendarOccurrencesForDate(state.calendar.events, dateKey)
      .find((event) => !isCalendarOccurrenceComplete(state, event.id, dateKey));

    if (match) {
      return {
        ...match,
        occurrenceDate: dateKey,
      };
    }
  }

  return null;
}

function formatSignedDelta(value) {
  if (!value) {
    return '0';
  }

  return value > 0 ? `+${value}` : String(value);
}

function buildCalendarImpactSummary(impact) {
  const summaryParts = [];

  if (impact.gloomDelta) {
    summaryParts.push(`${formatSignedDelta(impact.gloomDelta)} Gloom`);
  }

  if (impact.xpDelta) {
    summaryParts.push(`${formatSignedDelta(impact.xpDelta)} XP`);
  }

  if (impact.moodDelta) {
    summaryParts.push(`${formatSignedDelta(impact.moodDelta)} Mood`);
  }

  return summaryParts.join(' // ');
}

function getCalendarRewardCopy(template, moodDelta) {
  if (!template || !template.rewardCopy) {
    return '';
  }

  if (moodDelta > 0) {
    return template.rewardCopy.positive || '';
  }

  if (moodDelta < 0) {
    return template.rewardCopy.negative || '';
  }

  return template.rewardCopy.neutral || '';
}

function getCalendarCompletionCopy(template, moodDelta) {
  if (!template || !template.completionCopy) {
    return '';
  }

  if (moodDelta > 0) {
    return template.completionCopy.positive || '';
  }

  if (moodDelta < 0) {
    return template.completionCopy.negative || '';
  }

  return template.completionCopy.neutral || '';
}

function calculateCalendarPalImpact(pal, event, actionType) {
  const template = pal ? getCalendarPalTemplate(pal.id) : null;

  if (!template) {
    return {
      gloomDelta: 0,
      xpDelta: 0,
      moodDelta: 0,
      summary: '',
      rewardCopy: '',
    };
  }

  const actionImpact = template.actions && template.actions[actionType] ? template.actions[actionType] : { gloom: 0, xp: 0, mood: 0 };
  const categoryImpact = template.categories && template.categories[event.category] ? template.categories[event.category] : { gloom: 0, xp: 0, mood: 0 };
  let moodDelta = Number(actionImpact.mood || 0) + Number(categoryImpact.mood || 0);
  const gloomDelta = Number(actionImpact.gloom || 0) + Number(categoryImpact.gloom || 0);
  const xpDelta = Number(actionImpact.xp || 0) + Number(categoryImpact.xp || 0);

  if (template.highLoadPenalty) {
    const dreadThreshold = Number(template.highLoadPenalty.dreadThreshold || 99);
    const energyThreshold = Number(template.highLoadPenalty.energyThreshold || 99);
    const penalty = Number(template.highLoadPenalty.mood || 0);

    if (Number(event.dreadLevel || 0) >= dreadThreshold) {
      moodDelta += penalty;
    }

    if (Number(event.energyCost || 0) >= energyThreshold) {
      moodDelta += penalty;
    }
  }

  return {
    gloomDelta,
    xpDelta,
    moodDelta,
    summary: buildCalendarImpactSummary({ gloomDelta, xpDelta, moodDelta }),
    rewardCopy: actionType === 'completed'
      ? getCalendarCompletionCopy(template, moodDelta)
      : getCalendarRewardCopy(template, moodDelta),
  };
}

function applyCalendarPalImpact(state, pal, event, actionType, latestReaction) {
  const impact = calculateCalendarPalImpact(pal, event, actionType);

  // Anti-abuse: cap positive gloom from calendar to one per day across all events.
  const todayKey = getLocalDateKey();
  const alreadyRewardedToday = state && state.meta && state.meta.lastCalendarRewardDate === todayKey;
  let appliedGloomDelta = impact.gloomDelta;
  let claimedReward = false;
  if (appliedGloomDelta > 0) {
    if (alreadyRewardedToday) {
      appliedGloomDelta = 0;
    } else {
      claimedReward = true;
    }
  }

  if (!pal || (!appliedGloomDelta && !impact.xpDelta && !impact.moodDelta)) {
    return {
      nextState: state,
      impact: { ...impact, gloomDelta: appliedGloomDelta },
    };
  }

  let nextState = {
    ...state,
    gloom: Math.max(0, state.gloom + appliedGloomDelta),
    xp: Math.max(0, state.xp + impact.xpDelta),
  };

  if (claimedReward) {
    nextState = {
      ...nextState,
      meta: {
        ...nextState.meta,
        lastCalendarRewardDate: todayKey,
      },
    };
  }

  if (nextState.palMoodLedger && nextState.palMoodLedger[pal.id]) {
    nextState = {
      ...nextState,
      palMoodLedger: {
        ...nextState.palMoodLedger,
        [pal.id]: {
          ...nextState.palMoodLedger[pal.id],
          mood: clampNumber(nextState.palMoodLedger[pal.id].mood + impact.moodDelta, 0, MAX_RELUCTANT_MOOD),
          latestReaction: latestReaction || nextState.palMoodLedger[pal.id].latestReaction,
        },
      },
    };
  }

  const finalImpact = appliedGloomDelta === impact.gloomDelta
    ? impact
    : {
      ...impact,
      gloomDelta: appliedGloomDelta,
      summary: buildCalendarImpactSummary({ gloomDelta: appliedGloomDelta, xpDelta: impact.xpDelta, moodDelta: impact.moodDelta }),
    };

  return {
    nextState,
    impact: finalImpact,
  };
}

function applyCalendarCompletionLinks(previousState, currentState, pal, event, latestReaction) {
  const template = pal ? getCalendarPalTemplate(pal.id) : null;
  if (!template || !template.streakLink) {
    return {
      nextState: currentState,
      bonusMessage: '',
    };
  }

  let nextState = currentState;
  const todayKey = getLocalDateKey();
  const messages = [];

  if (template.streakLink.logsHabit && !nextState.habitHistory[todayKey]) {
    nextState = {
      ...nextState,
      habitHistory: {
        ...nextState.habitHistory,
        [todayKey]: true,
      },
    };
    messages.push('Routine ledger updated for today.');
  }

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
    messages.push(`Primary streak advanced to ${String(streakAdvance.nextStreak).padStart(2, '0')}.`);
    if (streakAdvance.luckdustReward) {
      messages.push(`Streak reward issued: ${streakAdvance.luckdustReward} Luckdust.`);
    }
  }

  const milestoneEvery = Number(template.streakLink.milestoneEvery || 0);
  if (milestoneEvery > 0) {
    const beforeMilestones = getCalendarCompletionMilestoneCount(previousState, milestoneEvery);
    const afterMilestones = getCalendarCompletionMilestoneCount(nextState, milestoneEvery);

    if (afterMilestones > beforeMilestones) {
      const seasonalEvent = getSeasonalEventById(nextState.seasonalEvent.activeEventId);
      const blueprint = chooseItemBlueprint(template.streakLink.milestoneSource || 'streak', seasonalEvent);
      if (blueprint) {
        nextState = awardInventoryItem(nextState, blueprint, {
          source: 'calendar_completion',
          event_id: seasonalEvent ? seasonalEvent.event_id : null,
        });
        messages.push(`Milestone relic logged: ${blueprint.name}.`);
      }
    }
  }

  if (pal && nextState.palMoodLedger && nextState.palMoodLedger[pal.id]) {
    nextState = {
      ...nextState,
      palMoodLedger: {
        ...nextState.palMoodLedger,
        [pal.id]: {
          ...nextState.palMoodLedger[pal.id],
          latestReaction: latestReaction || nextState.palMoodLedger[pal.id].latestReaction,
        },
      },
    };
  }

  return {
    nextState,
    bonusMessage: messages.join(' '),
  };
}