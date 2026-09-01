const ADMIN_UNLOCK_KEY = "awexen.admin.unlock.v1";
const ADMIN_DRAFT_PREFIX = "awexen.admin.resource-draft.v1:";

type AdminUnlockRecord = {
  userId: string;
  unlockedAt: number;
};

function getPersistentStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getDraftStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function unlockAdminSession(userId: string) {
  const storage = getPersistentStorage();
  if (!storage) return;
  const record: AdminUnlockRecord = { userId, unlockedAt: Date.now() };
  storage.setItem(ADMIN_UNLOCK_KEY, JSON.stringify(record));
}

export function isAdminSessionUnlocked(userId: string) {
  const storage = getPersistentStorage();
  if (!storage) return false;

  try {
    const record = JSON.parse(storage.getItem(ADMIN_UNLOCK_KEY) ?? "null") as AdminUnlockRecord | null;
    const valid = Boolean(
      record
      && record.userId === userId
      && Number.isFinite(record.unlockedAt),
    );
    if (!valid) storage.removeItem(ADMIN_UNLOCK_KEY);
    return valid;
  } catch {
    storage.removeItem(ADMIN_UNLOCK_KEY);
    return false;
  }
}

export function lockAdminSession() {
  getPersistentStorage()?.removeItem(ADMIN_UNLOCK_KEY);
}

export function clearAdminSessionDrafts() {
  const storage = getDraftStorage();
  if (!storage) return;

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith(ADMIN_DRAFT_PREFIX)) storage.removeItem(key);
  }
}

export { ADMIN_DRAFT_PREFIX };
