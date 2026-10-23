# MATCHON 런타임 구조와 확인 대상

## 확인된 저장소 사실
- Next.js 16.2.6, React 19, TypeScript, npm lockfile, Node 22 (CI 설정).
- PostgreSQL + Prisma 7, `prisma/schema.prisma`, `prisma/migrations`, `prisma.config.ts`; Prisma generated client는 `src/generated/prisma`에 빌드 시 생성.
- Supabase: Auth, Storage, SSR 클라이언트. `.env.example`에 연결값·Bucket 이름 정의.
- 데스크톱: `desktop/`의 Electron 배포 프로그램, Windows NSIS 설정. `desktop/PACKAGING.md` 참고.
- `src/app` 라우트, `src/features` 유스케이스, `src/lib` API/인증/서비스, `src/server` 서버 로직.
- Railway: `railway.toml` Railpack, `preDeployCommand=["npm run db:migrate:gate"]`, `startCommand="npm start"`; IaC `.railway/railway.ts`.
- GitHub CI: `.github/workflows/ci.yml` uses `npm ci`, Prisma generate, typecheck, lint, build. CI의 가짜 테스트 환경변수는 실제 연결용이 아니다.
- 앱 기능: 회원/권한, 협회·주최자, 체육관 회원·출석·매출, 대회, 신청·동의서, 대진표/매치, 결과/전적, 결제/크레딧, SMS/알림톡, 관리자 설정 및 Desktop Manager. 코드는 현재 시점 상태를 재감사해야 한다.

## 진실 공급원 우선순위
1. 실제 배포 중 SHA 및 활성 프로덕션 설정(읽기 전용 확인)
2. 해당 SHA에 있는 코드·migration·Railway 설정
3. 신규 테스트 환경에서 통과한 검증 로그
4. `docs` 설명 및 과거 대화
서로 어긋나면 임의 추정 금지.

## 권장 명령 (비파괴)
```bash
git status --short
git rev-parse HEAD
node -v
npm ci
npm run db:generate
npm run typecheck
npm run lint
npm run build
npm run verify:deployment-environments
```
DB 연결 없는 환경에서는 빌드/정적 검사가 실패할 수 있으므로 테스트 환경변수와 실패 이유를 기록. **운영 DB 접근 전** `DATABASE_URL` 대상/host를 먼저 확인.

## 필요한 인프라 인벤토리: 반드시 실제 계정에서 읽어 채울 것
| 시스템 | 확인항목 |
|---|---|
| GitHub | main/develop HEAD, 미병합 PR, branch protection, Actions secrets 존재 유무, webhook, 릴리스, 외부 deploy key |
| Railway | Project ID, production/development Environment ID, 서비스명, 배포 SHA, 도메인, Cron/worker, restart 정책, 지역, 볼륨, 비용, 접근권한 |
| Postgres | DB 공급자, 환경별 hostname fingerprint, DB 버전, 스키마 migration 상태, 데이터 총량, 백업/복구 정책 |
| Supabase | 조직·프로젝트 ref, Auth providers/redirect URLs/SMTP/설정, Storage bucket/public/private/RLS, Realtime |
| 도메인 | 등록업체, DNS 소유권, 서브도메인, TLS, 만료일, 검증 레코드 |
| 결제 | Toss 계약 명의, client/secret, webhook, 빌링 토큰 승계 가능 여부, 미정산/환불채무 |
| 문자 | Aligo 계약 명의, 발신번호 인증, 알림톡 채널, API, 실발송 플래그 |
| Naver | Maps 키 발급 계정, 호출 도메인 제한, 서버 Geocoding |
| Desktop | 릴리스/서명 인증서, exe 배포 위치, 업데이트 feed URL 및 권한 |

## 오래된 문서의 위험
`docs/deploy-railway.md` 초기 설치 절의 `db:push` 설명과 후반 Production migration gate 지침은 상황별로 충돌할 수 있다. **기존 운영 DB에는 무조건 migration status 및 백업 확인부터.** `docs/architecture.md` 일부 옛 경로와 'MVP 제외' 설명은 현재 소스와 일치하지 않을 수 있다. 문서보다 코드 우선.