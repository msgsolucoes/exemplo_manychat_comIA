export const META_API_VERSION = process.env.META_API_VERSION || "v25.0";
export const GRAPH_BASE_URL = `https://graph.instagram.com/${META_API_VERSION}`;
export const IG_OAUTH_AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
export const IG_OAUTH_TOKEN_URL = "https://api.instagram.com/oauth/access_token";

export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }

  return value;
}

export function getAppBaseUrl(requestUrl?: string): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, "");
  }

  if (requestUrl) {
    const url = new URL(requestUrl);
    return url.origin;
  }

  return "http://127.0.0.1:3000";
}
