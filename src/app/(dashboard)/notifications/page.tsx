import { NotificationsPageClient } from "@/components/domain/notifications/NotificationsPageClient";
import { OrganizerDashboardContent } from "@/components/dashboard/OrganizerDashboardContent";
import { OrganizerDashboardPageHeader } from "@/components/dashboard/OrganizerDashboardPageHeader";
import { Card } from "@/components/ui/card";
import { requireActor } from "@/lib/auth/actor";
import { notificationService } from "@/lib/services/notification.service";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const actor = await requireActor();
  const { items, unreadCount } =
    await notificationService.listMyNotifications(actor);

  const useOrganizerLayout =
    actor.role === "organizer" || actor.role === "admin";

  const content = (
    <>
      <OrganizerDashboardPageHeader
        title="알림"
        description="인앱 알림만 지원합니다. 카카오 알림톡·문자·웹푸시는 확장 TODO입니다."
      />

      <Card className="p-4">
        <NotificationsPageClient
          userId={actor.userId}
          initialItems={items}
          initialUnread={unreadCount}
        />
      </Card>
    </>
  );

  if (useOrganizerLayout) {
    return <OrganizerDashboardContent>{content}</OrganizerDashboardContent>;
  }

  return (
    <div className={cn(matchonPageContainerClass, matchonPageStackClass, "max-w-2xl")}>
      <div className="space-y-1">
        <h1 className={matchonPageTitleClass}>알림</h1>
        <p className={matchonPageDescClass}>
          인앱 알림만 지원합니다. 카카오 알림톡·문자·웹푸시는 확장 TODO입니다.
        </p>
      </div>

      <Card className="rounded-xl border-matchon-border p-4 shadow-sm">
        <NotificationsPageClient
          userId={actor.userId}
          initialItems={items}
          initialUnread={unreadCount}
        />
      </Card>
    </div>
  );
}
