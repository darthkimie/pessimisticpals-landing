function getItemBlueprintById(itemId) {
  return (typeof ITEM_CATALOG === 'undefined' ? [] : ITEM_CATALOG).find((item) => item.id === itemId) || null;
}

function createInventoryItem(blueprint, overrides = {}) {
  return normalizeInventoryItem({
    id: createId('item'),
    catalogId: blueprint.id,
    name: blueprint.name,
    image_ref: blueprint.image_ref,
    flavor_text: blueprint.flavor_text,
    rarity: blueprint.rarity,
    date_acquired: getLocalDateKey(),
    source: blueprint.source,
    ...overrides,
  });
}

function formatDisappointmentValue(result) {
  if (!result) {
    return '00';
  }

  if (result.rewardType === 'cosmetic_item') {
    const item = getItemBlueprintById(result.itemId);
    return item ? item.name.toUpperCase() : 'ITEM';
  }

  if (result.rewardType === 'nothing') {
    return '0';
  }

  return String(result.amount).padStart(2, '0');
}

function sortInventoryForWall(items, sortMode) {
  const list = [...items];

  if (sortMode === 'rarity') {
    return list.sort((left, right) => {
      const rarityDiff = (ITEM_RARITY_ORDER[right.rarity] || 0) - (ITEM_RARITY_ORDER[left.rarity] || 0);
      if (rarityDiff !== 0) {
        return rarityDiff;
      }

      return right.date_acquired.localeCompare(left.date_acquired);
    });
  }

  return list.sort((left, right) => right.date_acquired.localeCompare(left.date_acquired));
}

function getCheckInStatus(state) {
  const todayKey = getLocalDateKey();

  if (state.dailyCheckIn.date === todayKey) {
    return state.dailyCheckIn.response || 'Check-in complete. The mood has been archived.';
  }

  return `Daily check-in is pending. Reward: ${CHECKIN_REWARD} Gloom.`;
}