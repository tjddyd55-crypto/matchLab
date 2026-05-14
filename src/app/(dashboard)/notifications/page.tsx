import { NotificationsPageClient } from "@/components/domain/notifications/NotificationsPageClient";
import { Card } from "@/components/ui/card";
import { requireActor } from "@/lib/auth/actor";
import { notificationService } from "@/lib/services/notification.service";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const actor = await requireActor();
  const { items, unreadCount } =
    await notificationService.listMyNotifications(actor);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 md:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          알림
        </h1>
        <p className="text-muted-foreground text-sm">
          인앱 알림만 지원합니다. 카카오 알림톡·문자·웹푸시는 확장 TODO입니다.
        </p>
      </div>

      <Card className="p-4">
        <NotificationsPageClient
          userId={actor.userId}
          initialItems={items}
          initialUnread={unreadCount}
        />
      </Card>
    </div>
  );
}
