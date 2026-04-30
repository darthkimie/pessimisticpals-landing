let cloneRevealRuntime = {
  activeVariantId: null,
  inProgress: false,
  timeouts: [],
  root: null,
};

function prefersReducedCloneRevealMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function queueCloneRevealTimeout(callback, delay) {
  const handle = window.setTimeout(callback, delay);
  cloneRevealRuntime.timeouts.push(handle);
  return handle;
}

function clearCloneRevealTimeouts() {
  cloneRevealRuntime.timeouts.forEach((handle) => window.clearTimeout(handle));
  cloneRevealRuntime.timeouts = [];
}

function primeCloneAudioContext() {
  try {
    window._cloneAudioPrimed = true;
    if (!window._cloneAudioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        return null;
      }
      window._cloneAudioCtx = new AC();
    }
    if (window._cloneAudioCtx.state === 'suspended') {
      window._cloneAudioCtx.resume();
    }
    return window._cloneAudioCtx;
  } catch (error) {
    return null;
  }
}

function playTone(freq, type, dur, vol, startDelay) {
  try {
    if (!window._cloneAudioPrimed && !window._cloneAudioCtx) {
      return;
    }
    var ctx = primeCloneAudioContext();
    if (!ctx) return;
    var now = ctx.currentTime + (startDelay || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol || 0.3, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (dur || 0.3));
    osc.start(now);
    osc.stop(now + (dur || 0.3) + 0.05);
  } catch (error) {}
}

function triggerCloneHaptic(pattern) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}

function parseToOrath(sequenceString) {
  const syllables = [];
  let index = 0;
  while (index < sequenceString.length) {
    const ch = sequenceString[index];
    const entry = CLONE_CODE_REGISTRY.find(function(record) { return record.letter === ch; });
    if (!entry) {
      index += 1;
      continue;
    }

    if (sequenceString.slice(index, index + entry.letterWidth) === ch.repeat(entry.letterWidth)) {
      syllables.push(ORATH_SYLLABLES[ch] || ch);
      index += entry.letterWidth;
    } else {
      index += 1;
    }
  }

  return syllables;
}

function formatOrathName(syllables) {
  return syllables.map(function(syllable) {
    return syllable ? syllable.charAt(0).toUpperCase() + syllable.slice(1) : '';
  }).filter(Boolean).join('-');
}

function getCloneChangedTraitSummary(variant) {
  const changed = (variant && variant.changedTraitKeys) || [];
  if (!changed.length) {
    return 'No visible drift. The clone stayed close to inherited structure.';
  }

  return changed.slice(0, 6).map(function(key) {
    return key.toUpperCase();
  }).join(' · ');
}

function getCloneMutationDisplay(variant) {
  if (!variant || variant.tier === 'stable') {
    return null;
  }

  return {
    name: variant.label || 'Mutation Detected',
    description: variant.note || 'The chamber registered an unstable inheritance event.',
  };
}

function getLabRevealBaseMarkup() {
  return `
    <div class="section-heading-row">
      <div>
        <p class="eyebrow">MUTATION REVEAL</p>
        <h2 class="section-title" data-reveal-label>Stable Echo</h2>
      </div>
      <p class="section-note" data-reveal-source>XIO // STABLE</p>
    </div>
    <p class="section-copy" data-reveal-note aria-live="polite" aria-atomic="true">The chamber has finished inventing a variation on the problem.</p>
    <button type="button" class="ghost-link" data-archive-clone>Archive Reveal</button>
  `;
}

function ensureLabRevealShell(revealPanel) {
  if (!revealPanel) {
    return null;
  }

  if (!revealPanel.querySelector('[data-reveal-label]')
      || !revealPanel.querySelector('[data-reveal-source]')
      || !revealPanel.querySelector('[data-archive-clone]')) {
    revealPanel.innerHTML = getLabRevealBaseMarkup();
  }

  return revealPanel;
}

function ensureLabRevealOverlay(root) {
  if (!root) {
    return null;
  }

  let overlay = root.querySelector('[data-lab-reveal-overlay]');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'lab-reveal-overlay';
    overlay.dataset.labRevealOverlay = 'true';
    root.appendChild(overlay);
  }
  return overlay;
}

function resetLabRevealTransientUi(root) {
  if (!root) {
    return;
  }

  root.classList.remove('clone-reveal-active', 'clone-reveal-shake', 'mutation-flicker');
  const overlay = root.querySelector('[data-lab-reveal-overlay]');
  if (overlay) {
    overlay.classList.remove('is-visible', 'is-mutation-flash');
  }

  const revealPanel = root.querySelector('[data-clone-reveal]');
  if (revealPanel) {
    revealPanel.classList.remove('clone-card-final', 'is-reveal-animating');
    const stageHost = revealPanel.querySelector('[data-clone-reveal-stage-host]');
    if (stageHost) {
      stageHost.remove();
    }
  }
}

