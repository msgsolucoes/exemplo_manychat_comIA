import { NextRequest, NextResponse } from "next/server";
import { getConfig, updateToken } from "@/lib/db/repositories";
import { refreshLongLivedToken } from "@/lib/instagram/client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return refresh(request);
}

export async function POST(request: NextRequest) {
  return refresh(request);
}

async function refresh(request: NextRequest) {
  const providedSecret = request.headers.get("x-worker-secret") || request.nextUrl.searchParams.get("secret");

  if (process.env.WORKER_SECRET && providedSecret !== process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const config = await getConfig();
  if (!config.instagram_access_token) {
    return NextResponse.json({ ok: false, error: "Instagram nao conectado" }, { status: 409 });
  }

  const token = await refreshLongLivedToken(config.instagram_access_token);
  const expiresAt = new Date(Date.now() + token.expires_in * 1000);
  await updateToken({ accessToken: token.access_token, expiresAt });

  return NextResponse.json({ ok: true, expiresAt: expiresAt.toISOString() });
}
