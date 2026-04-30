const LEGACY_TIP_ATTRIBUTES = [
  ['data', 'tooltip'].join('-'),
  ['data', 'tooltip', 'title'].join('-'),
  'title',
];

function setDataTip(element, text) {
  if (!element) {
    return;
  }

  const normalizedText = typeof text === 'string' ? text.trim() : '';

  LEGACY_TIP_ATTRIBUTES.forEach((attributeName) => element.removeAttribute(attributeName));

  if (!normalizedText) {
    element.removeAttribute('data-tip');
    if (element.getAttribute('tabindex') === '0' && !element.matches('a[href], button, input, select, textarea, summary, [contenteditable="true"]')) {
      element.removeAttribute('tabindex');
    }
    return;
  }

  element.dataset.tip = normalizedText;
  if (!element.matches('a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]')) {
    element.setAttribute('tabindex', '0');
  }
}

function getCurrencyTooltipCopy(type) {
  switch (type) {
    case 'gloom':
      return 'Complete tasks to earn Gloom. Spend it on care actions to keep your pal alive and keep the loop moving.';
    case 'luckdust':
      return 'Luckdust is the rare currency. Earn it from streak milestones and spend it to expand the roster or fund clone work.';
    case 'streak':
      return 'Your streak measures consecutive days with secured progress through a daily check-in or linked calendar completion.';
    case 'contagion':
      return 'If any pal reaches advanced plague, the others start getting sick faster until the outbreak is contained.';
    default:
      return '';
  }
}

function getPalStatTooltipCopy(type) {
  switch (type) {
    case 'luck':
      return 'Luck improves favorable outcomes and softens a few of the system\'s meaner edges.';
    case 'pessimism':
      return 'Pessimism is how strongly this pal expects disappointment. Higher values push harsher commentary and overall mood.';
    case 'mutation':
      return 'Mutation Risk affects how unstable clone results can become in the lab.';
    case 'cloneBonus':
      return 'An active clone adds bonus Gloom whenever you complete a task.';
    default:
      return '';
  }
}

function getRelationshipModeTooltip(mode) {
  const copy = {
    observing: 'Observing means your pal is watching from a distance. Consistent care and follow-through move them closer.',
    present: 'Present means your pal notices your effort and is starting to respond to it.',
    invested: 'Invested means the relationship is holding. Consistency matters more than single good days now.',
    bonded: 'Bonded means trust is high. Better dialogue and the harshest care outcomes are easier to survive.',
    withdrawn: 'Withdrawn means neglect or repeated strain pushed the relationship backward. Recovery is possible, but slower.',
  };
  return copy[mode] || copy.observing;
}

function getNeedTooltipCopy(needKey) {
  switch (needKey) {
    case 'hunger':
      return 'Sustenance drops over time. If it bottoms out, your pal starts sliding toward failure.';
    case 'boredom':
      return 'Stimulation measures how bored your pal is. Low values drag mood down and make the loop harsher.';
    case 'mood':
      return 'Disposition is the emotional weather. Other neglected needs will keep pulling it lower.';
    case 'plague':
      return 'Plague Risk tracks how close the Icky is to shutting down. High plague escalates into staged cures and death pressure.';
    default:
      return '';
  }
}

function getCareActionTooltipCopy(actionKey) {
  if (actionKey === 'cure') {
    return 'Attempt a plague cure. The required Gloom, Luckdust, and trust depend on the current plague stage.';
  }

  const action = CARE_ACTIONS[actionKey];
  if (!action) {
    return '';
  }

  const direction = action.needKey === 'plague' ? 'reduces' : 'restores';
  return `${action.label} ${direction} ${action.needKey} by ${Math.abs(action.amount)} and costs ${action.cost} Gloom.`;
}

function getTrustTooltipCopy(tier, trustValue = 0) {
  const tierLabel = String(tier || 'cold').toUpperCase();
  return `Trust is currently ${trustValue}. ${tierLabel} trust affects dialogue, recovery chances, and the harshest plague cures.`;
}

function getTaskLoadTooltipCopy(loadValue) {
  return `Task load is intensity + social + energy + dread. This task is carrying ${loadValue} total load, which increases its Gloom reward.`;
}

function getUnratedTaskTooltipCopy() {
  return 'This task has no load rating yet. Rate it to show your pal how heavy it actually is and unlock the load bonus.';
}

