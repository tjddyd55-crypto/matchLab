# MATCHON 배포 환경 SSOT

## 브랜치 ↔ Railway 매핑

| GitHub 브랜치 | Railway 환경 | 용도 |
|---|---|---|
| `develop` | `development` | 기능 개발, QA, E2E |
| `main` | `production` | 실제 운영 |

- GitHub에 별도 `production` 브랜치를 만들지 않는다.
- 운영 SSOT는 항상 `main`이다.
- 개발 통합 SSOT는 `develop`이다.

## URL

| 환경 | URL |
|---|---|
| Development | `https://app-preview-member-gym-b.up.railway.app` (환경 rename 후 도메인 유지) |
| Production | `https://app-production-79ad.up.railway.app` (**변경 금지**) |

Development 도메인 문자열이 과거 Preview 이름을 포함할 수 있다. Railway 환경명은 `development`가 SSOT다.

## 배포 흐름

```
feature 작업
  → develop commit/push
  → Railway development 자동 배포
  → Development E2E
  → 승인
  → main FF 또는 검증 완료 cherry-pick
  → Railway production 자동 배포
  → Railway pre-deploy: prisma migrate deploy (IaC `.railway/railway.ts` preDeploy)
  → Production smoke
```

## Hotfix

1. hotfix branch → `main`
2. Production 배포·smoke
3. `develop`에 역동기화

## 데이터 분리

- **DB**: Development / Production Postgres는 분리되어야 한다. (`DATABASE_PUBLIC_URL` host 비교)
- **Auth / Storage**: 가능하면 Supabase project 분리. 동일 project를 쓰면 세션·업로드 혼선 위험이 있으므로 완료 조건에서 별도 추적한다.
- Development schema/E2E가 Production DB count를 바꾸면 안 된다.

## Messaging 안전

Development / Production 모두 기본:

- `MATCHON_MESSAGING_DRY_RUN=true`
- `MATCHON_MESSAGING_ALLOW_REAL_SEND=false`
- Aligo SMS/Kakao enabled=false

Development에서 실문자·알림톡을 켜지 않는다.

## Desktop

- Production 패키지 allowlist: Production host만
- QA 패키지: `MATCHON_DESKTOP_QA_ALLOW_PREVIEW=1` + Development/Preview host
- Production 패키지에 Development host를 넣지 않는다
- Desktop release는 웹-only 변경만으로 재발행하지 않는다

## 금지

- `main` → development 연결
- `develop` → production 연결
- Development / Production 동일 DB 사용
- Production domain 변경
- 검증 전 Railway 환경 삭제
- force push
- secret 원문 로그/문서화

## 환경 삭제

rename이 아니라 복제 환경을 만든 경우에도 기존 환경은 즉시 삭제하지 않는다. 별도 승인 후 정리한다.
