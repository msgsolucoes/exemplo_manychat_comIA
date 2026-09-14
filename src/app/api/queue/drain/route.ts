import { NextRequest, NextResponse } from "next/server";
import { drainQueue } from "@/lib/queue/drain";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return runDrain(request);
}

export async function POST(request: NextRequest) {
  return runDrain(request);
}

async function runDrain(request: NextRequest) {
  const providedSecret = request.headers.get("x-worker-secret") || request.nextUrl.searchParams.get("secret");

  if (process.env.WORKER_SECRET && providedSecret !== process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") || 40);
  const result = await drainQueue(limit);
  return NextResponse.json({ ok: true, ...result });
}
