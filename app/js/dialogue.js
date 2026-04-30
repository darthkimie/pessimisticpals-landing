function getPalDialogueScript(palId) {
  const fallbackPal = getPalById(palId) || getPalById('xio') || {
    id: 'xio',
    name: 'Xio',
    bio: 'Everything breaks eventually.',
  };
  const scriptedDialogue = typeof PAL_DIALOGUE !== 'undefined'
    ? PAL_DIALOGUE[fallbackPal.id] || PAL_DIALOGUE.xio
    : null;

  if (scriptedDialogue) {
    return scriptedDialogue;
  }

  const careScript = CARE_DIALOGUE[fallbackPal.id] || CARE_DIALOGUE.xio;
  const base = (careScript && careScript.idle) || fallbackPal.bio || `${fallbackPal.name} remains unconvinced.`;

  return {
    base,
    worse: `${fallbackPal.name} expected the decline and dislikes being correct.`,
    existing: `${fallbackPal.name} records that nothing improved. Appropriate.`,
    tolerable: `${fallbackPal.name} does not trust the better report, but keeps it on file.`,
  };
}

function getNeglectDialogue(pal) {
  return `${pal.name} has noticed the silence and filed it under expected behavior.`;
}

function getMoodImprovementDialogue(pal) {
  return `${pal.name} feels marginally better and resents the implication.`;
}

function getDisappointmentQuip(pal, rewardType, seasonalEvent) {
  const seasonalDialogue = seasonalEvent && seasonalEvent.palDialogue && pal
    ? seasonalEvent.palDialogue[pal.id]
    : null;
  const eventLine = seasonalDialogue && seasonalDialogue.reaction_line
    ? seasonalDialogue.reaction_line
    : seasonalEvent && Array.isArray(seasonalEvent.themed_dialogue_pool) && seasonalEvent.themed_dialogue_pool.length
      ? seasonalEvent.themed_dialogue_pool[randomInt(0, seasonalEvent.themed_dialogue_pool.length - 1)]
      : null;
  const activePalId = pal && pal.id ? pal.id : null;
  const voice = getPalDialogueScript(activePalId).base;
  const tails = {
    gloom_coins: 'A few Gloom Coins rolled out. The machine appears regretful.',
    xp: 'Experience was issued in trace amounts, like seasoning.',
    cosmetic_item: 'A cosmetic item emerged. Vanity remains an affordable symptom.',
    nothing: 'The oracle produced literally nothing and called it an interaction.',
  };

  return [eventLine, voice, tails[rewardType] || tails.nothing].filter(Boolean).join(' ');
}

function getCareDialogue(palId, reactionType) {
  const palDialogue = CARE_DIALOGUE[palId] || CARE_DIALOGUE.xio;
  return palDialogue[reactionType] || palDialogue.idle;
}

function getVisibleCareDialogue(state, pal, fallbackDialogue) {
  const activeDialogue = typeof state.care.dialogue === 'string' ? state.care.dialogue.trim() : '';
  const dialogueExpiry = typeof state.care.dialogueSilentUntil === 'number' ? state.care.dialogueSilentUntil : null;
  const isInterferenceDialogue = state.care.reactionType === 'interference' && activeDialogue;

  if (isInterferenceDialogue) {
    return dialogueExpiry && Date.now() < dialogueExpiry ? activeDialogue : fallbackDialogue;
  }

  if (dialogueExpiry && Date.now() < dialogueExpiry) {
    return '...';
  }

  return activeDialogue || fallbackDialogue || getCareDialogue((pal && pal.id) || 'xio', 'idle');
}

function getLabDialogue(palId, reactionType) {
  const palDialogue = LAB_DIALOGUE[palId] || LAB_DIALOGUE.xio;
  return palDialogue[reactionType] || palDialogue.idle;
}

