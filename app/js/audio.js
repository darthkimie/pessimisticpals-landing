const AUDIO_RESUME_STORAGE_KEY = 'ppals_audio_resume';

function getAudioPrefs(state = getState()) {
  const meta = state && state.meta ? state.meta : DEFAULT_META_STATE;
  return {
    enabled: Boolean(meta.audioEnabled),
    volume: clampNumber(Number(meta.audioVolume) || DEFAULT_AUDIO_VOLUME, 0, 1),
    trackId: AUDIO_TRACKS.some((track) => track.id === meta.audioTrackId)
      ? meta.audioTrackId
      : AUDIO_TRACKS[0].id,
  };
}

function shouldShowAudioDock(page) {
  return AUDIO_DOCK_PAGES.includes(page);
}

function getAudioPlaylistForPage(page) {
  const themedTracks = AUDIO_TRACKS.filter((track) => !Array.isArray(track.pages) || track.pages.includes(page));
  return themedTracks.length ? themedTracks : AUDIO_TRACKS;
}

function updateAudioPrefs(patch) {
  setAppState((state) => ({
    ...state,
    meta: {
      ...state.meta,
      ...patch,
    },
  }));
}

function saveAudioResumeState() {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  const prefs = getAudioPrefs();
  const currentTrack = audioDeck && Array.isArray(audioDeck.playlist)
    ? audioDeck.playlist[audioDeck.trackIndex] || AUDIO_TRACKS.find((track) => track.id === prefs.trackId) || AUDIO_TRACKS[0]
    : AUDIO_TRACKS.find((track) => track.id === prefs.trackId) || AUDIO_TRACKS[0];
  const playerTime = audioDeck && audioDeck.player ? Number(audioDeck.player.currentTime) : 0;

  sessionStorage.setItem(AUDIO_RESUME_STORAGE_KEY, JSON.stringify({
    trackId: currentTrack ? currentTrack.id : prefs.trackId,
    currentTime: clampNumber(Number.isFinite(playerTime) ? playerTime : 0, 0, Number.MAX_SAFE_INTEGER),
    enabled: prefs.enabled,
    volume: prefs.volume,
  }));
}

function navigateWithAudioResume(targetPath) {
  saveAudioResumeState();
  window.location.href = targetPath;
}

function consumeAudioResumeState() {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  const rawValue = sessionStorage.getItem(AUDIO_RESUME_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  sessionStorage.removeItem(AUDIO_RESUME_STORAGE_KEY);

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      track: AUDIO_TRACKS.find((track) => track.id === parsed.trackId) || null,
      currentTime: clampNumber(Number(parsed.currentTime) || 0, 0, Number.MAX_SAFE_INTEGER),
      enabled: Boolean(parsed.enabled),
      volume: clampNumber(Number(parsed.volume) || DEFAULT_AUDIO_VOLUME, 0, 1),
    };
  } catch (_error) {
    return null;
  }
}

function syncAudioDockUi() {
  if (!audioDeck || !audioDeck.root) {
    return;
  }

  const prefs = getAudioPrefs();
  const currentTrack = audioDeck.playlist[audioDeck.trackIndex] || AUDIO_TRACKS[0];
  const isPlaying = audioDeck.player && !audioDeck.player.paused && !audioDeck.player.ended;
  audioDeck.title.textContent = currentTrack ? currentTrack.title : 'Signal pending';
  audioDeck.status.textContent = !prefs.enabled
    ? 'Muted'
    : audioDeck.unlocked
      ? isPlaying ? 'Broadcasting' : 'Standing by'
      : 'Tap to start';
  audioDeck.toggle.textContent = prefs.enabled ? (isPlaying ? 'Mute' : 'Play') : 'Unmute';
  audioDeck.root.dataset.audioState = prefs.enabled ? (audioDeck.unlocked ? 'armed' : 'pending') : 'muted';
  audioDeck.root.dataset.audioPlaying = isPlaying ? 'true' : 'false';
  audioDeck.volume.value = String(Math.round(prefs.volume * 100));

  if (audioDeck.pillLabel) {
    audioDeck.pillLabel.textContent = currentTrack ? currentTrack.title : 'Audio';
  }
  if (audioDeck.pillIcon) {
    audioDeck.pillIcon.innerHTML = !prefs.enabled
      ? '&#9210;'                /* mute glyph */
      : isPlaying
        ? '&#9646;&#9646;'       /* pause bars */
        : '&#9658;';              /* play triangle */
  }
}

function syncAudioSource() {
  if (!audioDeck || !audioDeck.player) {
    return;
  }

  const track = audioDeck.playlist[audioDeck.trackIndex] || AUDIO_TRACKS[0];
  if (!track) {
    return;
  }

  if (audioDeck.player.dataset.trackId !== track.id) {
    audioDeck.player.src = toRelativeAssetPath(track.src);
    audioDeck.player.dataset.trackId = track.id;
  }

  audioDeck.player.volume = getAudioPrefs().volume;
}

