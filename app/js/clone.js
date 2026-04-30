function getCloneDurationMs(pal, state) {
  const duration = CLONE_CYCLE_BASE_MS + ((pal && pal.mutationRisk) || 1) * CLONE_CYCLE_STEP_MS;
  if (state && state.constellations && state.constellations.xio) {
    return duration * 0.75;
  }
  return duration;
}

function getDefaultClonePair(state) {
  const livingOwned = (state.ownedPals || []).filter((palId) => {
    const pal = getPalById(palId);
    const ledgerEntry = state.palMoodLedger && state.palMoodLedger[palId];
    return pal && !pal.placeholder && !(ledgerEntry && ledgerEntry.isDead);
  });
  const palA = livingOwned.includes(state.activePal) ? state.activePal : (livingOwned[0] || state.activePal || null);
  const palB = livingOwned.find((palId) => palId !== palA) || palA || null;
  return { palA, palB };
}

function getMutationTier(pal, context = {}) {
  const { compatScore, partnerPal } = context;
  const voidCondition = compatScore !== undefined
    && compatScore <= COMPATIBILITY_MINIMUM_TO_CLONE + 2
    && pal && (pal.pessimism || 0) >= 6
    && partnerPal && (partnerPal.pessimism || 0) >= 6;

  if (voidCondition && Math.random() < 0.35) return 'void';

  const risk = pal ? pal.mutationRisk : 1;
  const roll = Math.random() * 10 + risk * 0.7;

  if (roll >= 12) {
    return 'severe';
  }

  if (roll >= 8) {
    return 'major';
  }

  if (roll >= 5) {
    return 'minor';
  }

  return 'stable';
}

const CLONE_TRAIT_KEYS = ['color', 'nose', 'eyes', 'pattern', 'arms', 'ears', 'tail', 'mouth', 'legs', 'hair'];

function getEmptySequenceCounts() {
  return Object.fromEntries(PALS.map((pal) => [pal.id, 0]));
}

function baseSequenceForPal(palId) {
  const counts = getEmptySequenceCounts();
  counts[palId] = 1;
  return counts;
}

function combineSequenceCounts(dominantCounts, baseCounts) {
  const combined = getEmptySequenceCounts();
  for (const palId of Object.keys(combined)) {
    combined[palId] = (dominantCounts[palId] || 0) + (baseCounts[palId] || 0);
  }
  return combined;
}

function sequenceCountsToString(counts) {
  return CLONE_CODE_REGISTRY
    .filter((entry) => counts[entry.palId] > 0)
    .map((entry) => entry.letter.repeat(entry.letterWidth * counts[entry.palId]))
    .join('');
}

function getDominantPalId(sequenceCounts) {
  for (const entry of CLONE_CODE_REGISTRY) {
    if (sequenceCounts[entry.palId] > 0) {
      return entry.palId;
    }
  }

  return null;
}

function getNewTraitCount(combinedCounts) {
  const uniqueLetters = Object.values(combinedCounts).filter(function(v) { return v > 0; }).length;
  return Math.max(1, uniqueLetters);
}

function resolveCloneTraits(dominantTraits, basePalId, newTraitCount, compatScore = 0) {
  const traits = { ...dominantTraits };
  const changedTraitKeys = [];
  const isHighCompat = compatScore >= COMPATIBILITY_HIGH_THRESHOLD;
  const isLowCompat = compatScore < COMPATIBILITY_MINIMUM_TO_CLONE + 3;
  const inheritSource = (!isHighCompat && isLowCompat && Math.random() < 0.4)
    ? (typeof PALS !== 'undefined' ? PALS[Math.floor(Math.random() * PALS.length)] : null)
    : null;
  const sourceTraits = inheritSource
    ? (PAL_TRAITS[inheritSource.id] || {})
    : (PAL_TRAITS[basePalId] || {});

  for (const key of CLONE_TRAIT_KEYS) {
    if (changedTraitKeys.length >= newTraitCount) {
      break;
    }

    if (sourceTraits[key] && sourceTraits[key] !== 'TBD') {
      traits[key] = sourceTraits[key];
      changedTraitKeys.push(key);
    }
  }

  return { traits, changedTraitKeys };
}

