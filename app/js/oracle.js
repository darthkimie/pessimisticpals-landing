function buildDynamicOracle(state) {
  if (state && state.palMoodLedger && state.palMoodLedger[state.activePal]
      && state.palMoodLedger[state.activePal].isGhost) {
    return [];
  }

  if (!state || !state.activePal) {
    return ORACLE_SEGMENTS.map((segment) => ({ ...segment }));
  }

  var pal = getPalById(state.activePal);
  var palId = state.activePal;
  var ledger = (state.palMoodLedger && state.palMoodLedger[palId]) || {};
  var mood = ledger.mood || 50;
  var plague = ledger.plague || 0;
  var trust = ledger.trust || 50;
  var streak = state.streak || 0;
  var neglectDays = ledger.neglectDays || 0;

  var segments = ORACLE_SEGMENTS.map(function(segment) {
    return { ...segment };
  });

  if (mood > 60) {
    var idx = segments.findIndex(function(s) { return s.id === 'nothing_2'; });
    if (idx > -1) segments[idx] = { id: 'luckdust_bonus', label: '+1 Luckdust', type: 'luckdust', amount: 1 };
  }

  if (mood < 30) {
    var idx2 = segments.findIndex(function(s) { return s.id === 'gloom_2'; });
    if (idx2 > -1) segments[idx2] = { id: 'nothing_3', label: 'Nothing', type: 'nothing', amount: 0 };
  }

  if (plague > 50) {
    var idx3 = segments.findIndex(function(s) { return s.id === 'gloom_4'; });
    if (idx3 > -1) segments[idx3] = { id: 'plague_2', label: 'Plague', type: 'plague', amount: 0 };
  }

  if (streak >= 7) {
    var idx4 = segments.findIndex(function(s) { return s.id === 'luckdust_1'; });
    if (idx4 > -1) segments[idx4] = { id: 'luckdust_3', label: '+3 Luckdust', type: 'luckdust', amount: 3 };
  }

  if (trust >= 80 && pal && pal.uniqueOracleSegment) {
    var idx5 = segments.findIndex(function(s) { return s.type === 'nothing'; });
    if (idx5 > -1) segments[idx5] = { id: pal.uniqueOracleSegment.id, label: pal.uniqueOracleSegment.label, type: 'unique', amount: 0, effect: pal.uniqueOracleSegment.effect };
  }

  if (neglectDays >= 3) {
    segments = segments.map(function(s) {
      if (s.type === 'luckdust') return { id: 'neglect_' + s.id, label: 'Nothing', type: 'nothing', amount: 0 };
      return s;
    });
    var idx6 = segments.findIndex(function(s) { return s.id === 'gloom_2' || s.id === 'nothing_3'; });
    if (idx6 > -1) segments[idx6] = { id: 'plague_neglect', label: 'Plague', type: 'plague', amount: 0 };
  }

  return segments;
}

function getPositiveOracleWeight(segment, pal) {
  const luckFactor = pal ? pal.luck / 10 : 0.1;

  if (segment.type === 'gloom') {
    return 0.45 + luckFactor;
  }

  if (segment.type === 'luckdust') {
    return 0.2 + luckFactor * 0.8;
  }

  return 1;
}

function getNegativeOracleWeight(segment, pal) {
  const pessimismFactor = pal ? pal.pessimism / 10 : 0.1;

  if (segment.type === 'plague') {
    return 0.35 + pessimismFactor;
  }

  if (segment.type === 'nothing') {
    return 0.55 + pessimismFactor * 0.8;
  }

  return 1;
}

function pickOracleSegment(pal, segments, options = {}) {
  const guaranteedSafe = Boolean(options.guaranteedSafe);
  let candidates = Array.isArray(segments) ? segments.slice() : [];

  if (guaranteedSafe) {
    candidates = candidates.filter((segment) => segment.type !== 'plague' && segment.type !== 'nothing');
    if (!candidates.length) {
      candidates = segments.filter((segment) => segment.type !== 'plague');
    }
  }

  if (!candidates.length) {
    return null;
  }

  const weights = candidates.map((segment) => {
    if (segment.type === 'gloom' || segment.type === 'luckdust' || segment.type === 'unique') {
      return getPositiveOracleWeight(segment, pal);
    }

    if (segment.type === 'nothing' || segment.type === 'plague') {
      return getNegativeOracleWeight(segment, pal);
    }

    return 1;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  if (totalWeight <= 0) {
    return candidates[0];
  }

  let roll = Math.random() * totalWeight;
  for (let index = 0; index < candidates.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) {
      return candidates[index];
    }
  }

  return candidates[candidates.length - 1];
}