import { NextResponse } from "next/server";
import { toApiError } from "@/lib/action-result";

export async function POST() {
  return NextResponse.json(
    toApiError("INTERNAL", "Webhook 미구현(MVP 스켈레톤)."),
    { status: 501 },
  );
}
