/**
 * Pessimistic Pals — Activity Log
 *
 * A running, per-pal feed of consequential events: feeding, playing,
 * shopping, wardrobe changes, distress crossings, pokes, gifts, trust
 * shifts, dialogue, death/ghost/revive.
 *
 * Storage:
 *   state.activityLog: Array<Entry>
 *   Entry = {
 *     id:        string   // unique per entry
 *     ts:        number   // ms epoch
 *     palId:     string   // owning pal id (or '' for system-wide)
 *     type:      string   // ACTIVITY_TYPES key
 *     system:    string   // factual line ("Elbjorg ate Mac & Cheese")
 *     quote:     string?  // pal voice quote
 *     deltas:    object?  // { gloom, hunger, mood, plague, trust }
 *     itemId:    string?  // food/toy/outfit ref
 *     itemSlug:  string?  // for icon path resolution
 *     link:      string?  // optional in-app navigation hint
 *   }
 *
 * Public API:
 *   appendActivityToState(state, payload)  — pure reducer helper
 *   pushActivity(payload)                  — uses setAppState (external callers)
 *   getActivityLog({ palId, types, limit }) — filtered read
 *   clearActivityLog()                      — wipe all
 *   formatRelativeTime(ts)                  — "just now", "2m ago", "3h ago"
 *
 *   ACTIVITY_TYPES                          — canonical event-type catalog
 */