function stopCloneRevealSequence() {
  clearCloneRevealTimeouts();
  resetLabRevealTransientUi(cloneRevealRuntime.root);
  cloneRevealRuntime.activeVariantId = null;
  cloneRevealRuntime.inProgress = false;
  cloneRevealRuntime.root = null;
}

function getCloneRevealStageHost(revealPanel) {
  let stageHost = revealPanel.querySelector('[data-clone-reveal-stage-host]');
  if (!stageHost) {
    stageHost = document.createElement('div');
    stageHost.className = 'clone-reveal-stage-host';
    stageHost.dataset.cloneRevealStageHost = 'true';
    stageHost.innerHTML = `
      <div class="clone-merge-stage" data-clone-merge-stage></div>
      <div class="orath-name-display" data-orath-name-display></div>
      <div class="trait-reveal-list" data-trait-reveal-list></div>
      <div class="clone-mutation-status" data-clone-mutation-status></div>
      <div class="clone-reveal-particles" data-clone-reveal-particles></div>
    `;
    const archiveButton = revealPanel.querySelector('[data-archive-clone]');
    if (archiveButton) {
      archiveButton.insertAdjacentElement('beforebegin', stageHost);
    } else {
      revealPanel.appendChild(stageHost);
    }
  }
  return stageHost;
}

function spawnCloneMutationParticles(panel) {
  const particleHost = panel.querySelector('[data-clone-reveal-particles]');
  if (!particleHost) {
    return;
  }

  particleHost.replaceChildren();
  const particles = ['◆', '▪', '▒', '▓'];
  const total = 12 + randomInt(0, 4);
  for (let index = 0; index < total; index += 1) {
    const particle = document.createElement('span');
    particle.className = 'clone-mutation-particle';
    particle.textContent = particles[randomInt(0, particles.length - 1)];
    particle.style.setProperty('--particle-x', `${randomInt(-100, 100)}px`);
    particle.style.setProperty('--particle-y', `${randomInt(-100, 100)}px`);
    particle.style.setProperty('--particle-rotate', `${randomInt(-180, 180)}deg`);
    particle.style.left = `${50 + randomInt(-8, 8)}%`;
    particle.style.top = `${50 + randomInt(-8, 8)}%`;
    particle.style.animationDelay = `${index * 18}ms`;
    particleHost.appendChild(particle);
  }

  queueCloneRevealTimeout(function() {
    particleHost.replaceChildren();
  }, 1400);
}

function renderCloneRevealStageOne(root, revealPanel, variant) {
  const overlay = ensureLabRevealOverlay(root);
  const label = revealPanel.querySelector('[data-reveal-label]');
  const source = revealPanel.querySelector('[data-reveal-source]');
  const note = revealPanel.querySelector('[data-reveal-note]');
  const archiveButton = revealPanel.querySelector('[data-archive-clone]');
  const stageHost = getCloneRevealStageHost(revealPanel);

  root.classList.add('clone-reveal-active');
  revealPanel.classList.add('is-reveal-animating');
  if (overlay) {
    overlay.classList.add('is-visible');
  }
  if (label) label.textContent = 'SEQUENCE FORMING';
  if (source) source.textContent = `${(variant.basePalId || '').toUpperCase()} // CHAMBER LOCK`;
  if (note) {
    note.hidden = true;
  }
  if (archiveButton) {
    archiveButton.hidden = true;
  }
  stageHost.querySelector('[data-clone-merge-stage]').innerHTML = '';
  stageHost.querySelector('[data-orath-name-display]').innerHTML = '';
  stageHost.querySelector('[data-trait-reveal-list]').innerHTML = '';
  stageHost.querySelector('[data-clone-mutation-status]').innerHTML = '';

  const statusNode = root.querySelector('[data-lab-status]');
  if (statusNode) {
    statusNode.textContent = 'SEQUENCE FORMING';
  }

  playTone(100, 'sine', 0.5, 0.15, 0);
  triggerCloneHaptic([40, 20, 40]);
}

