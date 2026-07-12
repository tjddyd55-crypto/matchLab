import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function GuardianConsentDocument({
  documentTitle,
  documentVersion,
}: {
  documentTitle: string;
  documentVersion: string;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{documentTitle}</CardTitle>
        <CardDescription>문서 버전 {documentVersion}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed">
        <p>
          본 동의는 선수 등록 및 향후 대회 참가 과정에서 필요한 보호자 확인 절차입니다.
          구체적인 대회 단위 조건은 추후 대회 신청 단계에서 별도 안내될 수 있습니다.
        </p>
        <ol className="text-muted-foreground list-decimal space-y-2 pl-5">
          <li>
            체육관 및 주최 측은 선수 등록·대회 운영에 필요한 범위에서 개인정보를 수집·이용할 수
            있습니다.
          </li>
          <li>
            격투기 특성상 훈련 및 경기 중 부상 등 신체적 위험이 존재함을 확인합니다.
          </li>
          <li>
            긴급 상황 시 필요한 범위에서 응급 조치를 받을 수 있음에 동의합니다.
          </li>
          <li>
            대진표 및 공식 경기 결과가 플랫폼 등을 통해 공개될 수 있음을 확인합니다.
          </li>
          <li>
            행사 기록·홍보 목적의 사진·영상 촬영 및 활용에 동의합니다.
          </li>
          <li>
            향후 특정 대회에서 라이브 스트리밍을 사용할 경우, 해당 대회 신청 단계에서 별도 안내 및
            동의가 필요할 수 있습니다.
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