function getReturnDialogue(palId) {
  var lines = {
    ahote: "Oh! You're back! I started three things while you were gone. Finished none of them.",
    brutus: "...you came back. I wasn't waiting. I was just here.",
    centrama: "I noticed you were gone. I noticed immediately. Are you okay? Is something wrong?",
    doolin: "Finally. Someone to witness my magnificence again.",
    elbjorg: "The perimeter held while you were gone. I checked twice.",
    veruca: "Almost thought you wouldn't come back. Almost.",
    winta: "I have SO much to tell you. Where were you? Why were you gone? Never mind, listen to this-",
    xio: "Don't explain. I don't need to know. Whatever. You're here now.",
    yun: "...oh. Hello. I was watching something. You can stay if you want.",
    zenji: "You were gone for exactly the number of days I expected. Welcome back.",
  };
  return lines[palId] || null;
}

function buildDialogue(pal, state) {
  var ledgerEntry = state.palMoodLedger[pal.id] || {};
  if (ledgerEntry.isReturningAfterAbsence) {
    var returnLine = getReturnDialogue(pal.id);
    if (returnLine) return returnLine;
  }

  const script = getPalDialogueScript(pal.id);
  const trustDialogue = typeof TRUST_DIALOGUE !== 'undefined' && TRUST_DIALOGUE[pal.id]
    ? TRUST_DIALOGUE[pal.id][getPalTrustTier(pal.id, state)]
    : null;
  const todayKey = getLocalDateKey();
  const mood = state.dailyCheckIn.date === todayKey ? state.dailyCheckIn.mood : null;
  const summary = getTaskSummary(getTaskConsoleEntries(state));
  const entry = state.palMoodLedger[pal.id] || getDefaultPalMoodEntry(pal.id);
  const relationshipMode = resolveRelationshipMode(entry);
  const relationalNeed = evaluatePalRelationalNeed(pal.id, state, todayKey);
  const baseLine = trustDialogue || script[mood] || script.base;
  const lines = [];

  if (relationshipMode === 'withdrawn') {
    return getWithdrawnDialogue(pal.id, entry);
  }

  if (relationshipMode === 'bonded') {
    lines.push(`${pal.name} has started acting like your return was expected.`);
  } else if (relationshipMode === 'invested') {
    lines.push(`${pal.name} is reluctantly tracking whether you mean well.`);
  } else if (relationshipMode === 'present') {
    lines.push(`${pal.name} has decided you are part of the room now.`);
  }

  lines.push(baseLine);

  if (relationalNeed && relationalNeed.isViolated && relationalNeed.message) {
    lines.push(relationalNeed.message);
  }

  if (pal.pessimism >= 7 && summary.remaining > 0) {
    lines.push(`${summary.remaining} unfinished task${summary.remaining === 1 ? '' : 's'} remain. They have noticed you.`);
  }

  if (pal.pessimism >= 7 && state.streak > 0) {
    lines.push(`Your streak has reached ${state.streak}. Persistence is a controlled form of damage.`);
  } else if (pal.luck >= 9 && state.luckdust > 0) {
    lines.push(`Luckdust count: ${state.luckdust}. Probability has become irritatingly visible.`);
  }

  return lines.join(' ');
}

function getActiveSeasonalEvent(state) {
  return getSeasonalEventById(state.seasonalEvent.activeEventId);
}

function getSeasonalEventLines(event, palId) {
  const palLines = event && event.palDialogue && palId ? event.palDialogue[palId] : null;
  return {
    banner_line: palLines && palLines.banner_line
      ? palLines.banner_line
      : event && Array.isArray(event.themed_dialogue_pool) && event.themed_dialogue_pool[0]
        ? event.themed_dialogue_pool[0]
        : 'The calendar has become opinionated again.',
    reaction_line: palLines && palLines.reaction_line
      ? palLines.reaction_line
      : event && Array.isArray(event.themed_dialogue_pool) && event.themed_dialogue_pool[1]
        ? event.themed_dialogue_pool[1]
        : 'The event is active. Expectations should stay defensive.',
  };
}