function releaseAudioUnlockHandlers() {
  if (!audioDeck || !audioDeck.unlockHandler) {
    return;
  }

  document.removeEventListener('pointerdown', audioDeck.unlockHandler, true);
  document.removeEventListener('keydown', audioDeck.unlockHandler, true);
  audioDeck.unlockHandler = null;
  audioDeck.unlockBound = false;
}

function tryPlayAudio(forcePlayback = false) {
  if (!audioDeck || !audioDeck.player) {
    return;
  }

  const prefs = getAudioPrefs();
  syncAudioSource();

  if (!prefs.enabled) {
    audioDeck.player.pause();
    syncAudioDockUi();
    return;
  }

  const playAttempt = audioDeck.player.play();
  if (playAttempt && typeof playAttempt.then === 'function') {
    playAttempt.then(() => {
      audioDeck.unlocked = true;
      releaseAudioUnlockHandlers();
      syncAudioDockUi();
    }).catch(() => {
      if (forcePlayback) {
        audioDeck.unlocked = false;
      }
      syncAudioDockUi();
    });
    return;
  }

  audioDeck.unlocked = true;
  releaseAudioUnlockHandlers();
  syncAudioDockUi();
}

function cycleAudioTrack(step = 1, shouldAutoplay = true) {
  if (!audioDeck || !audioDeck.playlist.length) {
    return;
  }

  audioDeck.trackIndex = (audioDeck.trackIndex + step + audioDeck.playlist.length) % audioDeck.playlist.length;
  const nextTrack = audioDeck.playlist[audioDeck.trackIndex];
  updateAudioPrefs({ audioTrackId: nextTrack.id });
  syncAudioSource();
  syncAudioDockUi();

  if (shouldAutoplay && getAudioPrefs().enabled) {
    tryPlayAudio(true);
  }
}

function armAudioUnlock() {
  if (!audioDeck || audioDeck.unlockBound) {
    return;
  }

  const unlock = () => {
    if (!audioDeck) {
      return;
    }

    if (audioDeck.unlocked) {
      releaseAudioUnlockHandlers();
      return;
    }

    tryPlayAudio(true);
  };

  audioDeck.unlockBound = true;
  audioDeck.unlockHandler = unlock;
  document.addEventListener('pointerdown', unlock, { passive: true, capture: true });
  document.addEventListener('keydown', unlock, { passive: true, capture: true });
}

function playUiEffect(effect = 'click') {
  const meta = (getState() || {}).meta || {};
  const uiSoundsEnabled = meta.uiSoundsEnabled !== false;
  const uiVolume = typeof meta.uiVolume === 'number' ? clampNumber(meta.uiVolume, 0, 1) : 0.6;
  const effectPath = AUDIO_EFFECTS[effect] || AUDIO_EFFECTS.click;
  const now = Date.now();

  // UI sounds are gated independently of the music toggle. We still require
  // the audio deck to have been unlocked by a user gesture (browser policy)
  // and a 90ms cooldown to prevent rapid-fire stuttering.
  if (!uiSoundsEnabled || !audioDeck || !audioDeck.unlocked || !effectPath || uiVolume <= 0 || now - audioEffectsLastTriggeredAt < 90) {
    return;
  }

  audioEffectsLastTriggeredAt = now;
  const effectPlayer = new Audio(toRelativeAssetPath(effectPath));
  effectPlayer.volume = Math.min(uiVolume * (effect === 'confirm' ? 0.7 : 0.46), 0.7);
  effectPlayer.play().catch(() => {});
}

function initUiSoundDelegation() {
  if (document.body.dataset.uiAudioBound === 'true') {
    return;
  }

  document.body.dataset.uiAudioBound = 'true';
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element
      ? event.target.closest('button, a, [role="button"]')
      : null;

    if (!target || target.closest('[data-audio-dock]')) {
      return;
    }

    playUiEffect(target.matches('.action-button, .opt-btn, .care-action-btn, [data-task-submit]') ? 'confirm' : 'click');
  }, true);
}

