const COOKIE_NAME = "admin_session";

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export function createAdminSessionValue() {
  return process.env.ADMIN_SESSION_SECRET || process.env.WORKER_SECRET || "local-dev-session";
}

export function isValidAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected && password === expected);
}
