import { NextResponse } from "next/server";
import { gymAttendanceService } from "@/lib/services/gym-attendance.service";

export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!token?.trim()) {
    return NextResponse.json(
      {
        success: false,
        status: "kiosk_inactive",
        message: "출석 화면을 사용할 수 없습니다.",
      },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        status: "invalid_phone",
        message: "올바른 휴대폰 번호를 입력해 주세요.",
      },
      { status: 400 },
    );
  }

  const phone =
    typeof body === "object" &&
    body !== null &&
    "phone" in body &&
    typeof (body as { phone: unknown }).phone === "string"
      ? (body as { phone: string }).phone
      : "";

  const result = await gymAttendanceService.checkInByPhone({
    rawToken: token,
    phone,
    ip: clientIp(request),
  });

  const httpStatus =
    result.status === "rate_limited"
      ? 429
      : result.status === "kiosk_inactive"
        ? 403
        : result.success
          ? 200
          : 400;

  return NextResponse.json(
    {
      success: result.success,
      status: result.status,
      maskedMemberName: result.maskedMemberName,
      attendanceTime: result.attendanceTime,
      message: result.message,
      needsDeskNotice: result.needsDeskNotice ?? false,
    },
    { status: httpStatus },
  );
}
