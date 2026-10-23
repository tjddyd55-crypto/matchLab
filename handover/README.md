# MATCHON 전체 양도 / AI 개발자 인수인계 시작점

**상태: 준비 단계 / 실제 계정·백업·복구 확인 전 / 저장소 양도 미실행**

- 현재 저장소: `tjddyd55-crypto/matchLab`
- 예정 인수자 GitHub: `shgym81-hue`
- 예정 인수자 Railway / Supabase / Vercel / Neon: `shgym81@gmail.com` (초대 대상 메일, 접근권한 인증 완료를 뜻하지 않음)
- 목적: 소스뿐 아니라 운영 PostgreSQL, Supabase Auth, Storage, 데이터 암호화 키, 도메인, 외부서비스를 인수자가 끊김 없이 운영
- **원칙: 운영 main/production 무변경. 데이터 이전 완료 검증 및 권한 확인 전 원본 삭제 금지.**

## AI에게 가장 먼저 읽힐 순서
1. 이 문서 → [01](01-runtime-and-architecture.md) → [02](02-rebuild-and-migration.md) → [03](03-transfer-and-acceptance.md) → [04](04-ai-operator-instructions.md).
2. 실제 파일 `package.json`, `railway.toml`, `.railway/railway.ts`, `prisma.config.ts`, `prisma/schema.prisma`, `.env.example`, `desktop/PACKAGING.md`를 대조한다.
3. `docs/deployment-environments.md`, `docs/deploy-railway.md`, `docs/operations/runbook.md`를 참고하되 구 버전과 현재 코드가 충돌하면 중단하고 차이를 보고한다.
4. 실제 GitHub HEAD SHA·운영 배포 SHA·DB migration 상태·Supabase 프로젝트 참조를 읽기 전용으로 검증한다. 문서의 과거 내용이 현재 운영 사실을 증명하지 않는다.

## 인계 경계
| 업무 | 담당 | 상태 |
|---|---|---|
| 코드·기술문서·환경변수 분류 | 양도자 측 AI | 이 문서로 착수 |
| 운영 인프라/실제 연결정보 확인 및 백업 수행 | 양도자 측 운영 권한자/AI (권한 있는 경우) | 미확인 |
| 신규 GitHub·서버·DB·Supabase 계정 준비 | 인수자 | GitHub ID·이메일 확보, 프로젝트 권한 미검증 |
| 백업 복원 리허설, 신규 환경 기능 검수 | 인수자 + 양도자 측 검토 | 미착수 |
| 개인정보 이전·계약·결제·도메인 명의 처리 | 실제 권한/계약 당사자 | 미착수 |
| 최종 GitHub Transfer 및 접근권한 회수 | 실제 GitHub 소유자 | 미착수 |

## 인수자에게 전달할 자료
1. GitHub 저장소 이전 (모든 코드·브랜치·기록)
2. 별도 **암호화된** Production DB 백업 및 백업 복원 검증 기록
3. Supabase Auth 사용자 이전/프로젝트 이전 결과, Storage 파일/권한/버킷 이전 결과
4. 운영 설정 인벤토리: 서비스/환경별 이름·ID·지역·빌드/시작/배포 설정·도메인·Cron·Webhook·관리자 권한 (비밀 값 제외)
5. 비밀키의 안전한 교체 계획: PII key, token pepper, Supabase service role, Aligo, Toss, Naver; 비밀값은 GitHub/채팅/PR에 게시 금지
6. 대조표: 신규/기존 사용자수, 선수수, 체육관수, 대회수, 신청수, 대진표수, 경기결과수, 객체 파일수, 결제/원장 레코드수와 검증 해시/샘플
7. 기능검수 및 인수완료 서명 기록

**금지:** GitHub 양도만으로 서버/DB/도메인/고객 개인정보가 자동 이전된다고 가정; 운영 DB에 seed·reset·db push 무분별 실행; 실제 사용자에게 테스트 문자/청구/환불 발송; 암호화 키 분실.

## 운영 기준
저장소 문서에는 `main → Railway production`, `develop → Railway development`로 기록되어 있다. 기록된 URL: Production `https://app-production-79ad.up.railway.app`, Development `https://app-preview-member-gym-b.up.railway.app`. **실시간 설정 여부는 별도 확인해야 한다.**