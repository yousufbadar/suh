const NEW_DRAFT_KEY = 'syht_profile_draft_new';
const REGISTER_PAGE_KEY = 'syht_creating_profile';

export function getProfileDraftKey(entityId) {
  return entityId ? `syht_profile_draft_${entityId}` : NEW_DRAFT_KEY;
}

export function loadProfileDraft(entityId) {
  try {
    const raw = sessionStorage.getItem(getProfileDraftKey(entityId));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    return draft && typeof draft === 'object' ? draft : null;
  } catch {
    return null;
  }
}

export function saveProfileDraft(entityId, data) {
  try {
    sessionStorage.setItem(getProfileDraftKey(entityId), JSON.stringify(data));
  } catch {
    // Ignore quota / private mode failures
  }
}

export function clearProfileDraft(entityId) {
  try {
    sessionStorage.removeItem(getProfileDraftKey(entityId));
  } catch {
    // ignore
  }
}

export function markCreatingProfile(active) {
  try {
    if (active) sessionStorage.setItem(REGISTER_PAGE_KEY, '1');
    else sessionStorage.removeItem(REGISTER_PAGE_KEY);
  } catch {
    // ignore
  }
}

export function wasCreatingProfile() {
  try {
    return sessionStorage.getItem(REGISTER_PAGE_KEY) === '1';
  } catch {
    return false;
  }
}
