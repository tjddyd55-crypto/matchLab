import { MemberPortalAppShell } from "@/components/domain/gym-member-portal/MemberPortalAppShell";
import { MemberPortalLogoutButton } from "@/components/domain/gym-member-portal/MemberPortalLogoutButton";
import { requireMemberPortalPageSession } from "@/lib/gym-member-portal/require-member-session";
import { gymMemberPortalService } from "@/lib/services/gym-member-portal.service";
import { toSeoulDateKey } from "@/lib/gym-schedule/seoul-schedule";

export const dynamic = "force-dynamic";

export default async function MemberPortalMePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await requireMemberPortalPageSession(token);
  const profile = await gymMemberPortalService.getProfile(session);

  return (
    <MemberPortalAppShell token={token} gymName={session.gymName}>
      <h2 className="text-lg font-bold text-[#001C7A]">내 정보</h2>

      <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-5">
        <div className="flex items-center gap-4">
          {profile.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profileImageUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF1FF] text-xl font-bold text-[#0A47FF]">
              {profile.nameInitial}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-lg font-semibold text-[#0F172A] break-keep">
              {profile.name}
            </p>
            <p className="text-sm text-[#64748B]">{profile.phoneMasked}</p>
            <p className="mt-1 text-sm font-medium text-[#001C7A]">
              {profile.statusLabel}
            </p>
          </div>
        </div>

        <dl className="mt-5 space-y-3 text-sm">
          <div>
            <dt className="text-[#64748B]">담당 선생님</dt>
            <dd className="mt-0.5 font-medium text-[#0F172A]">
              {profile.primaryStaffName
                ? `${profile.primaryStaffName} 선생님`
                : "미지정"}
            </dd>
          </div>
          {profile.membershipPlanName ? (
            <div>
              <dt className="text-[#64748B]">이용권</dt>
              <dd className="mt-0.5 font-medium text-[#0F172A]">
                {profile.membershipPlanName}
                {profile.membershipEndsAt
                  ? ` · ${toSeoulDateKey(profile.membershipEndsAt)}까지`
                  : ""}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="mt-6">
        <MemberPortalLogoutButton token={token} />
      </div>
    </MemberPortalAppShell>
  );
}
