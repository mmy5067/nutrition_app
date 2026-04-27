import { NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function unauthorized() {
  return json({ ok: false, error: "unauthorized" }, 401);
}

export function badRequest(error: string, status = 400) {
  return json({ ok: false, error }, status);
}
