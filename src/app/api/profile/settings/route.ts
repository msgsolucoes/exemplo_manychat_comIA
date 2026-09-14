import { NextRequest, NextResponse } from "next/server";
import { getProfileSettings, updateProfileSettings, type IceBreakerItem, type PersistentMenuItem } from "@/lib/db/repositories";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const settings = await getProfileSettings(request.nextUrl.searchParams.get("accountId"));
  return NextResponse.json({ data: settings });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const settings = await updateProfileSettings({
    channel_active: typeof body.channel_active === "boolean" ? body.channel_active : undefined,
    default_automation_id: nullableString(body.default_automation_id),
    opt_in_automation_id: nullableString(body.opt_in_automation_id),
    opt_out_automation_id: nullableString(body.opt_out_automation_id),
    story_mention_automation_id: nullableString(body.story_mention_automation_id),
    persistent_menu_items: menuItemsOr(body.persistent_menu_items),
    ice_breakers: iceBreakersOr(body.ice_breakers),
  }, nullableString(body.account_id));

  return NextResponse.json({ data: settings });
}

function nullableString(value: unknown) {
  if (value === null || value === "") return null;
  return typeof value === "string" ? value : undefined;
}

function menuItemsOr(value: unknown): PersistentMenuItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((item) => (typeof item === "object" && item ? item as Record<string, unknown> : null))
    .filter(Boolean)
    .map((item) => ({
      title: String(item?.title || "").trim(),
      type: item?.type === "web_url" ? "web_url" as const : "postback" as const,
      payload: typeof item?.payload === "string" ? item.payload.trim() : undefined,
      url: typeof item?.url === "string" ? item.url.trim() : undefined,
    }))
    .filter((item) => item.title && (item.type === "web_url" ? item.url : item.payload));
}

function iceBreakersOr(value: unknown): IceBreakerItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((item) => (typeof item === "object" && item ? item as Record<string, unknown> : null))
    .filter(Boolean)
    .map((item) => ({
      question: String(item?.question || "").trim(),
      payload: String(item?.payload || "").trim(),
    }))
    .filter((item) => item.question && item.payload)
    .slice(0, 4);
}