function renderCloneMergeStage(panel, variant, reducedMotion) {
  const mergeStage = panel.querySelector('[data-clone-merge-stage]');
  if (!mergeStage) {
    return;
  }

  const parentA = escapeHtml(variant.parentASequenceString || 'Ø');
  const parentB = escapeHtml(variant.parentBSequenceString || 'Ø');
  const combined = escapeHtml(variant.sequenceString || 'Ø');
  if (reducedMotion) {
    mergeStage.innerHTML = `<span class="merge-combined">${combined}<sup>${variant.generation || 1}</sup></span><p class="merge-generation">GEN ${String(variant.generation || 1).padStart(2, '0')}</p>`;
  } else {
    mergeStage.innerHTML = `
      <span class="merge-left">${parentA}</span>
      <span class="merge-right">${parentB}</span>
    `;
    queueCloneRevealTimeout(function() {
      mergeStage.innerHTML = `<span class="merge-combined">${combined}<sup>${variant.generation || 1}</sup></span><p class="merge-generation">GEN ${String(variant.generation || 1).padStart(2, '0')}</p>`;
    }, 400);
  }

  playTone(300, 'sine', 0.1, 0.14, 0);
  playTone(400, 'sine', 0.1, 0.14, 0.18);
  triggerCloneHaptic([20, 10, 20]);
}

function renderCloneOrathStage(panel, variant, reducedMotion) {
  const nameDisplay = panel.querySelector('[data-orath-name-display]');
  if (!nameDisplay) {
    return 0;
  }

  const syllables = parseToOrath(variant.sequenceString || '');
  const displaySyllables = syllables.length ? syllables : ['echo'];
  nameDisplay.innerHTML = displaySyllables.map(function(syllable, index) {
    const separator = index < displaySyllables.length - 1
      ? '<span class="orath-separator">-</span>'
      : '';
    return `<span class="orath-syllable" data-orath-syllable="${index}">${escapeHtml(syllable)}</span>${separator}`;
  }).join('');

  const syllableNodes = nameDisplay.querySelectorAll('[data-orath-syllable]');
  if (reducedMotion) {
    syllableNodes.forEach(function(node) {
      node.classList.add('is-active');
    });
  }

  displaySyllables.forEach(function(syllable, index) {
    const stepDelay = index * 500;
    const toneDef = SYLLABLE_TONES[syllable] || { freq: 240, type: 'sine', dur: 0.3 };
    playTone(toneDef.freq, toneDef.type, toneDef.dur, 0.2, stepDelay / 1000);
    queueCloneRevealTimeout(function() {
      const node = syllableNodes[index];
      if (!node) {
        return;
      }
      syllableNodes.forEach(function(other) { other.classList.remove('is-active'); });
      node.classList.add('is-active');
      triggerCloneHaptic([15]);
    }, stepDelay);
  });

  queueCloneRevealTimeout(function() {
    syllableNodes.forEach(function(node) { node.classList.remove('is-active'); });
  }, displaySyllables.length * 500);

  return displaySyllables.length * 500;
}

function renderCloneTraitStage(panel, variant, reducedMotion) {
  const traitContainer = panel.querySelector('[data-trait-reveal-list]');
  if (!traitContainer) {
    return 0;
  }

  traitContainer.innerHTML = '';
  const changedTraitKeys = (variant && variant.changedTraitKeys) || [];
  if (reducedMotion) {
    CLONE_TRAIT_KEYS.forEach(function(key) {
      const row = document.createElement('div');
      const isChanged = changedTraitKeys.includes(key);
      row.className = 'trait-reveal-row' + (isChanged ? ' trait-changed' : '');
      row.innerHTML = `
        <span class="trait-label">${escapeHtml(key.toUpperCase())}</span>
        <span class="trait-value${isChanged ? ' trait-value-changed' : ''}">${escapeHtml((variant.traits && variant.traits[key]) || 'inherited')}</span>
      `;
      traitContainer.appendChild(row);
    });
    return 0;
  }

  CLONE_TRAIT_KEYS.forEach(function(key, index) {
    queueCloneRevealTimeout(function() {
      const row = document.createElement('div');
      const isChanged = changedTraitKeys.includes(key);
      row.className = 'trait-reveal-row' + (isChanged ? ' trait-changed' : '');
      row.innerHTML = `
        <span class="trait-label">${escapeHtml(key.toUpperCase())}</span>
        <span class="trait-value${isChanged ? ' trait-value-changed' : ''}">${escapeHtml((variant.traits && variant.traits[key]) || 'inherited')}</span>
      `;
      traitContainer.appendChild(row);
      row.style.animation = 'traitSlideIn 0.2s ease-out';
      if (isChanged) {
        playTone(500 + index * 30, 'sine', 0.06, 0.12, 0);
        triggerCloneHaptic([10]);
      }
    }, index * 300);
  });

  return CLONE_TRAIT_KEYS.length * 300;
}