function resolveVoidFractureTraits() {
  const traits = {};
  CLONE_TRAIT_KEYS.forEach((key) => {
    const randomPal = typeof PALS !== 'undefined'
      ? PALS[Math.floor(Math.random() * PALS.length)]
      : null;
    const source = randomPal ? (PAL_TRAITS[randomPal.id] || {}) : {};
    traits[key] = (source[key] && source[key] !== 'TBD') ? source[key] : 'unknown';
  });
  return { traits, changedTraitKeys: [...CLONE_TRAIT_KEYS] };
}

function buildCloneVariant(dominantParent, basePalId, compatScore = 0, partnerPalId = null) {
  const basePal = getPalById(basePalId);
  if (!basePal) {
    return null;
  }
  const partnerPal = getPalById(partnerPalId);

  const dominantCounts = dominantParent && dominantParent.sequence
    ? dominantParent.sequence
    : getEmptySequenceCounts();
  const baseCounts = baseSequenceForPal(basePalId);
  const combinedCounts = combineSequenceCounts(dominantCounts, baseCounts);
  const sequenceString = sequenceCountsToString(combinedCounts);
  const generation = dominantParent ? (dominantParent.generation || 0) + 1 : 1;
  const previousTraitsChanged = dominantParent ? (dominantParent.traitsChanged || 0) : 0;
  const newTraitCount = getNewTraitCount(combinedCounts);
  const traitsChanged = previousTraitsChanged + newTraitCount;
  const parentASequenceString = dominantParent && dominantParent.sequenceString
    ? dominantParent.sequenceString
    : sequenceCountsToString(baseSequenceForPal(partnerPalId || basePalId));
  const parentBSequenceString = sequenceCountsToString(baseCounts);
  const dominantPalId = getDominantPalId(combinedCounts);
  const dominantBaseTraits = PAL_TRAITS[dominantPalId] || {};
  const dominantParentTraits = dominantParent && dominantParent.traits
    ? dominantParent.traits
    : dominantBaseTraits;
  const tier = getMutationTier(basePal, { compatScore, partnerPal });
  const { traits, changedTraitKeys } = tier === 'void'
    ? resolveVoidFractureTraits()
    : resolveCloneTraits(dominantParentTraits, basePalId, newTraitCount, compatScore);
  const VARIANT_LABELS = {
    stable: 'STABLE ECHO',
    minor: 'HAIRLINE DRIFT',
    major: 'SPITE BLOOM',
    severe: 'SEVERE VARIANCE',
    void: 'VOID FRACTURE',
  };
  const VARIANT_NOTES = {
    stable: 'The clone appears nearly compliant. Suspicious restraint.',
    minor: 'Small divergences have appeared where certainty used to be.',
    major: 'The clone has committed to several visible disagreements.',
    severe: 'Mutation has taken the helm and driven into aesthetics.',
    void: 'Neither parent is responsible for this. The sequence is on its own now.',
  };

  return {
    id: createId('clone'),
    createdAt: Date.now(),
    cloneName: null,
    sequence: combinedCounts,
    sequenceString,
    parentASequenceString,
    parentBSequenceString,
    traitsChanged,
    generation,
    dominantParentId: dominantParent ? (dominantParent.id || null) : null,
    basePalId,
    dominantPalId,
    traits,
    changedTraitKeys,
    sourcePalId: basePalId,
    sourcePalName: basePal.name,
    palColor: basePal.color,
    tier,
    label: VARIANT_LABELS[tier],
    note: VARIANT_NOTES[tier],
  };
}

function getActiveClone(state) {
  if (!state.activeCloneId) return null;
  return (state.clone.history || []).find(
    (entry) => entry.id === state.activeCloneId
  ) || null;
}

