import { GymAttendanceKioskClient } from "@/components/domain/gym-attendance/GymAttendanceKioskClient";
import { gymAttendanceService } from "@/lib/services/gym-attendance.service";

export const dynamic = "force-dynamic";

export default async function GymAttendancePublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ctx = await gymAttendanceService.getPublicKioskContext(token);

  if (!ctx.ok) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-4 py-16 text-center">
        <p className="text-sm font-semibold text-matchon-primary">MATCHON</p>
        <h1 className="mt-3 text-xl font-bold text-matchon-text-primary">
          출석 화면을 사용할 수 없습니다
        </h1>
        <p className="mt-2 text-sm text-matchon-text-secondary">
          링크가 만료되었거나 비활성화되었습니다. 체육관 데스크에 문의해 주세요.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-white">
      <GymAttendanceKioskClient token={token} gymName={ctx.gymName} />
    </main>
  );
}
