# 신규 계정 구축 및 모든 데이터 이전 Runbook

## A. 운영 연속성 옵션 선택
**옵션 1 (권장 출발점): 기존 Railway + 기존 Supabase 운영환경 권한/청구 소유권 이전.** 운영 일시중단·데이터 이동 위험이 작다. 단 서비스별 현재 제공되는 소유권 이전 가능 여부, 사업자 계약, 카드 변경 확인 필요.

**옵션 2: 인수자 명의 새 Railway + PostgreSQL + 기존/신규 Supabase.** 구성 재현에 유리하나 DB, Auth, Storage 이전 및 URL 교체 검증이 필수.

**옵션 3: Vercel(Next.js) + Neon(Postgres) + Supabase(Auth/Storage).** 코드를 수정하지 않아도 동작한다는 보장은 없다. 파일 처리·PDF Chromium·서버리스 timeout·장시간 작업·Cron/웹훅·Prisma pooling 및 migration을 사전에 테스트해야 한다. Railway 구성과 동일하다고 가정하면 안 된다.

## B. 신설 환경 구축 순서
1. `shgym81-hue` GitHub 접근 및 신규 프로젝트/조직 준비. 실제 Transfer는 마지막.
2. **개발용 격리 환경**에 Node 22, `git clone`, `npm ci`, `npm run db:generate`.
3. Postgres **빈 개발 DB** 생성. `DATABASE_URL`은 Prisma 서버 런타임으로, pooler 사용 시 migration용 direct connection 요구 여부를 검토.
4. Supabase 신규 프로젝트 또는 기존 프로젝트 이전 권한을 준비. Auth 정책과 Redirect URL을 기록; 각 Storage bucket 생성 및 정책을 코드와 비교.
5. `.env.example`를 기반으로 서비스별 값을 Secret Manager에 입력. 실제 Secret은 문서/커밋/채팅에 기록하지 않는다.
6. 새 빈 DB에 migration 상태 확인 후 기존 `prisma/migrations` 기반으로 migration 실행. **운영 DB에 reset, push, seed 사용하지 않는다.**
7. `npm run build` 수행. Railway는 `railway.toml`의 build/preDeploy/start 순서를 맞춘다.
8. Dev 환경 로그인·대회 신청·대진·업로드·승패·결제의 MOCK 모드 검수.
9. 이어서 운영 데이터 이전 리허설, 데이터 검수, 최소 중단시간을 고려한 cutover를 진행.

## C. 운영 데이터 전체 승계 (민감 정보)
사전 조사/개인정보 이전의 법적 근거·고지/동의 여부를 검토하고 인수자 저장·접근권한을 제한한다.
1. 소유자 권한으로 Production DB read-only 기준선 스냅샷: PostgreSQL 버전, migration 이력, 핵심 테이블별 row count, 관계무결성, 시간대.
2. 공급자가 제공하는 **일관된 DB 스냅샷/pg_dump**와 독립 보관 위치 확보. 복원 암호/비밀키와 백업 파일을 분리.
3. Supabase Auth user ID 및 `User.authUserId` 매핑을 유지. Auth 단순 사용자 목록 export만으로 비밀번호/세션이 복구된다고 가정하지 말 것. 가능한 경우 기존 Supabase 프로젝트 자체 인계, 불가 시 공식 Auth 이관·재로그인/비밀번호 재설정 계획을 검증.
4. Storage 버킷별 객체의 상대 경로, 메타데이터, 공개/private, RLS/권한, signed URL 흐름, 파일 건수와 용량 검증. **DB 객체경로와 파일경로 매칭 보장**.
5. 암호화 필드의 키(예: `MATCHON_PII_ENCRYPTION_KEY` 및 기타 pepper/credential 암호화 키) 보존 여부 확인. 안전한 비밀 전달 또는 키 재암호화 계획 승인 전 삭제·회전 금지.
6. 웹훅·결제·SMS 작업 중복을 막기 위해 발송/과금/입금 webhook을 이전 중 통제하고 멱등성 검증.
7. 데이터 복원은 **격리된 신규 환경에서 먼저 리허설**한다. Row count뿐 아니라 사용자 로그인, 이미지 다운로드, 경기 전적, 신청 내역, 결제원장과 암호화 값의 사용까지 비교한다.
8. 실제 전환 시 쓰기 작업 정지/동기화 경계를 정하고 최종 증분 데이터 확보 → 최종 검증 → DNS/앱 URL/Webhook 전환 → 모니터링. 양쪽에서 동시에 쓰기 허용하지 않는다.
9. rollback 조건·DNS 복구·구 환경 보존기간·시점 기록 및 확인자 서명을 문서화.

## D. Railway 재구축
- GitHub 새 저장소 연동 후 프로젝트에서 Production/Development 별도 환경·Postgres 서비스 구성.
- 각 서비스 `DATABASE_URL` 연결, `NEXT_PUBLIC_APP_URL`·Supabase 변수 설정.
- `main`만 production 자동배포, `develop`만 development 자동배포.
- `railway.toml` : Railpack → pre-deploy `npm run db:migrate:gate` → `npm start`.
- migration gate의 실제 상태, 변수, build 로그 검증. 원본 Production에 쓰지 않기.

## E. Vercel + Neon 대안
- Vercel Project Import GitHub → Next.js framework → `npm run build` → 환경별 Secret 입력.
- Neon Production/Development **별도** DB 또는 충분히 격리된 분기 생성; 런타임/마이그레이션 연결 방식 테스트.
- Postgres migration은 Vercel 빌드 때 무조건 실행하는 방식 대신 단일 제어된 배포 단계에서 수행 (동시배포 방지).
- 서버리스에서 경로별 timeout/CPU/파일업로드·PDF/Chromium·Webhook·Cron 호환성을 실제 스모크 테스트 후 선택.

## F. 개인정보·사업 계약의 별도 승인
기존 선수·미성년자/보호자·신청서·전화번호·서명·암호화 정보는 데이터 전체 양도라 해도 무제한 전달 불가. 사업 양도와 개인정보 이전에 따른 법적 요건(고지·동의 여부 등)을 전문가/담당자가 검토. Toss 정산·빌링수단, Aligo 발신번호 및 외부 API 서비스는 계약 승계 또는 재계약 여부 별도 확인.