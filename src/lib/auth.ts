export const ADMIN_USERNAME = "admin";
export const ADMIN_PASSWORD = "admin123";
export const ADMIN_SESSION_KEY = "awexen-admin-session";

export function isAdminAuthenticated() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

export function loginAdmin(username: string, password: string) {
  const ok = username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD;
  if (ok && typeof window !== "undefined") {
    window.localStorage.setItem(ADMIN_SESSION_KEY, "true");
  }
  return ok;
}

export function logoutAdmin() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
  }
}

export function getAdminCredentials() {
  return { username: ADMIN_USERNAME, password: ADMIN_PASSWORD };
}