function getGhostExpiryHours(task) {
  if (!task || !task.ghostExpiresAt || task.completed) {
    return null;
  }

  const remainingMs = task.ghostExpiresAt - Date.now();
  if (remainingMs <= 0) {
    return 0;
  }

  return Math.ceil(remainingMs / (1000 * 60 * 60));
}

function getGhostExpiryTooltipCopy(hoursRemaining) {
  return `Ghost tasks expire automatically. This one will vanish in about ${hoursRemaining} hour${hoursRemaining === 1 ? '' : 's'} if you leave it unresolved.`;
}

function getStreakTooltipCopy(type) {
  switch (type) {
    case 'current':
      return 'Current streak counts consecutive days where progress was secured through a check-in or linked calendar completion.';
    case 'next':
      return 'Every 3 streak days award 1 Luckdust. This shows how close the next payout is.';
    case 'habits':
      return 'Habit Days shows how many of the last 7 days you logged your routine.';
    default:
      return '';
  }
}

function getTipElementText(element) {
  if (!element) {
    return '';
  }

  const ariaLabel = typeof element.getAttribute === 'function' ? element.getAttribute('aria-label') : '';
  const labelledBy = typeof element.getAttribute === 'function' ? element.getAttribute('aria-labelledby') : '';
  const labelledText = labelledBy
    ? labelledBy.split(/\s+/).map((id) => {
      const labelNode = document.getElementById(id);
      return labelNode ? labelNode.textContent.trim() : '';
    }).filter(Boolean).join(' ')
    : '';
  const placeholder = typeof element.getAttribute === 'function' ? element.getAttribute('placeholder') : '';
  const datasetLabel = element.dataset && typeof element.dataset.label === 'string' ? element.dataset.label : '';
  const visibleText = typeof element.textContent === 'string' ? element.textContent.trim().replace(/\s+/g, ' ') : '';

  return ariaLabel || labelledText || datasetLabel || placeholder || visibleText;
}

function getCardMetricTooltipCopy(element) {
  if (!element) {
    return '';
  }

  const label = getTipElementText(element.querySelector('.label')) || getTipElementText(element.querySelector('.eyebrow'));
  const title = getTipElementText(element.querySelector('.section-title'));
  const value = getTipElementText(element.querySelector('.currency-value, .status-value, dd, .collection-stat-value, .collection-meta-value'));

  if (label && value) {
    return `${label} currently shows ${value}. Hover explanations stay available so you do not need to memorize what each readout means.`;
  }

  if (title) {
    return `${title}. This card summarizes one part of the current system state.`;
  }

  return '';
}

function getNavTooltipCopy(label) {
  const normalized = String(label || '').trim().toLowerCase();
  const map = {
    tasks: 'Open Daily Decline. This is the main dashboard for tasks, check-in, and active Pal status.',
    habits: 'Open Habits. Use this screen to log recurring routines across the current week.',
    streak: 'Open Streak. This screen explains consecutive progress days and the next Luckdust payout.',
    calendar: 'Open Calendar. Add events, inspect emotional load, and link planning back to the rest of the app.',
    care: 'Open Care. Use Gloom to feed, entertain, comfort, sanitize, or cure your active Pal.',
    lab: 'Open Lab. This is the clone chamber for lineage, mutation, and compatibility.',
    collection: 'Open Archive. Review owned pals, clone history, constellations, and collected items.',
    archive: 'Open Archive. Review owned pals, clone history, constellations, and collected items.',
    companion: 'Open Talk. Use this screen for companion interactions and dialogue.',
    talk: 'Open Talk. Use this screen for companion interactions and dialogue.',
    'change pal': 'Open Change Pal. Switch the currently active Pal from your available roster.',
    database: 'Open Database. This is the internal reference screen for systems, lore, routes, and live save telemetry.',
  };

  return map[normalized] || (label ? `Navigate to ${label}.` : 'Navigate to another screen.');
}

