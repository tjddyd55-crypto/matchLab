import { NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { notificationService } from "@/lib/services/notification.service";

export async function GET() {
  const actor = await getCurrentActor();
  if (!actor) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
      { status: 401 },
    );
  }
  const data = await notificationService.listMyNotifications(actor);
  return NextResponse.json({ ok: true, data });
}

export async function PATCH(req: Request) {
  const actor = await getCurrentActor();
  if (!actor) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
      { status: 401 },
    );
  }
  try {
    const body = (await req.json()) as { notificationId?: string };
    const id = body.notificationId?.trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "notificationId 가 필요합니다." } },
        { status: 400 },
      );
    }
    await notificationService.markNotificationRead(actor, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: e.message } },
        { status: 404 },
      );
    }
    throw e;
  }
}

export async function POST() {
  const actor = await getCurrentActor();
  if (!actor) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
      { status: 401 },
    );
  }
  await notificationService.markAllNotificationsRead(actor);
  return NextResponse.json({ ok: true });
}
