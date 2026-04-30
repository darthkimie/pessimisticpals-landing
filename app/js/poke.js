(function() {
  var activePokeSystem = null;
  var BLINK_MIN_MS = 3000;
  var BLINK_MAX_MS = 8000;
  var BLINK_DURATION_MS = 200;
  var POKE_DURATION_MS = 500;
  var HAPPY_DURATION_MS = 1200;
  var POKE_DIALOGUE_HOLD_MS = 2000;
  var SLEEP_DELAY_MS = 45000;
  var PUPIL_DRIFT_MIN_MS = 2800;
  var PUPIL_DRIFT_MAX_MS = 5200;
  var STARE_MIN_HOURS = 24;

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function clearHandle(handle) {
    if (handle) {
      window.clearTimeout(handle);
    }
    return null;
  }

  function pickRandom(list) {
    if (!Array.isArray(list) || !list.length) {
      return '';
    }
    return list[Math.floor(Math.random() * list.length)] || '';
  }

  function getPokeDialogueForPal(palId) {
    return typeof PAL_POKE_DIALOGUE !== 'undefined' && PAL_POKE_DIALOGUE[palId]
      ? PAL_POKE_DIALOGUE[palId]
      : null;
  }

  function getStareDialogueForPal(palId) {
    return typeof PAL_STARE_DIALOGUE !== 'undefined' && PAL_STARE_DIALOGUE[palId]
      ? PAL_STARE_DIALOGUE[palId]
      : null;
  }

  function getPokeLine(palId, pokeCount) {
    var bank = getPokeDialogueForPal(palId);
    if (!bank) {
      return '';
    }

    if (pokeCount % 5 === 0) {
      return pickRandom(bank.happy) || pickRandom(bank.standard);
    }

    if (pokeCount % 3 === 0) {
      return pickRandom(bank.surprised) || pickRandom(bank.standard);
    }

    return pickRandom(bank.standard);
  }

  function getStareDurationMs(hoursSinceLastVisit) {
    if (hoursSinceLastVisit >= 168) {
      return 10000;
    }
    if (hoursSinceLastVisit >= 72) {
      return 7000;
    }
    if (hoursSinceLastVisit >= 48) {
      return 5000;
    }
    if (hoursSinceLastVisit >= STARE_MIN_HOURS) {
      return 3000;
    }
    return 0;
  }

  function ensureTimerBar(system) {
    if (!system.frame) {
      return null;
    }
    if (!system.timerBar) {
      system.timerBar = document.createElement('span');
      system.timerBar.className = 'stare-timer-bar';
      system.timerBar.setAttribute('aria-hidden', 'true');
      system.frame.appendChild(system.timerBar);
    }
    return system.timerBar;
  }

  function setDialogueState(system, text, isSilent) {
    if (!system.dialogueEl) {
      return;
    }
    system.dialogueEl.textContent = text;
    system.dialogueEl.classList.toggle('is-stare-silent', Boolean(isSilent));
  }

  function setCareButtonsDisabled(system, disabled) {
    if (!system.root) {
      return;
    }
    system.root.querySelectorAll('[data-care-action], [data-gift-btn], [data-oracle-consult], [data-cure-plague]').forEach(function(button) {
      button.disabled = disabled;
      button.setAttribute('aria-disabled', String(disabled));
    });
  }

 function swapPalImage(system, stateName) {
  if (!system || !system.imageEl) {
    return;
  }
  var state = typeof getState === 'function' ? getState() : null;
  var palId = state && state.activePal ? state.activePal : '';
  if (!palId) {
    return;
  }
  // Don't override persistent states (ghost, death, plague) with transient
  // poke/happy/sleep sprites — they should keep their special portrait until
  // the underlying ledger flag flips.
  var activeLedger = (state && state.palMoodLedger && state.palMoodLedger[palId]) || null;
  if (activeLedger && (activeLedger.isGhost || activeLedger.isDying)) {
    return;
  }
  var base = '../assets/pals/base-pals/' + palId;
  if (!stateName || stateName === 'idle') {
    system.imageEl.src = base + '.png';
  } else {
    system.imageEl.src = base + '-' + stateName + '.png';
  }
}

  function preloadPalVariants(system) {
    if (!system) return;
    var state = typeof getState === 'function' ? getState() : null;
    var palId = state && state.activePal ? state.activePal : '';
    if (!palId) return;
    var base = '../assets/pals/base-pals/' + palId;
    ['blink', 'sleep', 'stare', 'poked', 'happy'].forEach(function(variant) {
      var img = new Image();
      img.src = base + '-' + variant + '.png';
    });
  }

  function persistCareVisit(line, visitTimestamp) {
    if (typeof setAppState !== 'function') {
      return;
    }
    setAppState(function(state) {
      return {
        ...state,
        meta: {
          ...state.meta,
          lastVisitTimestamp: visitTimestamp,
        },
        care: {
          ...state.care,
          reactionType: 'idle',
          dialogue: line,
          dialogueSilentUntil: null,
        },
      };
    });
  }

  function scheduleBlink(system) {
    system.blinkHandle = clearHandle(system.blinkHandle);
    if (!system || !system.frame) {
      return;
    }
    system.blinkHandle = window.setTimeout(function() {
      if (!system.frame || system.isStaring
        || system.frame.classList.contains('is-sleeping')
        || system.frame.classList.contains('is-poked')
        || system.frame.classList.contains('is-happy')) {
        scheduleBlink(system);
        return;
      }
      system.frame.classList.add('is-blinking');
      swapPalImage(system, 'blink');
      window.setTimeout(function() {
        if (system.frame) {
          system.frame.classList.remove('is-blinking');
        }
        // Only restore idle if we're not in a sticky state.
        if (system.frame
          && !system.frame.classList.contains('is-sleeping')
          && !system.frame.classList.contains('is-poked')
          && !system.frame.classList.contains('is-happy')
          && !system.isStaring) {
          swapPalImage(system, 'idle');
        }
        scheduleBlink(system);
      }, BLINK_DURATION_MS);
    }, randomBetween(BLINK_MIN_MS, BLINK_MAX_MS));
  }

  function applyRandomPupilDrift(system) {
    if (!system.frame || system.isStaring || system.frame.classList.contains('is-sleeping')) {
      return;
    }

    system.frame.style.setProperty('--pupil-offset-x', randomBetween(-3, 3) + 'px');
    system.frame.style.setProperty('--pupil-offset-y', randomBetween(-2, 2) + 'px');
  }

  function schedulePupilDrift(system) {
    system.pupilHandle = clearHandle(system.pupilHandle);
    system.pupilHandle = window.setTimeout(function() {
      applyRandomPupilDrift(system);
      schedulePupilDrift(system);
    }, randomBetween(PUPIL_DRIFT_MIN_MS, PUPIL_DRIFT_MAX_MS));
  }

  function resetIdleTimer(system) {
    system.sleepHandle = clearHandle(system.sleepHandle);
    if (system.frame) {
      system.frame.classList.remove('is-sleeping');
      swapPalImage(system, 'idle');
    }
    if (system.isStaring) {
      return;
    }
    applyRandomPupilDrift(system);
    system.sleepHandle = window.setTimeout(function() {
      if (system.frame) {
        system.frame.classList.add('is-sleeping');
        swapPalImage(system, 'sleep');
      }
    }, SLEEP_DELAY_MS);
  }

  function startIdle(system) {
    if (!system || !system.frame) {
      return;
    }
    system.isStaring = false;
    system.frame.classList.remove('is-staring');
    scheduleBlink(system);
    schedulePupilDrift(system);
    resetIdleTimer(system);
  }

  function finishStare(system, interrupted) {
    var state;
    var palId;
    var stareDialogue;
    var line;

    if (!system || !system.frame || !system.isStaring) {
      return;
    }

    system.stareHandle = clearHandle(system.stareHandle);
    system.isStaring = false;
    system.frame.classList.remove('is-staring');
    swapPalImage(system, 'idle');

    if (system.timerBar) {
      system.timerBar.hidden = true;
      system.timerBar.style.transform = 'scaleX(0)';
    }

    state = typeof getState === 'function' ? getState() : null;
    palId = state && state.activePal ? state.activePal : 'xio';
    stareDialogue = getStareDialogueForPal(palId) || getStareDialogueForPal('xio') || { returned: '', interrupted: '' };
    line = interrupted ? stareDialogue.interrupted : stareDialogue.returned;

    persistCareVisit(line, Date.now());
    if (typeof renderCare === 'function') {
      renderCare(system.root);
    }
    setDialogueState(system, line, false);
    startIdle(system);
  }

  function startStare(system, durationMs) {
    var timerBar;

    if (!system || !system.frame || durationMs <= 0) {
      startIdle(system);
      return false;
    }

    system.isStaring = true;
    system.frame.classList.add('is-staring');
    swapPalImage(system, 'stare');
    system.frame.classList.remove('is-blinking', 'is-sleeping', 'is-poked', 'is-happy');
    system.blinkHandle = clearHandle(system.blinkHandle);
    system.sleepHandle = clearHandle(system.sleepHandle);
    system.pupilHandle = clearHandle(system.pupilHandle);
    system.happyHandle = clearHandle(system.happyHandle);
    system.frame.style.removeProperty('--pupil-offset-x');
    system.frame.style.removeProperty('--pupil-offset-y');
    setCareButtonsDisabled(system, true);
    setDialogueState(system, '...', true);

    timerBar = ensureTimerBar(system);
    if (timerBar) {
      timerBar.hidden = false;
      timerBar.style.transitionDuration = '0ms';
      timerBar.style.transform = 'scaleX(1)';
      window.requestAnimationFrame(function() {
        if (!system.timerBar || !system.isStaring) {
          return;
        }
        system.timerBar.style.transitionDuration = durationMs + 'ms';
        system.timerBar.style.transform = 'scaleX(0)';
      });
    }

    system.stareHandle = window.setTimeout(function() {
      finishStare(system, false);
    }, durationMs);

    return true;
  }

  function handlePoke(system) {
    var state;
    var palId;

    if (!system.frame) {
      return;
    }

    state = typeof getState === 'function' ? getState() : null;
    palId = state && state.activePal ? state.activePal : null;
    if (!palId || !system.dialogueEl) {
      return;
    }

    if (system.isStaring) {
      finishStare(system, true);
      return;
    }

    system.pokeCount += 1;
    resetIdleTimer(system);
    system.frame.classList.remove('is-sleeping');
    system.frame.classList.add('is-poked');
    swapPalImage(system, 'poke');
    window.setTimeout(function() {
      if (system.frame) {
        system.frame.classList.remove('is-poked');
        swapPalImage(system, 'idle');
      }
    }, POKE_DURATION_MS);

    if (system.pokeCount % 5 === 0) {
      system.frame.classList.add('is-happy');
      swapPalImage(system, 'happy');
      system.happyHandle = clearHandle(system.happyHandle);
      system.happyHandle = window.setTimeout(function() {
        if (system.frame) {
          system.frame.classList.remove('is-happy');
          swapPalImage(system, 'idle');
        }
      }, HAPPY_DURATION_MS);
      if (typeof pushActivity === 'function') {
        var pal = (typeof getPalById === 'function') ? getPalById(palId) : null;
        var palName = pal ? pal.name : palId;
        pushActivity({
          palId: palId,
          type: 'poke',
          system: palName + ' enjoyed ' + system.pokeCount + ' pokes.',
          link: 'care',
        });
      }
    }

    var pokeLine = getPokeLine(palId, system.pokeCount);
    setDialogueState(system, pokeLine, false);

    // Hold the poke line for the full 2-second window. Track on the
    // system so the 1Hz care refresh in syncSystem re-asserts the line
    // even if renderCare runs in between.
    system.pokeDialogueLine = pokeLine;
    system.pokeDialogueUntil = Date.now() + POKE_DIALOGUE_HOLD_MS;
    system.pokeDialogueHandle = clearHandle(system.pokeDialogueHandle);
    system.pokeDialogueHandle = window.setTimeout(function() {
      system.pokeDialogueLine = null;
      system.pokeDialogueUntil = 0;
      if (typeof renderCare === 'function' && system.root) {
        renderCare(system.root);
      }
    }, POKE_DIALOGUE_HOLD_MS);
  }

  function syncSystem(system) {
    if (!system || !system.root || !system.frame) {
      return;
    }

    system.dialogueEl = system.root.querySelector('[data-care-dialogue]');

    if (system.isStaring) {
      system.frame.classList.add('is-staring');
      setCareButtonsDisabled(system, true);
      setDialogueState(system, '...', true);
      if (system.timerBar) {
        system.timerBar.hidden = false;
      }
      return;
    }

    if (system.timerBar) {
      system.timerBar.hidden = true;
    }
    if (system.dialogueEl) {
      system.dialogueEl.classList.remove('is-stare-silent');
    }
    if (system.pokeDialogueLine && system.pokeDialogueUntil && Date.now() < system.pokeDialogueUntil) {
      // Re-assert the poke line — renderCare just overwrote it.
      setDialogueState(system, system.pokeDialogueLine, false);
    }
    if (system.frame && system.frame.classList.contains('is-sleeping')) {
  swapPalImage(system, 'sleep');
  return;
}
if (system.frame && system.frame.classList.contains('is-poked') && system.currentPokeLine) {
  swapPalImage(system, 'poke');
  return;
}
if (system.frame && system.frame.classList.contains('is-happy')) {
  swapPalImage(system, 'happy');
  return;
}
  }

  function destroySystem(system) {
    if (!system) {
      return;
    }

    system.blinkHandle = clearHandle(system.blinkHandle);
    system.sleepHandle = clearHandle(system.sleepHandle);
    system.pupilHandle = clearHandle(system.pupilHandle);
    system.happyHandle = clearHandle(system.happyHandle);
    system.stareHandle = clearHandle(system.stareHandle);
    system.pokeDialogueHandle = clearHandle(system.pokeDialogueHandle);

    if (system.frame && system.clickHandler) {
      system.frame.removeEventListener('click', system.clickHandler);
      system.frame.classList.remove('is-blinking', 'is-sleeping', 'is-poked', 'is-happy', 'is-staring');
      system.frame.style.removeProperty('--pupil-offset-x');
      system.frame.style.removeProperty('--pupil-offset-y');
    }

    if (system.timerBar) {
      system.timerBar.remove();
      system.timerBar = null;
    }

    if (system.dialogueEl) {
      system.dialogueEl.classList.remove('is-stare-silent');
    }

    if (system.imageEl && system.baseSrc) {
      system.imageEl.src = system.baseSrc;
    }
  }

  window.initCarePokeSystem = function(root, options) {
    var frame;
    var hoursSinceLastVisit;
    var stareDurationMs;

    if (!root) {
      return false;
    }

    if (activePokeSystem) {
      destroySystem(activePokeSystem);
      activePokeSystem = null;
    }

    frame = root.querySelector('[data-pal-frame]');
    if (!frame) {
      return false;
    }

    hoursSinceLastVisit = options && typeof options.hoursSinceLastVisit === 'number'
      ? options.hoursSinceLastVisit
      : 0;
    stareDurationMs = getStareDurationMs(hoursSinceLastVisit);

    activePokeSystem = {
      root: root,
      frame: frame,
      imageEl: (frame.closest('[data-care-root]') || root).querySelector('[data-pal-image]') || null,
      baseSrc: '',
      dialogueEl: root.querySelector('[data-care-dialogue]'),
      pokeCount: 0,
      blinkHandle: null,
      sleepHandle: null,
      pupilHandle: null,
      happyHandle: null,
      stareHandle: null,
      pokeDialogueHandle: null,
      pokeDialogueLine: null,
      pokeDialogueUntil: 0,
      timerBar: null,
      clickHandler: null,
      isStaring: false,
    };

    if (activePokeSystem.imageEl && activePokeSystem.imageEl.src) {
      activePokeSystem.baseSrc = activePokeSystem.imageEl.src;
    }

    activePokeSystem.clickHandler = function(event) {
      var target = event.target instanceof Element ? event.target : null;
      if (target && target.closest('button, a, input, select, textarea')) {
        return;
      }
      handlePoke(activePokeSystem);
    };

    frame.addEventListener('click', activePokeSystem.clickHandler);
    syncSystem(activePokeSystem);
    preloadPalVariants(activePokeSystem);
    if (!startStare(activePokeSystem, stareDurationMs)) {
      applyRandomPupilDrift(activePokeSystem);
      startIdle(activePokeSystem);
    }
    return Boolean(stareDurationMs);
  };

  window.syncCarePokeSystem = function(root) {
    if (!activePokeSystem || !root || activePokeSystem.root !== root) {
      return;
    }
    syncSystem(activePokeSystem);
  };

  window.destroyCarePokeSystem = function() {
    destroySystem(activePokeSystem);
    activePokeSystem = null;
  };
})();