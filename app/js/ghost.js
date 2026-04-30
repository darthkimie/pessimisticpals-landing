function checkGhostState(state) {
  var palId = state.activePal;
  if (!palId) return state;
  var ledger = state.palMoodLedger || {};
  var entry = ledger[palId];
  if (!entry || entry.isGhost || entry.isDead) return state;

  var shouldGhost = entry.mood <= GHOST_THRESHOLD_MOOD
    || entry.hunger <= (100 - GHOST_THRESHOLD_HUNGER);

  if (!shouldGhost) return state;

  var nextLedger = JSON.parse(JSON.stringify(ledger));
  nextLedger[palId].isGhost = true;
  nextLedger[palId].ghostEnteredDate = getLocalDateKey();

  var nextState = Object.assign({}, state, { palMoodLedger: nextLedger });
  if (typeof appendActivityToState === 'function') {
    var pal = (typeof getPalById === 'function') ? getPalById(palId) : null;
    nextState = appendActivityToState(nextState, {
      palId: palId,
      type: 'ghost',
      system: (pal ? pal.name : palId) + ' slipped into ghost form.',
      quote: 'Mood and hunger collapsed past the threshold.',
      link: 'care',
    });
  }
  return nextState;
}

function cureGhostState(state) {
  var palId = state.activePal;
  if (!palId) return state;
  var ledger = state.palMoodLedger || {};
  var entry = ledger[palId];
  if (!entry || !entry.isGhost) return state;

  if (state.gloom < GHOST_CURE_GLOOM
    || state.luckdust < GHOST_CURE_LUCKDUST) {
    return state;
  }

  var nextLedger = JSON.parse(JSON.stringify(ledger));
  nextLedger[palId].isGhost = false;
  nextLedger[palId].ghostEnteredDate = null;
  nextLedger[palId].mood = 40;
  nextLedger[palId].hunger = 60;
  nextLedger[palId].boredom = 50;
  nextLedger[palId].plague = 0;

  var revivedState = Object.assign({}, state, {
    palMoodLedger: nextLedger,
    needs: normalizeNeeds({
      hunger: 60,
      boredom: 50,
      mood: 40,
      plague: 0,
    }),
    plagued: false,
    gloom: state.gloom - GHOST_CURE_GLOOM,
    luckdust: state.luckdust - GHOST_CURE_LUCKDUST,
  });
  if (typeof appendActivityToState === 'function') {
    var pal = (typeof getPalById === 'function') ? getPalById(palId) : null;
    revivedState = appendActivityToState(revivedState, {
      palId: palId,
      type: 'revive',
      system: (pal ? pal.name : palId) + ' returned from ghost form.',
      quote: 'Care, gloom, and luckdust pulled them back.',
      deltas: { gloom: -GHOST_CURE_GLOOM, luckdust: -GHOST_CURE_LUCKDUST },
      link: 'care',
    });
  }
  return revivedState;
}

function getCareCostMultiplier(state) {
  var palId = state && state.activePal;
  var entry = palId && state && state.palMoodLedger ? state.palMoodLedger[palId] : null;
  return entry && entry.isGhost ? GHOST_CARE_COST_MULTIPLIER : 1;
}

function getAdjustedCareActionCost(actionKey, state) {
  var action = CARE_ACTIONS[actionKey];
  if (!action) {
    return 0;
  }

  return action.cost * getCareCostMultiplier(state);
}

function getAdjustedPlagueCureCosts(state) {
  var multiplier = getCareCostMultiplier(state);
  return {
    1: { gloom: PLAGUE_CURE_STAGE_1_GLOOM * multiplier, luckdust: 0, trust: 0 },
    2: { gloom: PLAGUE_CURE_STAGE_2_GLOOM * multiplier, luckdust: PLAGUE_CURE_STAGE_2_LUCKDUST * multiplier, trust: 0 },
    3: { gloom: PLAGUE_CURE_STAGE_3_GLOOM * multiplier, luckdust: PLAGUE_CURE_STAGE_3_LUCKDUST * multiplier, trust: PLAGUE_CURE_STAGE_3_TRUST_MIN },
  };
}

function getGhostBannerHtml(state) {
  var activeLedger = (state.palMoodLedger || {})[state.activePal] || {};
  if (!activeLedger.isGhost) {
    return '';
  }

  var canCure = state.gloom >= GHOST_CURE_GLOOM && state.luckdust >= GHOST_CURE_LUCKDUST;
  return '<div class="ghost-banner" data-ghost-banner>'
    + '<p>SIGNAL LOST - PAL IN GHOST STATE</p>'
    + '<p style="font-size:11px;margin-top:4px;color:var(--text-dim)">'
    + 'Cure cost: ' + GHOST_CURE_GLOOM + ' Gloom + '
    + GHOST_CURE_LUCKDUST + ' Luckdust</p>'
    + '<button class="ghost-cure-btn" '
    + (canCure ? '' : 'disabled')
    + ' data-ghost-cure>ATTEMPT RESTORATION</button>'
    + '</div>';
}

function syncGhostBanner(root, ghostHtml) {
  if (!root) {
    return;
  }

  var existingGhostBanner = root.querySelector('[data-ghost-banner]');
  if (ghostHtml) {
    if (existingGhostBanner) {
      existingGhostBanner.outerHTML = ghostHtml;
      return;
    }

    var topbar = root.querySelector('.topbar');
    if (topbar) {
      topbar.insertAdjacentHTML('afterend', ghostHtml);
    }
    return;
  }

  if (existingGhostBanner) {
    existingGhostBanner.remove();
  }
}