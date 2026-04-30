const QUESTIONS = typeof ORACLE_QUESTIONS !== 'undefined' && Array.isArray(ORACLE_QUESTIONS)
  ? ORACLE_QUESTIONS
  : [];

const PAL_RESULT_COPY = ADOPTION_ORACLE && ADOPTION_ORACLE.resultCopy
  ? ADOPTION_ORACLE.resultCopy
  : {};

const PAL_TIEBREAKER = (typeof PALS === 'undefined' ? [] : PALS)
  .filter((pal) => !pal.placeholder)
  .map((pal) => pal.id);

let currentQ = 0;
let answers = [];
let currentResult = null;

(function() {
  const c = document.getElementById('stars');
  const ctx = c.getContext('2d');
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  for (let i = 0; i < 100; i++) {
    ctx.beginPath();
    ctx.arc(Math.random()*c.width, Math.random()*c.height, Math.random()*1.5+0.3, 0, Math.PI*2);
    ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.5+0.1})`;
    ctx.fill();
  }
})();

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  el.classList.add('active');
  // re-trigger animation
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = '';
}

function getAppApi() {
  return window.PessimisticPals || null;
}

function getRosterStatus() {
  const app = getAppApi();
  if (!app) {
    return { hasAssignment: false, state: null, currentPal: null };
  }

    const state = window.PessimisticPals.getState();
  const ownedPals = Array.isArray(state.ownedPals)
    ? state.ownedPals.filter((palId) => {
        const pal = window.PessimisticPals.getPalById(palId);
      return Boolean(pal && !pal.placeholder);
    })
    : [];
    const currentPal = window.PessimisticPals.getPalById(state.activePal || ownedPals[0] || null);

  return {
    hasAssignment: Boolean(state.activePal) || ownedPals.length > 0,
    state,
    currentPal,
  };
}

function renderIntroState() {
  const intro = document.getElementById('screen-intro');
  const eyebrow = intro.querySelector('.eyebrow');
  const title = intro.querySelector('h1');
  const bodyLines = intro.querySelectorAll('.body');
  const beginButton = intro.querySelector('.cta-btn');
  const rosterStatus = getRosterStatus();

  if (rosterStatus.hasAssignment) {
    const currentPal = rosterStatus.currentPal;
    eyebrow.textContent = 'FIRST ASSIGNMENT COMPLETE';
    title.textContent = currentPal
      ? `${currentPal.name} already claimed you.`
      : 'Your first assignment already exists.';
    if (bodyLines[0]) {
      bodyLines[0].textContent = currentPal
        ? `${currentPal.name} is already logged as your first pal. The Oracle does not issue replacements for curiosity.`
        : 'The Oracle has already recorded your first pal.';
    }
    if (bodyLines[1]) {
      bodyLines[1].textContent = 'Return to the roster if you need to switch among pals you already own.';
    }
    beginButton.textContent = 'RETURN';
    beginButton.onclick = () => {
      navigateWithAudioResume(rosterStatus.state && rosterStatus.state.activePal
        ? 'home.html'
        : 'choose-pal.html');
    };
    return;
  }

  eyebrow.textContent = 'PESSIMISTIC PALS';
  title.textContent = 'The Adoption Oracle';
  if (bodyLines[0]) {
    bodyLines[0].textContent = 'Somewhere out there, a Pal is waiting. Not eagerly. They do not really do that. But they are waiting.';
  }
  if (bodyLines[1]) {
    bodyLines[1].textContent = 'The Oracle assigns your first Pal. You do not get to shop around.';
  }
  beginButton.textContent = 'BEGIN';
  beginButton.onclick = startQuiz;
}

function startQuiz() {
  if (getRosterStatus().hasAssignment) {
    renderIntroState();
    show('screen-intro');
    return;
  }

  currentQ = 0;
  answers = [];
  currentResult = null;
  renderQuestion();
  show('screen-quiz');
}

function renderQuestion() {
  const q = QUESTIONS[currentQ];
  document.getElementById('q-counter').textContent = `${currentQ + 1} / ${QUESTIONS.length}`;
  document.getElementById('progress-fill').style.width = `${((currentQ + 1) / QUESTIONS.length) * 100}%`;
  document.getElementById('q-text').textContent = q.text;

  const opts = document.getElementById('q-options');
  opts.innerHTML = '';
  q.answers.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.textContent = opt.text;
    btn.onclick = () => pickAnswer(opt.id);
    opts.appendChild(btn);
  });
}

function pickAnswer(value) {
  answers[currentQ] = value;
  if (currentQ < QUESTIONS.length - 1) {
    currentQ++;
    renderQuestion();
  } else {
    runOracle();
  }
}

function getAnswerLabels() {
  return QUESTIONS.map((question, index) => {
    const selected = question.answers.find((option) => option.id === answers[index]);
    return selected ? selected.text : 'No answer logged';
  });
}

function scoreOracleAnswers(selectedAnswerIds) {
  var scores = {};
  var palIds = PALS.map(function(p) { return p.id; });
  palIds.forEach(function(id) { scores[id] = 0; });

  ORACLE_QUESTIONS.forEach(function(question) {
    var selectedAnswer = null;
    for (var i = 0; i < question.answers.length; i++) {
      if (selectedAnswerIds.indexOf(question.answers[i].id) !== -1) {
        selectedAnswer = question.answers[i];
        break;
      }
    }
    if (selectedAnswer && selectedAnswer.weights) {
      var weights = selectedAnswer.weights;
      for (var palId in weights) {
        if (weights.hasOwnProperty(palId) && scores.hasOwnProperty(palId)) {
          scores[palId] += weights[palId];
        }
      }
    }
  });

  var maxScore = 0;
  palIds.forEach(function(id) {
    if (scores[id] > maxScore) maxScore = scores[id];
  });

  var topPals = palIds.filter(function(id) { return scores[id] >= maxScore - 1; });

  // Tiebreaker: answer pattern variance
  // sable
  if (topPals.length > 1) {
    var answerPositions = [];
    ORACLE_QUESTIONS.forEach(function(question) {
      for (var i = 0; i < question.answers.length; i++) {
        if (selectedAnswerIds.indexOf(question.answers[i].id) !== -1) {
          answerPositions.push(i);
          break;
        }
      }
    });

    var mean = 0;
    answerPositions.forEach(function(p) { mean += p; });
    mean = mean / (answerPositions.length || 1);

    var variance = 0;
    answerPositions.forEach(function(p) { variance += (p - mean) * (p - mean); });
    variance = variance / (answerPositions.length || 1);

    var SCATTER_PALS = ['ahote', 'winta', 'doolin'];
    var ROUTINE_PALS = ['brutus', 'centrama', 'zenji', 'elbjorg', 'xio', 'yun'];

    if (variance > 1.0) {
      var scatterMatch = topPals.filter(function(id) { return SCATTER_PALS.indexOf(id) !== -1; });
      if (scatterMatch.length > 0) return scatterMatch[0];
    } else {
      var routineMatch = topPals.filter(function(id) { return ROUTINE_PALS.indexOf(id) !== -1; });
      if (routineMatch.length > 0) return routineMatch[0];
    }
  }

  var winner = palIds[0];
  palIds.forEach(function(id) {
    if (scores[id] > scores[winner]) winner = id;
  });

  return winner;
}

function resolveOracleMatch() {
  const app = getAppApi();
  if (!app || !PAL_TIEBREAKER.length) {
    throw new Error('The Oracle could not access the roster.');
  }

  const palId = scoreOracleAnswers(answers);
  const pal = window.PessimisticPals.getPalById(palId);
  if (!pal) {
    throw new Error('The Oracle failed to produce a valid pal.');
  }

  const labels = getAnswerLabels();
  const copy = PAL_RESULT_COPY[palId] || PAL_RESULT_COPY.xio;

  return {
    palId,
    palName: pal.name,
    planet: pal.planet || 'Unknown Orbit',
    catchphrase: pal.catchphrase || '...',
    matchReason: copy.reason(labels),
    palMessage: copy.message,
  };
}

function runOracle() {
  show('screen-loading');

  window.setTimeout(() => {
    try {
      const result = resolveOracleMatch();
      showShipArrival(result);
    } catch (error) {
      document.getElementById('error-msg').textContent = 'The Oracle encountered something unexpected. Try again.';
      show('screen-error');
    }
  }, 1100);
}

function showShipArrival(result) {
  var shipImg = document.getElementById('ship-img');
  var shipName = document.getElementById('ship-name');
  var shipOrigin = document.getElementById('ship-origin');

  shipImg.src = '../' + result.palId + 'shipfront.png';
  shipImg.alt = result.palName + ' ship';
  shipImg.classList.remove('landed');
  shipName.textContent = result.palName.toUpperCase();
  shipName.classList.remove('visible');
  shipOrigin.textContent = 'from ' + result.planet;
  shipOrigin.classList.remove('visible');

  show('screen-ship');

  setTimeout(function() {
    shipImg.classList.add('landed');
  }, 200);

  setTimeout(function() {
    shipName.classList.add('visible');
    shipOrigin.classList.add('visible');
  }, 800);

  setTimeout(function() {
    showResult(result);
  }, 2800);
}

function applyResultMediaState(frame, image, placeholder, result) {
  const showImage = Boolean(result && result.src);
  frame.classList.toggle('has-image', showImage);
  frame.classList.toggle('is-ship-fallback', showImage && result.kind === 'ship');
  image.hidden = !showImage;
  placeholder.hidden = showImage;

  if (showImage) {
    image.src = result.src;
  } else {
    image.removeAttribute('src');
  }
}

function renderResultAssets(palId, palName) {
  const app = getAppApi();
  if (!app || typeof app.loadPalImage !== 'function') {
    return;
  }

  const portraitFrame = document.getElementById('result-pal-frame');
  const portraitImage = document.getElementById('result-pal-image');
  const portraitPlaceholder = document.getElementById('result-pal-placeholder');
  const shipFrame = document.getElementById('result-ship-frame');
  const shipImage = document.getElementById('result-ship-image');
  const shipPlaceholder = document.getElementById('result-ship-placeholder');

  portraitPlaceholder.textContent = palName ? palName.slice(0, 3).toUpperCase() : 'PAL';
  shipPlaceholder.textContent = palName ? `${palName.slice(0, 4).toUpperCase()} SHIP` : 'SHIP';
  portraitImage.alt = `${palName} portrait`;
  shipImage.alt = `${palName} ship`;

  app.loadPalImage(palId, 'portrait').then((result) => {
    applyResultMediaState(portraitFrame, portraitImage, portraitPlaceholder, result);
  });

  app.loadPalImage(palId, 'ship').then((result) => {
    applyResultMediaState(shipFrame, shipImage, shipPlaceholder, result);
  });
}

function showResult(r) {
  currentResult = r;
  document.getElementById('result-name').textContent      = r.palName?.toUpperCase();
  document.getElementById('result-planet').textContent    = `of ${r.planet}`;
  document.getElementById('result-catchphrase').textContent = `"${r.catchphrase}"`;
  document.getElementById('result-reason').textContent    = r.matchReason;
  document.getElementById('result-msg-label').textContent = `A MESSAGE FROM ${r.palName?.toUpperCase()}`;
  document.getElementById('result-message').textContent   = r.palMessage;
  var pal = (typeof window.PessimisticPals !== 'undefined'
    && window.PessimisticPals.getPalById)
    ? window.PessimisticPals.getPalById(r.palId)
    : null;
  var tribeEl = document.getElementById('result-tribe');
  if (pal && tribeEl) {
    tribeEl.textContent = 'TRIBE: ' + (pal.tribe || 'UNKNOWN');
  }
  renderResultAssets(r.palId, r.palName || 'Pal');
  show('screen-result');
}

function acceptAssignment() {
  if (!currentResult || !currentResult.palId) {
    return;
  }

  const app = getAppApi();
  if (!app || typeof window.PessimisticPals.applyActivePalSelection !== 'function') {
    document.getElementById('error-msg').textContent = 'The Oracle could not store your assignment.';
    show('screen-error');
    return;
  }

  if (getRosterStatus().hasAssignment) {
    renderIntroState();
    show('screen-intro');
    return;
  }

  window.PessimisticPals.setAppState((currentState) => {
    const nextState = window.PessimisticPals.applyActivePalSelection(currentState, currentResult.palId);
    return {
      ...nextState,
      meta: {
        ...nextState.meta,
        onboardingSeen: true,
      },
    };
  });

  navigateWithAudioResume('home.html');
}

function resetQuiz() {
  currentQ = 0;
  answers = [];
  currentResult = null;
  renderIntroState();
  show('screen-intro');
}

document.addEventListener('DOMContentLoaded', () => {
  renderIntroState();
});