function getButtonTooltipCopy(element, label) {
  const normalized = String(label || '').trim().toLowerCase();

  if (!normalized) {
    return 'Activate this control.';
  }

  if (normalized.includes('begin')) return 'Start this flow and move to the next step.';
  if (normalized.includes('accept assignment')) return 'Confirm this Pal as your assignment and continue into the main app.';
  if (normalized.includes('start clone cycle')) return 'Spend resources and begin a real-time clone chamber cycle.';
  if (normalized.includes('archive reveal')) return 'Store the current clone reveal in history and clear the chamber output.';
  if (normalized.includes('activate this clone') || normalized === 'active clone') return 'Make this stored clone the active bonus source for future task rewards.';
  if (normalized.includes('save')) return 'Store the current value or naming change.';
  if (normalized.includes('next')) return 'Move to the next available option.';
  if (normalized.includes('play')) return 'Start the current audio track.';
  if (normalized.includes('mute')) return 'Mute the current audio broadcast until you turn it back on.';
  if (normalized.includes('unmute')) return 'Turn audio back on using the saved volume level.';
  if (normalized.includes('sort by date')) return 'Reorder this list using the most recent entries first.';
  if (normalized.includes('sort by rarity')) return 'Reorder this list by rarity tier instead of recency.';
  if (normalized.includes('inspect in care')) return 'Jump to Care and inspect this Pal there.';
  if (normalized.includes('review in lab')) return 'Jump to Lab and inspect this Pal there.';
  if (normalized.includes('mark complete')) return 'Mark this event or task as completed for today.';
  if (normalized.includes('completed')) return 'This action is already complete.';
  if (normalized.includes('edit')) return 'Open this record for editing.';
  if (normalized.includes('delete')) return 'Remove this record from the current list.';
  if (normalized.includes('try again')) return 'Reset this flow and attempt it again.';
  if (normalized.includes('return')) return 'Leave this flow and go back to the appropriate screen.';
  if (normalized.includes('log today')) return 'Record today\'s habit progress once for the current day.';

  if (element.matches('.nav-link, .pals-access-link')) {
    return getNavTooltipCopy(label);
  }

  return `${label}. Activate this control to continue.`;
}

function getInputTooltipCopy(element) {
  const explicitLabel = getTipElementText(element);
  const fieldName = explicitLabel || element.name || 'this field';

  if (element.matches('select')) {
    return `Choose an option for ${fieldName}.`;
  }

  if (element.type === 'range') {
    return `${fieldName}. Drag left to lower it or right to raise it.`;
  }

  if (element.type === 'checkbox') {
    return `${fieldName}. Toggle this setting on or off.`;
  }

  return `Enter or adjust ${fieldName}.`;
}

function getAutoTipCopy(element) {
  if (!element || (element.dataset && element.dataset.tip)) {
    return '';
  }

  if (element.closest('[aria-hidden="true"]')) {
    return '';
  }

  if (element.matches('.nav-link, .pals-access-link')) {
    return getNavTooltipCopy(getTipElementText(element));
  }

  if (element.matches('button, [role="button"], .ghost-link[href], .action-button, .opt-btn')) {
    return getButtonTooltipCopy(element, getTipElementText(element));
  }

  if (element.matches('a[href]')) {
    return getNavTooltipCopy(getTipElementText(element));
  }

  if (element.matches('input, select, textarea')) {
    return getInputTooltipCopy(element);
  }

  if (element.matches('.currency-card, .status-card, .stat-card, .collection-stat-card, .collection-meta-card')) {
    return getCardMetricTooltipCopy(element);
  }

  if (element.matches('.lab-asset-frame')) {
    const nearestLabel = getTipElementText(element.parentElement && element.parentElement.querySelector('.label'));
    return nearestLabel
      ? `${nearestLabel}. This visual is here to support context and reduce guesswork about what the chamber is doing.`
      : 'This visual supports the current chamber state.';
  }

  return '';
}

function applyAutoExplanations(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return;
  }

  const candidates = root.matches && root.matches('button, a[href], input, select, textarea, [role="button"], .currency-card, .status-card, .stat-card, .collection-stat-card, .collection-meta-card, .lab-asset-frame')
    ? [root]
    : [];

  candidates.push(...root.querySelectorAll('button, a[href], input, select, textarea, [role="button"], .currency-card, .status-card, .stat-card, .collection-stat-card, .collection-meta-card, .lab-asset-frame'));

  candidates.forEach((element) => {
    if (element.dataset.tip) {
      return;
    }

    const copy = getAutoTipCopy(element);
    if (copy) {
      setDataTip(element, copy);
    }
  });
}

