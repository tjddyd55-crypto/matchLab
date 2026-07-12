import { FeedbackMessage } from "@/components/shared/FeedbackMessage";

export function GymFighterRegistrationPolicyNotice({
  className,
}: {
  className?: string;
}) {
  return (
    <FeedbackMessage tone="info" className={className}>
      <span className="block">선수 등록은 체육관 선수 DB에 등록하는 단계입니다.</span>
      <span className="mt-1 block">
        대회 참가 동의와 서명은 실제 대회 신청 시 주최측 공식 신청서 양식에 따라
        진행됩니다.
      </span>
      <span className="mt-1 block">
        등록된 선수는 이후 대회 신청 시 불러올 수 있습니다.
      </span>
    </FeedbackMessage>
  );
}