function getCloneRarity(clone, state) {
  if (!clone) return 'common';
  if (clone.tier === 'void') return 'cursed';
  const gen = clone.generation || 1;
  const palCount = Object.values(clone.sequence || {}).filter((v) => v > 0).length;

  const deathRecord = (state && state.deathRecord) || [];
  const deadIds = new Set(deathRecord.map((d) => d.palId));
  const hasDeadParent = Object.entries(clone.sequence || {}).some(
    ([palId, count]) => count > 0 && deadIds.has(palId)
  );

  let rarity = 'common';
  if (hasDeadParent || gen >= 6) {
    rarity = 'cursed';
  } else if (gen >= 4 || palCount >= 3) {
    rarity = 'rare';
  } else if (gen >= 2) {
    rarity = 'uncommon';
  }

  if (rarity === 'common' && state && state.constellations && state.constellations.zenji) {
    return 'uncommon';
  }

  return rarity;
}

function getCloneGloomBonus(state) {
  // V1.0: cloning is not yet shipped to users. Bonus disabled.
  return 0;
}

function _disabled_getCloneGloomBonus(state) {
  const activeClone = getActiveClone(state);
  const rarity = getCloneRarity(activeClone, state);
  const baseBonus = {
    common: 0,
    uncommon: 1,
    rare: 2,
    cursed: 3,
  }[rarity] || 0;
  return baseBonus + ((state && state.constellations && state.constellations.ahote) ? 1 : 0);
}

function getCloneSubtitleText(activeClone, state) {
  if (!activeClone || !activeClone.sequenceString) {
    return '';
  }

  const nameDisplay = activeClone.cloneName
    ? `${activeClone.cloneName} · ${activeClone.sequenceString}${activeClone.traitsChanged || 0} · Gen ${activeClone.generation || 1}`
    : `${activeClone.sequenceString}${activeClone.traitsChanged || 0} · Gen ${activeClone.generation || 1}`;

  if (
    state
    && state.constellations
    && state.constellations.veruca
    && activeClone.traits
    && Array.isArray(activeClone.parentIds)
    && activeClone.parentIds.length === 2
  ) {
    const traitLine = Object.entries(activeClone.traits || {})
      .map(([key, value]) => `${key}: ${value}`)
      .join(' · ');
    return traitLine ? `${nameDisplay} · ${traitLine}` : nameDisplay;
  }

  return nameDisplay;
}

function getCloneStatusLabel(state) {
  if (state.clone.activeCycle) {
    return 'Cycle Running';
  }

  if (state.clone.revealedVariant) {
    return 'Reveal Available';
  }

  return 'Chamber Idle';
}

function formatCountdown(msRemaining) {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function resolveCloneCycle(state, now = Date.now()) {
  const cycle = state.clone.activeCycle;
  if (!cycle || now < cycle.endsAt) {
    return state;
  }

  const pal = getPalById(cycle.sourcePalId || state.activePal);
  if (!pal) {
    return {
      ...state,
      clone: {
        ...state.clone,
        activeCycle: null,
      },
    };
  }

  const dominantParent = (state.clone.history && state.clone.history.length > 0)
    ? state.clone.history[0]
    : null;
  const basePalId = (cycle.basePalId) || state.activePal;
  const variant = buildCloneVariant(dominantParent, basePalId, cycle.compatScore || 0, cycle.sourcePalId || null);
  let nextState = {
    ...state,
    unlockedPals: [...new Set([...(state.unlockedPals || []), pal.id])],
    clone: {
      ...state.clone,
      activeCycle: null,
      revealedVariant: variant,
      history: [variant, ...(state.clone.history || [])].slice(0, 12),
      dialogue: getLabDialogue(pal.id, 'ready'),
    },
  };

  const isFirstDivergence = !state.meta.firstDivergenceDate
    && variant && (variant.generation || 0) >= 2;

  if (isFirstDivergence) {
    nextState = {
      ...nextState,
      meta: {
        ...nextState.meta,
        firstDivergenceDate: getLocalDateKey(),
      },
    };
    nextState = unlockAntiAchievement(nextState, 'first_divergence', getLocalDateKey());
  }

  return nextState;
}