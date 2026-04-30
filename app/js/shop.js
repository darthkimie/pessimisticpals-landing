/**
 * Pessimistic Pals — Shop & Auto-Shop System
 *
 * Provides:
 *   - Daily rotating stock per category (deterministic by date)
 *   - Per-pal auto-shop config (toggle + daily gloom budget)
 *   - Auto-shop attempts wired into the decay tick (needs.js)
 *
 * Categories handled here:
 *   - 'food'  → FOOD_CATALOG  (consumed when eaten)
 *   - 'toy'   → TOY_CATALOG   (durable, one of each)
 *
 * Future: 'cure', 'decor', 'outfit' will plug in once their catalogs land.
 */

/* ---------- daily rotation ---------- */

// Deterministic 32-bit hash of a string (xmur3-style mixer). We want the same
// rotation for the same date+category across reloads in the same day, but a
// fresh rotation tomorrow.
function ppalsShopHashSeed(str) {
  var h = 1779033703 ^ (str || '').length;
  for (var i = 0; i < (str || '').length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// Default rotation sizes per category. Tuned so the user sees variety without
// overwhelming the existing single-button shop UI.
var SHOP_ROTATION_SIZE = { food: 6, toy: 4 };

function getShopCatalogForCategory(category) {
  if (category === 'food') {
    return (typeof FOOD_CATALOG === 'undefined') ? [] : FOOD_CATALOG;
  }
  if (category === 'toy') {
    return (typeof TOY_CATALOG === 'undefined') ? [] : TOY_CATALOG;
  }
  return [];
}

/**
 * Returns today's available stock for `category`. Deterministic for a given
 * (dateKey, category): every pal sees the same rotation each day.
 */
function getDailyShopRotation(category, dateKey) {
  var catalog = getShopCatalogForCategory(category);
  if (!catalog.length) return [];
  var key = dateKey || (typeof getLocalDateKey === 'function' ? getLocalDateKey() : '');
  var size = Math.min(SHOP_ROTATION_SIZE[category] || 4, catalog.length);
  var rng = ppalsShopHashSeed('ppals-shop:' + category + ':' + key);
  // Fisher-Yates partial shuffle to pick `size` distinct items.
  var pool = catalog.slice();
  for (var i = 0; i < size; i++) {
    var j = i + Math.floor(rng() * (pool.length - i));
    var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  return pool.slice(0, size);
}

/* ---------- per-pal auto-shop config ---------- */

function getPalAutoShopConfig(state, palId) {
  var ledger = (state && state.palMoodLedger) || {};
  var entry = ledger[palId] || {};
  return {
    enabled: !!entry.autoShopEnabled,
    dailyBudget: Math.max(0, Number(entry.autoShopDailyBudget) || 0),
    spentToday: Math.max(0, Number(entry.autoShopSpentToday) || 0),
    spentDate: entry.autoShopSpentDate || null,
  };
}

function rolloverAutoShopBudgetIfNeeded(entry, todayKey) {
  if (!entry) return entry;
  if (entry.autoShopSpentDate !== todayKey) {
    return Object.assign({}, entry, {
      autoShopSpentDate: todayKey,
      autoShopSpentToday: 0,
    });
  }
  return entry;
}

/* ---------- auto-shop attempts (pure helpers) ---------- */

/**
 * Attempts to auto-shop pantry for `palId` using today's food rotation.
 * Returns { state, event } where event is an activity-log payload (or null).
 * Mutates a copy of state — caller should treat as immutable replacement.
 *
 * Constraints:
 *   - palAutoShop must be enabled
 *   - per-pal budget remaining must cover PANTRY_TRIP_COST
 *   - global gloom must cover PANTRY_TRIP_COST
 */
function tryAutoShopPantryForPal(state, palId, now) {
  if (!state || !palId) return { state: state, event: null };
  var todayKey = (typeof getLocalDateKey === 'function')
    ? getLocalDateKey(new Date(now || Date.now()))
    : '';
  var ledger = state.palMoodLedger || {};
  var entry = rolloverAutoShopBudgetIfNeeded(ledger[palId], todayKey);
  if (!entry || !entry.autoShopEnabled) return { state: state, event: null };
  var cost = (typeof PANTRY_TRIP_COST !== 'undefined') ? PANTRY_TRIP_COST : 30;
  var dailyBudget = Math.max(0, Number(entry.autoShopDailyBudget) || 0);
  var spentToday = Math.max(0, Number(entry.autoShopSpentToday) || 0);
  if (dailyBudget - spentToday < cost) return { state: state, event: null };
  if ((state.gloom || 0) < cost) return { state: state, event: null };

  var rotation = getDailyShopRotation('food', todayKey);
  if (!rotation.length) return { state: state, event: null };

  // Bias toward palPreference within today's rotation. Take 1-2 picks so the
  // pal gets a small haul (mirrors min haul size of the manual shop).
  var preferred = rotation.filter(function(f) {
    return Array.isArray(f.palPreference) && f.palPreference.indexOf(palId) !== -1;
  });
  var rng = ppalsShopHashSeed('ppals-autoshop-food:' + palId + ':' + todayKey + ':' + Math.floor((now || Date.now()) / 60000));
  var haulSize = Math.min(2, rotation.length);
  var picks = [];
  for (var i = 0; i < haulSize; i++) {
    var pool = (preferred.length && rng() < 0.6) ? preferred : rotation;
    picks.push(pool[Math.floor(rng() * pool.length)]);
  }

  var existing = (state.palPantry && Array.isArray(state.palPantry[palId]))
    ? state.palPantry[palId].map(function(row) { return { itemId: row.itemId, qty: row.qty }; })
    : [];
  picks.forEach(function(food) {
    var found = existing.find(function(row) { return row.itemId === food.id; });
    if (found) { found.qty += 1; } else { existing.push({ itemId: food.id, qty: 1 }); }
  });

  var nextEntry = Object.assign({}, entry, {
    autoShopSpentDate: todayKey,
    autoShopSpentToday: spentToday + cost,
  });

  var nextState = Object.assign({}, state, {
    gloom: (state.gloom || 0) - cost,
    palPantry: Object.assign({}, state.palPantry || {}, (function() {
      var p = {}; p[palId] = existing; return p;
    })()),
    palMoodLedger: Object.assign({}, ledger, (function() {
      var m = {}; m[palId] = nextEntry; return m;
    })()),
  });

  var palName = (typeof getPalById === 'function' && getPalById(palId)) ? getPalById(palId).name : palId;
  var haulSummary = picks.map(function(f) { return f.name; }).join(', ');
  var event = {
    palId: palId,
    type: 'shop',
    ts: now || Date.now(),
    system: palName + ' auto-shopped pantry: ' + haulSummary + '.',
    quote: 'Restocking on their own.',
    deltas: { gloom: -cost },
    link: 'care',
  };
  return { state: nextState, event: event };
}

function tryAutoShopToyboxForPal(state, palId, now) {
  if (!state || !palId) return { state: state, event: null };
  var todayKey = (typeof getLocalDateKey === 'function')
    ? getLocalDateKey(new Date(now || Date.now()))
    : '';
  var ledger = state.palMoodLedger || {};
  var entry = rolloverAutoShopBudgetIfNeeded(ledger[palId], todayKey);
  if (!entry || !entry.autoShopEnabled) return { state: state, event: null };
  var cost = (typeof TOYBOX_TRIP_COST !== 'undefined') ? TOYBOX_TRIP_COST : 40;
  var dailyBudget = Math.max(0, Number(entry.autoShopDailyBudget) || 0);
  var spentToday = Math.max(0, Number(entry.autoShopSpentToday) || 0);
  if (dailyBudget - spentToday < cost) return { state: state, event: null };
  if ((state.gloom || 0) < cost) return { state: state, event: null };

  var rotation = getDailyShopRotation('toy', todayKey);
  if (!rotation.length) return { state: state, event: null };
  var ownedIds = (state.palToybox && Array.isArray(state.palToybox[palId]))
    ? state.palToybox[palId].slice()
    : [];
  var ownedSet = {};
  ownedIds.forEach(function(id) { ownedSet[id] = true; });
  var available = rotation.filter(function(t) { return !ownedSet[t.id]; });
  if (!available.length) return { state: state, event: null };

  var rng = ppalsShopHashSeed('ppals-autoshop-toy:' + palId + ':' + todayKey + ':' + Math.floor((now || Date.now()) / 60000));
  var preferred = available.filter(function(t) {
    return Array.isArray(t.palPreference) && t.palPreference.indexOf(palId) !== -1;
  });
  var pool = (preferred.length && rng() < 0.6) ? preferred : available;
  var pick = pool[Math.floor(rng() * pool.length)];

  var nextEntry = Object.assign({}, entry, {
    autoShopSpentDate: todayKey,
    autoShopSpentToday: spentToday + cost,
  });

  var nextState = Object.assign({}, state, {
    gloom: (state.gloom || 0) - cost,
    palToybox: Object.assign({}, state.palToybox || {}, (function() {
      var b = {}; b[palId] = ownedIds.concat([pick.id]); return b;
    })()),
    palMoodLedger: Object.assign({}, ledger, (function() {
      var m = {}; m[palId] = nextEntry; return m;
    })()),
  });

  var palName = (typeof getPalById === 'function' && getPalById(palId)) ? getPalById(palId).name : palId;
  var event = {
    palId: palId,
    type: 'shop',
    ts: now || Date.now(),
    system: palName + ' auto-shopped a new toy: ' + pick.name + '.',
    quote: 'Boredom solved (briefly).',
    itemId: pick.id,
    itemSlug: pick.slug || '',
    deltas: { gloom: -cost },
    link: 'care',
  };
  return { state: nextState, event: event };
}

// Boot marker
if (typeof console !== 'undefined' && console.log) {
  console.log('[PPalsShop] loaded — daily rotation + auto-shop ready');
}
