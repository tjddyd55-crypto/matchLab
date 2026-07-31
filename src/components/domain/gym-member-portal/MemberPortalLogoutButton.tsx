import { logoutGymMemberPortalFormAction } from "@/features/gym-member-portal/member-actions";
import { Button } from "@/components/ui/button";

export function MemberPortalLogoutButton({ token }: { token: string }) {
  return (
    <form action={logoutGymMemberPortalFormAction}>
      <input type="hidden" name="token" value={token} />
      <Button type="submit" variant="outline" className="min-h-11 w-full">
        나가기
      </Button>
    </form>
  );
}
