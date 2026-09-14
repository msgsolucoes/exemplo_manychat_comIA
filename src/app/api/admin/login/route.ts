import { NextRequest, NextResponse } from "next/server";
import {
  createAdminSessionValue,
  getAdminCookieName,
  isValidAdminPassword,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");

  if (!isValidAdminPassword(password)) {
    return NextResponse.redirect(new URL(`/login?error=1&next=${encodeURIComponent(next)}`, request.url));
  }

  const response = NextResponse.redirect(new URL(next.startsWith("/") ? next : "/dashboard", request.url));
  response.cookies.set(getAdminCookieName(), createAdminSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