function initAudioSystem(page) {
  if (!shouldShowAudioDock(page) || !document.body) {
    return;
  }

  if (!audioDeck) {
    const player = document.createElement('audio');
    player.preload = 'none';
    player.addEventListener('ended', () => cycleAudioTrack(1, true));

    const root = document.createElement('section');
    root.className = 'audio-dock panel';
    root.dataset.audioDock = 'true';
    root.dataset.audioCollapsed = 'true';
    root.innerHTML = `
      <button type="button" class="audio-dock-pill" data-audio-collapsed-toggle aria-label="Open ship audio" aria-expanded="false">
        <span class="audio-dock-pill-icon" aria-hidden="true">&#9658;</span>
        <span class="audio-dock-pill-label">AUDIO</span>
      </button>
      <div class="audio-dock-expanded" data-audio-expanded>
        <div class="audio-dock-copy">
          <p class="eyebrow">SHIP AUDIO</p>
          <p class="audio-dock-title" data-audio-title>Signal pending</p>
          <p class="audio-dock-status" data-audio-status>Tap to start</p>
        </div>
        <div class="audio-dock-controls">
          <button type="button" class="ghost-link audio-dock-button" data-audio-toggle>Play</button>
          <button type="button" class="ghost-link audio-dock-button" data-audio-next>Next</button>
          <label class="audio-dock-volume-wrap">
            <span class="audio-dock-volume-label">Vol</span>
            <input class="audio-dock-volume" data-audio-volume type="range" min="0" max="100" step="1" value="34" aria-label="Audio volume">
          </label>
          <button type="button" class="ghost-link audio-dock-button audio-dock-close" data-audio-collapse aria-label="Close ship audio">&times;</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    audioDeck = {
      player,
      root,
      title: root.querySelector('[data-audio-title]'),
      status: root.querySelector('[data-audio-status]'),
      toggle: root.querySelector('[data-audio-toggle]'),
      next: root.querySelector('[data-audio-next]'),
      volume: root.querySelector('[data-audio-volume]'),
      pillLabel: root.querySelector('.audio-dock-pill-label'),
      pillIcon: root.querySelector('.audio-dock-pill-icon'),
      trackIndex: 0,
      playlist: [],
      unlocked: false,
      unlockBound: false,
      resumeState: null,
    };

    const resumeState = consumeAudioResumeState();
    if (resumeState) {
      updateAudioPrefs({
        audioEnabled: resumeState.enabled,
        audioVolume: resumeState.volume,
        ...(resumeState.track ? { audioTrackId: resumeState.track.id } : {}),
      });
      audioDeck.resumeState = resumeState;
    }

    if (!window.__ppalsAudioResumeBound) {
      window.addEventListener('beforeunload', saveAudioResumeState);
      window.__ppalsAudioResumeBound = true;
    }

    audioDeck.toggle.addEventListener('click', () => {
      const prefs = getAudioPrefs();
      if (prefs.enabled && audioDeck.unlocked && !audioDeck.player.paused) {
        updateAudioPrefs({ audioEnabled: false });
        audioDeck.player.pause();
        syncAudioDockUi();
        playUiEffect('click');
        return;
      }

      if (!prefs.enabled) {
        updateAudioPrefs({ audioEnabled: true });
      }

      tryPlayAudio(true);
      playUiEffect('confirm');
    });

    audioDeck.next.addEventListener('click', () => {
      cycleAudioTrack(1, true);
      playUiEffect('confirm');
    });

    audioDeck.volume.addEventListener('input', (event) => {
      const volume = clampNumber(Number(event.target.value) / 100, 0, 1);
      updateAudioPrefs({ audioVolume: volume });
      if (audioDeck && audioDeck.player) {
        audioDeck.player.volume = volume;
      }
      syncAudioDockUi();
    });

    const collapsedToggle = root.querySelector('[data-audio-collapsed-toggle]');
    const collapseButton = root.querySelector('[data-audio-collapse]');
    const setCollapsed = (collapsed) => {
      root.dataset.audioCollapsed = collapsed ? 'true' : 'false';
      if (collapsedToggle) {
        collapsedToggle.setAttribute('aria-expanded', String(!collapsed));
        collapsedToggle.setAttribute('aria-label', collapsed ? 'Open ship audio' : 'Close ship audio');
      }
    };
    if (collapsedToggle) {
      collapsedToggle.addEventListener('click', () => {
        setCollapsed(false);
        playUiEffect('click');
      });
    }
    if (collapseButton) {
      collapseButton.addEventListener('click', () => {
        setCollapsed(true);
        playUiEffect('click');
      });
    }
  }

  const pagePlaylist = getAudioPlaylistForPage(page);
  const resumeState = audioDeck.resumeState;
  const shouldInjectResumeTrack = Boolean(
    resumeState
    && resumeState.track
    && !pagePlaylist.some((track) => track.id === resumeState.track.id)
  );
  audioDeck.playlist = shouldInjectResumeTrack
    ? [resumeState.track].concat(pagePlaylist)
    : pagePlaylist;

  const prefs = getAudioPrefs();
  const restoredIndex = audioDeck.playlist.findIndex((track) => track.id === prefs.trackId);
  audioDeck.trackIndex = restoredIndex >= 0 ? restoredIndex : 0;
  syncAudioSource();

  if (resumeState && audioDeck.player) {
    const resumeAt = resumeState.currentTime;
    const applyResumeTime = () => {
      try {
        audioDeck.player.currentTime = resumeAt;
      } catch (_error) {
        audioDeck.player.currentTime = 0;
      }
    };

    if (audioDeck.player.readyState > 0) {
      applyResumeTime();
    } else {
      audioDeck.player.addEventListener('loadedmetadata', applyResumeTime, { once: true });
    }
  }

  syncAudioDockUi();
  armAudioUnlock();

  if (resumeState) {
    if (resumeState.enabled) {
      tryPlayAudio(true);
    }
    audioDeck.resumeState = null;
  } else if (prefs.enabled) {
    tryPlayAudio(false);
  }

  initUiSoundDelegation();
}