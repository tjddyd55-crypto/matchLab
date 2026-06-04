export function GymFighterPublicPolicyNotice() {
  return (
    <div className="rounded-md border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm leading-relaxed">
      <p className="font-medium">주최자에게 공개</p>
      <p className="text-muted-foreground mt-1">
        공개를 켜면 로그인한 주최자가 매칭 후보 목록에서 이 선수를 볼 수
        있습니다.
      </p>
      <p className="text-muted-foreground mt-1">
        휴대폰 번호, 생년월일, 보호자 정보는 공개되지 않습니다. 주최자는
        체육관명과 선수 기본 정보를 보고 매칭 문의를 할 수 있습니다.
      </p>
    </div>
  );
}
