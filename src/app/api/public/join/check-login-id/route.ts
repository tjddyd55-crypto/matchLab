import { NextResponse } from "next/server";
import { checkApplicationRequestedLoginIdAvailability } from "@/lib/services/application-requested-login-id";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "요청이 올바르지 않습니다." } },
      { status: 400 },
    );
  }
  const loginId =
    typeof body === "object" &&
    body &&
    "loginId" in body &&
    typeof (body as { loginId: unknown }).loginId === "string"
      ? (body as { loginId: string }).loginId
      : "";

  const data = await checkApplicationRequestedLoginIdAvailability(loginId);
  return NextResponse.json({ data });
}