function initDataTipSystem() {
  // Tooltip popups are disabled. They were getting in the way on touch devices
  // (a tap on a button would surface the tip rather than fire the action).
  // The setDataTip helpers and inline data-tip attributes remain in place so
  // that this can be re-enabled later by removing this early return.
  return;

  // eslint-disable-next-line no-unreachable
  if (typeof document === 'undefined' || document.body.dataset.tipSystemBound === 'true') {
    return;
  }

  let tooltipNode = document.querySelector('[data-global-tip]');
  if (!tooltipNode) {
    tooltipNode = document.createElement('div');
    tooltipNode.className = 'global-data-tip';
    tooltipNode.dataset.globalTip = 'true';
    tooltipNode.setAttribute('role', 'status');
    tooltipNode.setAttribute('aria-live', 'polite');
    tooltipNode.hidden = true;
    document.body.appendChild(tooltipNode);
  }

  let activeTipTarget = null;

  const clearActiveTip = () => {
    if (activeTipTarget) {
      activeTipTarget.classList.remove('is-tip-active');
      activeTipTarget = null;
    }

    tooltipNode.classList.remove('is-visible');
    tooltipNode.hidden = true;
    tooltipNode.textContent = '';
  };

  const positionTip = (element) => {
    if (!element || !element.isConnected || !element.dataset.tip) {
      clearActiveTip();
      return;
    }

    tooltipNode.textContent = element.dataset.tip;
    tooltipNode.hidden = false;
    tooltipNode.classList.add('is-visible');

    const viewportPadding = 12;
    const gap = 12;
    const rect = element.getBoundingClientRect();
    const tipRect = tooltipNode.getBoundingClientRect();
    const placeAbove = rect.bottom + gap + tipRect.height > window.innerHeight - viewportPadding
      && rect.top - gap - tipRect.height >= viewportPadding;
    const top = placeAbove
      ? rect.top - tipRect.height - gap
      : rect.bottom + gap;
    const left = clampNumber(
      rect.left + (rect.width / 2) - (tipRect.width / 2),
      viewportPadding,
      window.innerWidth - viewportPadding - tipRect.width,
    );

    tooltipNode.dataset.side = placeAbove ? 'top' : 'bottom';
    tooltipNode.style.left = `${Math.round(left)}px`;
    tooltipNode.style.top = `${Math.round(top)}px`;
  };

  const showTip = (element) => {
    if (!element || !element.dataset.tip) {
      return;
    }

    if (activeTipTarget && activeTipTarget !== element) {
      activeTipTarget.classList.remove('is-tip-active');
    }

    activeTipTarget = element;
    element.classList.add('is-tip-active');
    positionTip(element);
  };

  const hideTip = (element) => {
    if (!element) {
      return;
    }

    element.classList.remove('is-tip-active');
    if (activeTipTarget === element) {
      clearActiveTip();
    }
  };

  document.addEventListener('pointerover', (event) => {
    const node = event.target;
    const target = node instanceof Element ? node.closest('[data-tip]') : null;
    const related = event.relatedTarget instanceof Element ? event.relatedTarget.closest('[data-tip]') : null;
    if (target && target !== related) {
      showTip(target);
    }
  }, true);

  document.addEventListener('pointerout', (event) => {
    const node = event.target;
    const target = node instanceof Element ? node.closest('[data-tip]') : null;
    const related = event.relatedTarget instanceof Element ? event.relatedTarget.closest('[data-tip]') : null;
    if (target && target !== related) {
      hideTip(target);
    }
  }, true);

  document.addEventListener('focusin', (event) => {
    const target = event.target.closest('[data-tip]');
    if (target) {
      showTip(target);
    }
  });

  document.addEventListener('focusout', (event) => {
    const target = event.target.closest('[data-tip]');
    if (target && (!event.relatedTarget || !target.contains(event.relatedTarget))) {
      hideTip(target);
    }
  });

  document.addEventListener('click', (event) => {
    const node = event.target;
    const target = node instanceof Element ? node.closest('[data-tip]') : null;
    if (target) {
      showTip(target);
      return;
    }

    if (activeTipTarget) {
      hideTip(activeTipTarget);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeTipTarget) {
      hideTip(activeTipTarget);
    }
  });

  const handleViewportChange = () => {
    if (activeTipTarget) {
      if (!activeTipTarget.isConnected) {
        clearActiveTip();
        return;
      }

      positionTip(activeTipTarget);
    }
  };

  window.addEventListener('resize', handleViewportChange);
  window.addEventListener('scroll', handleViewportChange, true);

  applyAutoExplanations(document.body);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          applyAutoExplanations(node);
        }
      });

      mutation.removedNodes.forEach((node) => {
        if (!(node instanceof Element) || !activeTipTarget) {
          return;
        }

        if (node === activeTipTarget || node.contains(activeTipTarget)) {
          clearActiveTip();
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  document.body.dataset.tipSystemBound = 'true';
}