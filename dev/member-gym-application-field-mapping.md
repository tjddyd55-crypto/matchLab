# 회원사 가입 신청서 필드 매핑

## 원본 조사 상태

| 항목 | 결과 |
|------|------|
| 참고 파일 | `킹투기 회원가입 신청서(1).hwp` |
| 로컬 파일 위치 | 워크스페이스·Downloads에서 **미발견** (`/mnt/data/...` 경로도 없음) |
| LibreOffice/HWP 변환 | 원본 파일 부재로 미실행 |
| 매핑 근거 | 단계 B 지시문의 **이미지 기준 매핑표**(§7) + 과거 MVP 필드 |

원본 HWP를 추측으로 채우지 않았다. 아래 표는 지시문에 명시된 원본 항목만 “원본 반영”으로 표시한다.  
문서에서 확인되지 않은 항목은 **추가 제안** 절에만 둔다.

임시 변환 파일은 repository에 커밋하지 않는다.

---

## 원본 반영 매핑표

| 원본 신청서 항목 | 온라인 입력 필드 | 필수 여부 | DB 필드 | 첨부/텍스트 | 비고 |
|---|---|---:|---|---|---|
| 관장 성명 | ownerName | 예 | AssociationMemberGymApplication.ownerName | 텍스트 | |
| 성명 영문 | ownerNameEn | 선택 | ownerNameEn | 텍스트 | |
| 생년월일 | birthDate | 선택 | birthDate | 텍스트(date) | 주민번호 수집 안 함 |
| 성별 | gender | 선택 | gender | 텍스트 | |
| 체육관명 | gymName | 예 | gymName | 텍스트 | 승인 시 Gym.name |
| 체육관 연락처 | gymPhone | 선택 | gymPhone | 텍스트 | 승인 시 Gym.phone |
| 개인 연락처 | phone | 예 | phone | 텍스트 | |
| 이메일 | email | 예 | email | 텍스트 | |
| 집주소 | homeAddress | 선택 | homeAddress | 텍스트 | |
| 체육관주소 | gymAddress | 예 | gymAddress | 텍스트 | 승인 시 Gym.address |
| 보유단증 및 자격증 | qualifications | 선택 | qualifications | 텍스트 | 첨부(dan/coach/referee)와 병행 |
| 증명사진 | representativePhoto | 설정 | Attachment.type=representative_photo | 첨부 | 미리보기 제공 |
| 개인정보 동의 | privacyConsent | 예 | privacyConsent | boolean | |
| SMS 수신 동의 | smsConsent | 선택 | smsConsent | boolean | |
| 자료·정보 수신 동의 | informationConsent | 선택 | informationConsent | boolean | |
| 사실 확인·회원자격 동의 | registrationConsent | 예 | registrationConsent | boolean | |
| 신청일 | submittedAt | 자동 | submittedAt | 시스템 | |
| 신청인 및 서약인 | signatureName | 예 | signatureName | 텍스트 | 전자 서명 체크 병행 |

상세주소는 원본 표에 없을 수 있어 **체육관주소 보조 입력**으로 `gymAddressDetail`(선택)을 둔다.

---

## 첨부 유형 (원본·운영 반영)

| attachmentType | 용도 | 기본 필수 |
|---|---|---:|
| representative_photo | 증명사진 | 설정 |
| business_registration | 사업자등록증 | 설정 |
| dan_certificate | 단증 | 아니오 |
| coach_certificate | 지도자 자격 | 아니오 |
| referee_certificate | 심판 자격 | 아니오 |
| association_certificate | 협회 자격 | 아니오 |
| gym_exterior_photo | 체육관 외부 | 아니오 |
| gym_interior_photo | 체육관 내부 | 아니오 |
| other | 기타 | 아니오 |

---

## 추가 제안 (원본 HWP에서 미확인 — 선택/설정 항목)

문서 파일 부재로 원본에 있는지 확정하지 못한 항목. 환경 설정에서 on/off.

| 제안 필드 | 용도 |
|---|---|
| contactName / contactPhone / contactEmail | 담당자(대표자와 동일 체크) |
| sportType / classDescription | 종목·수업 부문 |
| athleteCount / instructorCount | 규모 |
| websiteUrl / snsUrl | 온라인 채널 |
| businessNo | 사업자등록번호 (Gym 후보 검색) |
| careerSummary | 경력 서술 |
| memo | 비고 |

주민등록번호 전체·신분증 원본 필수 강제: **비채택**.

---

## 데이터 SoT 구분

| 저장소 | 역할 |
|---|---|
| AssociationMemberGymApplication (+ Attachment) | 가입 당시 제출 스냅샷 |
| Gym | 현재 체육관 정보 SoT |
| AssociationMemberGym | 협회–Gym 회원 관계·회원사 코드·상태 |
