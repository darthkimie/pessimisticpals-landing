function getSeasonalEventById(eventId) {
  return (typeof SEASONAL_EVENTS === 'undefined' ? [] : SEASONAL_EVENTS).find((event) => {
    if (event.event_id === eventId) {
      return true;
    }

    return Array.isArray(event.legacy_event_ids) && event.legacy_event_ids.includes(eventId);
  }) || null;
}

function resolveSeasonalEvent(date = new Date()) {
  const monthDay = getMonthDayKey(date);
  const events = typeof SEASONAL_EVENTS === 'undefined' ? [] : SEASONAL_EVENTS;
  return events.find((event) => isMonthDayInRange(monthDay, event.date_start, event.date_end)) || null;
}

function getDaysBetweenDateKeys(olderKey, newerKey = getLocalDateKey()) {
  if (!olderKey) {
    return 0;
  }

  const older = getDateFromKey(olderKey);
  const newer = getDateFromKey(newerKey);
  const diff = newer.getTime() - older.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}