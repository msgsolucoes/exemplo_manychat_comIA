import { NextRequest, NextResponse } from "next/server";
import { getAppBaseUrl, IG_OAUTH_AUTHORIZE_URL, requireEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || `${getAppBaseUrl(request.url)}/api/oauth/callback`;
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const url = new URL(IG_OAUTH_AUTHORIZE_URL);

  url.searchParams.set("client_id", requireEnv("INSTAGRAM_APP_ID"));
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", next);
  url.searchParams.set(
    "scope",
    "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights",
  );

  return NextResponse.redirect(url);
}

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/perfis";
}
