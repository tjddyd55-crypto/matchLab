export function GymProfileMissingBanner() {
  return (
    <div
      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:text-amber-100"
      role="status"
    >
      <p className="font-medium">체육관 프로필이 연결되지 않았습니다</p>
      <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
        로그인 계정에 소속 체육관(Gym) 레코드가 없어 선수 등록·대회 신청 기능을
        사용할 수 없습니다. 운영 환경에서는{" "}
        <code className="rounded bg-black/5 px-1 py-0.5 text-xs dark:bg-white/10">
          npm run setup:demo-users
        </code>
        로 데모 체육관 매핑을 복구하거나, DB에서 이 사용자와 Gym.ownerUserId
        연결을 확인해 주세요.
      </p>
      <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-100/80">
        공개 대회 목록은 아래에서 계속 확인할 수 있습니다.
      </p>
    </div>
  );
}