function renderCloneMutationCheck(root, panel, variant, reducedMotion) {
  const statusNode = panel.querySelector('[data-clone-mutation-status]');
  if (!statusNode) {
    return 0;
  }

  const mutationInfo = getCloneMutationDisplay(variant);
  if (!mutationInfo) {
    statusNode.innerHTML = '<p class="clone-stability-note">STABLE ECHO</p>';
    if (!reducedMotion) {
      root.classList.add('clone-stability-flicker');
      queueCloneRevealTimeout(function() {
        root.classList.remove('clone-stability-flicker');
      }, 80);
    }
    playTone(200, 'sine', 0.3, 0.16, 0);
    triggerCloneHaptic([15]);
    return 600;
  }

  statusNode.innerHTML = `
    <div class="mutation-callout">
      <p class="mutation-name">${escapeHtml(mutationInfo.name)}</p>
      <p class="mutation-description">${escapeHtml(mutationInfo.description)}</p>
    </div>
  `;
  const overlay = ensureLabRevealOverlay(root);
  if (!reducedMotion) {
    root.classList.add('mutation-flicker', 'clone-reveal-shake');
    if (overlay) {
      overlay.classList.add('is-mutation-flash');
    }
  }
  playTone(180, 'sawtooth', 0.15, 0.18, 0);
  playTone(280, 'square', 0.15, 0.16, 0.2);
  playTone(220, 'sine', 0.4, 0.18, 0.4);
  playTone(330, 'triangle', 0.4, 0.16, 0.4);
  triggerCloneHaptic([20, 10, 40, 10, 20]);
  spawnCloneMutationParticles(panel);
  queueCloneRevealTimeout(function() {
    root.classList.remove('mutation-flicker', 'clone-reveal-shake');
    if (overlay) {
      overlay.classList.remove('is-mutation-flash');
    }
  }, 1200);
  return 1500;
}

function finalizeCloneReveal(root, variant) {
  const revealPanel = root && root.querySelector('[data-clone-reveal]');
  if (revealPanel) {
    revealPanel.classList.add('clone-card-final');
  }
  playTone(440, 'sine', 0.15, 0.3, 0);
  playTone(550, 'sine', 0.15, 0.3, 0.08);
  playTone(660, 'sine', 0.2, 0.35, 0.16);
  triggerCloneHaptic([40, 20, 40, 20, 80]);
  queueCloneRevealTimeout(function() {
    cloneRevealRuntime.inProgress = false;
    cloneRevealRuntime.activeVariantId = null;
    resetLabRevealTransientUi(root);
    renderLab(root);
  }, 500);
}

function playCloneReveal(variant, state) {
  const root = labPageRoot || document.querySelector('[data-lab-root]');
  if (!root || !variant) {
    return;
  }

  stopCloneRevealSequence();
  cloneRevealRuntime.root = root;
  cloneRevealRuntime.inProgress = true;
  cloneRevealRuntime.activeVariantId = variant.id;

  const revealPanel = ensureLabRevealShell(root.querySelector('[data-clone-reveal]'));
  if (!revealPanel) {
    cloneRevealRuntime.inProgress = false;
    cloneRevealRuntime.activeVariantId = null;
    return;
  }

  revealPanel.hidden = false;
  renderCloneRevealStageOne(root, revealPanel, variant);

  const reducedMotion = prefersReducedCloneRevealMotion();
  const stageHost = getCloneRevealStageHost(revealPanel);

  if (reducedMotion) {
    renderCloneMergeStage(stageHost, variant, true);
    renderCloneOrathStage(stageHost, variant, true);
    renderCloneTraitStage(stageHost, variant, true);
    renderCloneMutationCheck(root, stageHost, variant, true);
    finalizeCloneReveal(root, variant);
    return;
  }

  queueCloneRevealTimeout(function() {
    renderCloneMergeStage(stageHost, variant, false);
  }, 800);

  queueCloneRevealTimeout(function() {
    const orathDuration = renderCloneOrathStage(stageHost, variant, false);
    queueCloneRevealTimeout(function() {
      const traitDuration = renderCloneTraitStage(stageHost, variant, false);
      queueCloneRevealTimeout(function() {
        queueCloneRevealTimeout(function() {
          const mutationDuration = renderCloneMutationCheck(root, stageHost, variant, false);
          queueCloneRevealTimeout(function() {
            finalizeCloneReveal(root, variant);
          }, mutationDuration);
        }, 800);
      }, traitDuration);
    }, orathDuration);
  }, 1400);
}

function syncCloneCycle() {
  const resolvedState = resolveCloneCycle(appState);
  const cycleCompleted = resolvedState.clone && appState.clone && resolvedState.clone.history.length !== appState.clone.history.length;
  const nextState = cycleCompleted
    ? evaluateAntiAchievements(resolvedState, { type: 'clone_completion' })
    : resolvedState;
  const savedState = setAppState(nextState);
  if (cycleCompleted && labPageRoot && savedState.clone && savedState.clone.revealedVariant) {
    playCloneReveal(savedState.clone.revealedVariant, savedState);
  }
  return savedState;
}