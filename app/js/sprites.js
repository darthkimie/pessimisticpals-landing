(function() {
  var FRAME_SIZE = 200;
  var activeSpriteSystem = null;
  var resumeModeHandle = null;
  var reduceMotionQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  function clearHandle(handle) {
    if (handle) {
      window.clearTimeout(handle);
    }
    return null;
  }

  function getReduceMotionPreference() {
    return Boolean(reduceMotionQuery && reduceMotionQuery.matches);
  }

  function getActivePalId() {
    var state = typeof getState === 'function' ? getState() : null;
    return state && state.activePal ? state.activePal : '';
  }

  function buildSpriteAssetPath(palId, stateName) {
    return '../assets/pals/sprites/' + palId + '-' + stateName + '.png';
  }

  function preloadSprite(path, callback) {
    var image = new Image();

    image.onload = function() {
      callback(true, path);
    };

    image.onerror = function() {
      callback(false, path);
    };

    image.src = path;
  }

  function stopAnimation(system) {
    if (!system) {
      return;
    }

    if (system.rafId) {
      window.cancelAnimationFrame(system.rafId);
      system.rafId = 0;
    }
  }

  function applyFramePosition(system, frameIndex) {
    if (!system || !system.spriteEl) {
      return;
    }

    system.frameIndex = frameIndex;
    system.spriteEl.style.backgroundPosition = -(frameIndex * FRAME_SIZE) + 'px 0';
  }

  function setSpriteImage(system, path, frameCount) {
    if (!system || !system.spriteEl) {
      return;
    }

    system.currentFrameCount = frameCount || 1;
    system.spriteEl.style.backgroundImage = 'url("' + path.replace(/"/g, '\\"') + '")';
    system.spriteEl.style.backgroundSize = (system.currentFrameCount * FRAME_SIZE) + 'px 100%';
    applyFramePosition(system, 0);
    system.spriteEl.classList.add('is-active');
    system.frame.classList.add('has-active-sprite');
    if (system.imageEl) {
      system.imageEl.hidden = true;
    }
  }

  function showStaticPortrait(system) {
    if (!system || !system.frame) {
      return;
    }

    stopAnimation(system);
    if (system.spriteEl) {
      system.spriteEl.classList.remove('is-active');
      system.spriteEl.style.backgroundImage = '';
      system.spriteEl.style.backgroundSize = 'auto 100%';
      system.spriteEl.style.backgroundPosition = '0 0';
    }
    system.frame.classList.remove('has-active-sprite');
    if (system.imageEl) {
      system.imageEl.hidden = false;
    }
  }

  function animateIdle(system, now) {
    var frameDuration;
    var spriteData;

    if (!system || !system.idleReady || !system.spriteEl) {
      return;
    }

    if (getReduceMotionPreference() || system.isPaused || system.displayMode !== 'idle') {
      system.rafId = 0;
      return;
    }

    spriteData = system.spriteData && system.spriteData.idle ? system.spriteData.idle : null;
    if (!spriteData || !spriteData.frames || !spriteData.fps) {
      return;
    }

    if (!system.lastFrameTime) {
      system.lastFrameTime = now;
    }

    frameDuration = 1000 / spriteData.fps;
    if ((now - system.lastFrameTime) >= frameDuration) {
      applyFramePosition(system, (system.frameIndex + 1) % spriteData.frames);
      system.lastFrameTime = now;
    }

    system.rafId = window.requestAnimationFrame(function(nextNow) {
      animateIdle(system, nextNow);
    });
  }

  function startIdleAnimation(system, resetFrame) {
    if (!system || !system.idleReady || !system.idlePath) {
      return;
    }

    stopAnimation(system);
    system.displayMode = 'idle';
    system.isPaused = false;
    system.lastFrameTime = 0;
    setSpriteImage(system, system.idlePath, system.spriteData.idle.frames);
    if (resetFrame) {
      applyFramePosition(system, 0);
    }

    system.rafId = window.requestAnimationFrame(function(now) {
      animateIdle(system, now);
    });
  }

  function cacheOptionalSprite(system, stateName, callback) {
    var cached = system.optionalSpriteCache[stateName];
    var loadToken;

    if (cached && cached.status !== 'pending') {
      callback(cached.status === 'ready', cached.path || '');
      return;
    }

    if (cached && cached.status === 'pending') {
      cached.waiters.push(callback);
      return;
    }

    loadToken = system.loadToken;
    system.optionalSpriteCache[stateName] = {
      status: 'pending',
      path: '',
      waiters: [callback],
    };

    preloadSprite(buildSpriteAssetPath(system.palId, stateName), function(success, path) {
      var entry = system.optionalSpriteCache[stateName];
      var waiters = entry ? entry.waiters.slice() : [];
      var index;

      if (!entry || loadToken !== system.loadToken) {
        return;
      }

      system.optionalSpriteCache[stateName] = {
        status: success ? 'ready' : 'missing',
        path: success ? path : '',
        waiters: [],
      };

      for (index = 0; index < waiters.length; index += 1) {
        waiters[index](success, success ? path : '');
      }
    });
  }

  function showOptionalState(system, stateName, resumeDelay, resetToIdleFrame) {
    var expectedPalId;

    if (!system || !system.idleReady) {
      return;
    }

    system.isPaused = true;
    system.displayMode = stateName;
    stopAnimation(system);
    expectedPalId = system.palId;

    cacheOptionalSprite(system, stateName, function(success, path) {
      if (!activeSpriteSystem || activeSpriteSystem !== system || system.palId !== expectedPalId) {
        return;
      }

      if (success) {
        setSpriteImage(system, path, 1);
      } else if (stateName === 'sleep' || stateName === 'stare') {
        setSpriteImage(system, system.idlePath, system.spriteData.idle.frames);
        applyFramePosition(system, 0);
      } else {
        setSpriteImage(system, system.idlePath, system.spriteData.idle.frames);
      }

      if (resumeDelay > 0) {
        resumeModeHandle = clearHandle(resumeModeHandle);
        resumeModeHandle = window.setTimeout(function() {
          if (!activeSpriteSystem || activeSpriteSystem !== system) {
            return;
          }
          evaluateFrameMode(system, resetToIdleFrame);
        }, resumeDelay);
      }
    });
  }

  function evaluateFrameMode(system, resetToIdleFrame) {
    var frame;

    if (!system || !system.frame || !system.idleReady) {
      return;
    }

    frame = system.frame;
    resumeModeHandle = clearHandle(resumeModeHandle);

    if (frame.classList.contains('is-sleeping')) {
      showOptionalState(system, 'sleep', 0, true);
      return;
    }

    if (frame.classList.contains('is-staring')) {
      showOptionalState(system, 'stare', 0, true);
      return;
    }

    if (frame.classList.contains('is-poked')) {
      showOptionalState(system, 'poke', 300, false);
      return;
    }

    if (frame.classList.contains('is-happy')) {
      showOptionalState(system, 'happy', 1200, true);
      return;
    }

    if (frame.classList.contains('is-blinking')) {
      showOptionalState(system, 'blink', 200, true);
      return;
    }

    startIdleAnimation(system, Boolean(resetToIdleFrame));
  }

  function ensureSpriteElement(system) {
    if (!system || !system.frame) {
      return null;
    }

    if (!system.spriteEl || !system.spriteEl.isConnected) {
      system.spriteEl = system.frame.querySelector('.pal-sprite');
    }

    if (!system.spriteEl) {
      system.spriteEl = document.createElement('div');
      system.spriteEl.className = 'pal-sprite';
      system.spriteEl.setAttribute('aria-hidden', 'true');
      system.frame.appendChild(system.spriteEl);
    }

    return system.spriteEl;
  }

  function observeFrameClasses(system) {
    if (!system || !system.frame || system.observer) {
      return;
    }

    system.observer = new MutationObserver(function(mutations) {
      var shouldSync = mutations.some(function(mutation) {
        return mutation.type === 'attributes' && mutation.attributeName === 'class';
      });

      if (shouldSync) {
        evaluateFrameMode(system, false);
      }
    });

    system.observer.observe(system.frame, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  function destroySpriteSystem() {
    if (!activeSpriteSystem) {
      return;
    }

    resumeModeHandle = clearHandle(resumeModeHandle);
    stopAnimation(activeSpriteSystem);

    if (activeSpriteSystem.observer) {
      activeSpriteSystem.observer.disconnect();
      activeSpriteSystem.observer = null;
    }

    showStaticPortrait(activeSpriteSystem);

    if (activeSpriteSystem.spriteEl) {
      activeSpriteSystem.spriteEl.remove();
      activeSpriteSystem.spriteEl = null;
    }

    activeSpriteSystem = null;
  }

  function prepareSystem(root) {
    var palId = getActivePalId();
    var spriteData = palId && typeof PAL_SPRITE_DATA !== 'undefined' ? PAL_SPRITE_DATA[palId] : null;
    var frame = root ? root.querySelector('[data-pal-frame]') : null;
    var image = root ? root.querySelector('[data-pal-image]') : null;
    var placeholder = root ? root.querySelector('[data-pal-placeholder]') : null;

    if (!root || !frame || !palId || !spriteData || !spriteData.idle) {
      destroySpriteSystem();
      return null;
    }

    if (!activeSpriteSystem || activeSpriteSystem.root !== root || activeSpriteSystem.palId !== palId) {
      destroySpriteSystem();
      activeSpriteSystem = {
        root: root,
        frame: frame,
        imageEl: image,
        placeholderEl: placeholder,
        palId: palId,
        spriteData: spriteData,
        spriteEl: null,
        observer: null,
        rafId: 0,
        lastFrameTime: 0,
        frameIndex: 0,
        loadToken: Date.now() + Math.random(),
        optionalSpriteCache: {},
        idleReady: false,
        idleMissing: false,
        idlePath: '',
        displayMode: 'idle',
        isPaused: false,
        currentFrameCount: 1,
      };
    } else {
      activeSpriteSystem.frame = frame;
      activeSpriteSystem.imageEl = image;
      activeSpriteSystem.placeholderEl = placeholder;
      activeSpriteSystem.spriteData = spriteData;
    }

    ensureSpriteElement(activeSpriteSystem);
    observeFrameClasses(activeSpriteSystem);
    return activeSpriteSystem;
  }

  function initOrSyncCareSpriteSystem(root) {
    var system = prepareSystem(root);
    var loadToken;

    if (!system) {
      return;
    }

    if (system.idleReady) {
      evaluateFrameMode(system, false);
      return;
    }

    if (system.idleMissing) {
      showStaticPortrait(system);
      return;
    }

    loadToken = system.loadToken;
    preloadSprite(buildSpriteAssetPath(system.palId, 'idle'), function(success, path) {
      if (!activeSpriteSystem || activeSpriteSystem !== system || loadToken !== system.loadToken) {
        return;
      }

      if (!success) {
        system.idleMissing = true;
        showStaticPortrait(system);
        return;
      }

      system.idleReady = true;
      system.idlePath = path;
      setSpriteImage(system, path, system.spriteData.idle.frames);
      evaluateFrameMode(system, true);
    });
  }

  if (!window.__ppalsSpriteCleanupBound) {
    window.addEventListener('pagehide', destroySpriteSystem);
    window.__ppalsSpriteCleanupBound = true;
  }

  window.initCareSpriteSystem = function(root) {
    initOrSyncCareSpriteSystem(root);
  };

  window.syncCareSpriteSystem = function(root) {
    if (!root || !activeSpriteSystem || activeSpriteSystem.root !== root || activeSpriteSystem.palId !== getActivePalId()) {
      initOrSyncCareSpriteSystem(root);
      return;
    }

    activeSpriteSystem.frame = root.querySelector('[data-pal-frame]');
    activeSpriteSystem.imageEl = root.querySelector('[data-pal-image]');
    activeSpriteSystem.placeholderEl = root.querySelector('[data-pal-placeholder]');
    evaluateFrameMode(activeSpriteSystem, false);
  };

  window.destroyCareSpriteSystem = destroySpriteSystem;
})();