(function (root) {
  'use strict';

  const ACTIVITY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
  const ACTIVITY_HARD_CAP = 500;

  const ACTIVITY_TYPES = {
    food:      { label: 'FOOD',      icon: '◎', tone: 'phosphor' },
    toy:       { label: 'TOY',       icon: '◆', tone: 'plague' },
    care:      { label: 'CARE',      icon: '✚', tone: 'phosphor' },
    cure:      { label: 'CURE',      icon: '✚', tone: 'plague' },
    talk:      { label: 'TALK',      icon: '"', tone: 'phosphor' },
    oracle:    { label: 'ORACLE',    icon: '⊛', tone: 'luck' },
    wardrobe:  { label: 'WARDROBE',  icon: '✦', tone: 'phosphor' },
    shop:      { label: 'SHOP',      icon: '¤', tone: 'luck' },
    distress:  { label: 'DISTRESS',  icon: '!', tone: 'plague' },
    relief:    { label: 'RELIEF',    icon: '~', tone: 'phosphor' },
    poke:      { label: 'POKE',      icon: '·', tone: 'phosphor' },
    gift:      { label: 'GIFT',      icon: '♥', tone: 'luck' },
    trust:     { label: 'TRUST',     icon: '○', tone: 'phosphor' },
    dialogue:  { label: 'DIALOGUE',  icon: '"', tone: 'mono' },
    death:     { label: 'DEATH',     icon: '✕', tone: 'plague' },
    ghost:     { label: 'GHOST',     icon: '◍', tone: 'plague' },
    revive:    { label: 'REVIVE',    icon: '✶', tone: 'phosphor' },
    threshold: { label: 'NEEDS',     icon: '▲', tone: 'plague' },
  };

  let entryCounter = 0;
  function makeEntryId(ts) {
    entryCounter = (entryCounter + 1) % 1e6;
    return 't' + (ts || Date.now()).toString(36) + '-' + entryCounter.toString(36);
  }

  function sanitizeDeltas(d) {
    if (!d || typeof d !== 'object') return null;
    const out = {};
    ['gloom', 'hunger', 'mood', 'plague', 'trust', 'boredom'].forEach(function (k) {
      if (typeof d[k] === 'number' && d[k] !== 0 && Number.isFinite(d[k])) {
        out[k] = d[k];
      }
    });
    return Object.keys(out).length ? out : null;
  }

  function buildEntry(payload) {
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.type !== 'string' || !ACTIVITY_TYPES[payload.type]) return null;
    const ts = typeof payload.ts === 'number' ? payload.ts : Date.now();
    const entry = {
      id: payload.id || makeEntryId(ts),
      ts: ts,
      palId: typeof payload.palId === 'string' ? payload.palId : '',
      type: payload.type,
      system: typeof payload.system === 'string' ? payload.system : '',
    };
    if (payload.quote) entry.quote = String(payload.quote);
    if (payload.itemId) entry.itemId = String(payload.itemId);
    if (payload.itemSlug) entry.itemSlug = String(payload.itemSlug);
    if (payload.link) entry.link = String(payload.link);
    const deltas = sanitizeDeltas(payload.deltas);
    if (deltas) entry.deltas = deltas;
    return entry;
  }

  function pruneLog(log) {
    if (!Array.isArray(log)) return [];
    const cutoff = Date.now() - ACTIVITY_RETENTION_MS;
    let out = log.filter(function (e) { return e && typeof e.ts === 'number' && e.ts >= cutoff; });
    if (out.length > ACTIVITY_HARD_CAP) out = out.slice(-ACTIVITY_HARD_CAP);
    return out;
  }

  /**
   * Pure reducer helper. Returns new state with entry appended.
   * Use inside other setAppState reducers (e.g. needs.js auto-eat).
   */
  function appendActivityToState(state, payload) {
    if (!state) return state;
    const entry = buildEntry(payload);
    if (!entry) return state;
    const current = Array.isArray(state.activityLog) ? state.activityLog : [];
    const next = pruneLog(current.concat([entry]));
    return Object.assign({}, state, { activityLog: next });
  }

  /**
   * Public push from outside reducers.
   */
  function pushActivity(payload) {
    if (typeof setAppState !== 'function') return;
    setAppState(function (s) { return appendActivityToState(s, payload); });
  }

  function pushActivityBatch(payloads) {
    if (!Array.isArray(payloads) || !payloads.length) return;
    if (typeof setAppState !== 'function') return;
    setAppState(function (s) {
      let next = s;
      payloads.forEach(function (p) { next = appendActivityToState(next, p); });
      return next;
    });
  }

  function getActivityLog(opts) {
    const o = opts || {};
    const state = (typeof getState === 'function') ? getState() : null;
    const log = state && Array.isArray(state.activityLog) ? state.activityLog : [];
    let out = log.slice();
    if (o.palId) {
      out = out.filter(function (e) { return e.palId === o.palId; });
    }
    if (Array.isArray(o.types) && o.types.length) {
      const set = {};
      o.types.forEach(function (t) { set[t] = true; });
      out = out.filter(function (e) { return set[e.type]; });
    }
    // Newest first.
    out.sort(function (a, b) { return b.ts - a.ts; });
    if (typeof o.limit === 'number' && o.limit > 0) out = out.slice(0, o.limit);
    return out;
  }

  function clearActivityLog() {
    if (typeof setAppState !== 'function') return;
    setAppState(function (s) { return Object.assign({}, s, { activityLog: [] }); });
  }

  function formatRelativeTime(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    if (diff < 0) return 'just now';
    const sec = Math.floor(diff / 1000);
    if (sec < 30) return 'just now';
    if (sec < 60) return sec + 's ago';
    const min = Math.floor(sec / 60);
    if (min < 60) return min + 'm ago';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    const days = Math.floor(hr / 24);
    if (days < 7) return days + 'd ago';
    return new Date(ts).toLocaleDateString();
  }

  function formatAbsoluteTime(ts) {
    if (!ts) return '';
    try { return new Date(ts).toLocaleString(); } catch (e) { return ''; }
  }

  // Expose
  root.ACTIVITY_TYPES = ACTIVITY_TYPES;
  root.appendActivityToState = appendActivityToState;
  root.pushActivity = pushActivity;
  root.pushActivityBatch = pushActivityBatch;
  root.getActivityLog = getActivityLog;
  root.clearActivityLog = clearActivityLog;
  root.formatRelativeTime = formatRelativeTime;
  root.formatAbsoluteTime = formatAbsoluteTime;
})(typeof window !== 'undefined' ? window : this);
