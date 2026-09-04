# Railway 배포 가이드

이 문서는 **GitHub 레포를 Railway에 연결**해 웹 앱과 Postgres를 배포할 때의 절차와 환경 변수를 정리합니다.

## 1. GitHub 레포 연결

1. [Railway](https://railway.app) 대시보드에서 **New Project** → **Deploy from GitHub repo**를 선택합니다.
2. `tjddyd55-crypto/matchLab` (또는 본인 포크) 레포를 연결하고, 배포 브랜치를 **`main`**으로 둡니다.
3. Railway가 빌드·시작 명령을 감지하지 못하면, Web Service 설정에서 **Build Command** / **Start Command**를 `package.json`의 `build` / `start`에 맞춥니다. (일반적으로 `npm run build` 후 `npm start`.)

### Prisma Client와 빌드 순서

- **`src/generated/prisma`는 Git에 포함하지 않습니다.**(`.gitignore`로 제외) 따라서 CI·Railway처럼 클론만 한 환경에는 생성된 클라이언트가 없습니다.
- Next 빌드가 `@/generated/prisma` 등을 참조하므로, **`next build` 이전에 반드시 `prisma generate`가 실행**되어야 합니다.
- 이 레포의 `package.json`에서는 **`build` 스크립트가 `npm run db:generate && next build` 형태**입니다.(`db:generate` → `prisma generate`)
- Railway는 보통 **`npm ci` 후 `npm run build`**를 실행합니다. **Custom Build Command는 비워 두고** Railway 기본값을 쓰면 위 `build` 스크립트가 그대로 적용됩니다.
- 서비스 설정에서 빌드 명령을 직접 지정한다면 **`npm run build` 한 줄**로 두는 것을 권장합니다.(`prisma generate`를 별도 단계로 중복하지 않아도 됨)
- **생성된 Prisma Client 디렉터리를 Git에 올리지 마세요.** 배포 빌드 중에만 생성되도록 유지합니다.
- **`db:push`는 스키마를 DB에 반영하는 명령이므로 `build` / `start`에 자동으로 넣지 마세요.** 배포가 끝난 뒤 아래 [첫 배포 후 DB 초기화](#4-첫-배포-후-db-초기화)를 따릅니다.

## 2. PostgreSQL 추가

1. 같은 프로젝트에 **PostgreSQL** 플러그인을 추가합니다.
2. Postgres 서비스의 **Variables** 또는 **Connect** 탭에서 **`DATABASE_URL`**(또는 Railway가 제공하는 연결 문자열 변수명)을 확인합니다.
3. **app Web Service**의 환경 변수에 **`DATABASE_URL`**로 그 값을 넣습니다. (Railway가 Postgres와 웹 서비스를 연결하는 템플릿이 있으면 그대로 사용해도 됩니다.)

## 3. Web Service 환경 변수

아래는 **필수** 예시입니다. 값은 각자 Supabase·Railway 대시보드에서 복사합니다.

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | Postgres 연결 문자열 (Railway Postgres 또는 외부 DB) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 공개 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **service role** 키 — **서버 전용** |
| `NEXT_PUBLIC_APP_URL` | 배포된 앱의 공개 URL (예: `https://xxx.up.railway.app`) |
| `SUPABASE_CONSENT_SIGNATURE_BUCKET` | `consent-signatures` (기본값과 동일하면 그대로) |
| `SUPABASE_EVENT_IMAGE_BUCKET` | 대회 포스터·갤러리용 Storage bucket (코드 기본값 `event-images`, **공개 읽기** 정책 권장) |
| `SUPABASE_PROFILE_IMAGE_BUCKET` | `profile-images` — **Public bucket** 생성 권장(공개 프로필 이미지 URL). `/api/uploads/profile-image` 연동됨 |
| `SUPABASE_APPLICATION_FORM_BUCKET` | `application-forms` — 공식 신청서 템플릿 PDF (private) |
| `SUPABASE_APPLICATION_DOCUMENT_BUCKET` | `application-documents` — overlay 완료 PDF (private) |
| `DEMO_PASSWORD` | 시연용 데모 계정 비밀번호. 기본 예: `1234` |

### 주의

- **`SUPABASE_SERVICE_ROLE_KEY`에는 절대 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.** 브라우저 번들에 포함되면 전역 노출됩니다.
- **`.env` 파일은 GitHub에 올리지 마세요.** Railway Variables에만 설정합니다.
- **`DEMO_PASSWORD=1234`는 시연용**입니다. 운영 환경에서는 사용하지 않거나 강한 비밀번호로 바꾸세요.
- 배포가 끝난 **Railway 공개 URL**을 `NEXT_PUBLIC_APP_URL`에 넣어야 리다이렉트·절대 링크가 올바르게 동작합니다.

### Railway Web Service Variables 체크리스트

다음이 **app Web Service**(Next 앱이 도는 서비스)에 설정되어 있는지 확인하세요.

- [ ] `DATABASE_URL` — 없거나 잘못되면 `npm run db:push` 등 Prisma 명령이 실패합니다.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — 없으면 `npm run setup:demo-users`가 실패할 수 있습니다.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 앱·스크립트에서 Supabase 클라이언트에 필요합니다.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — 없으면 `setup:demo-users` 등 서버 전용 스크립트가 실패합니다.
- [ ] `NEXT_PUBLIC_APP_URL` — **Railway가 발급한 public domain**(HTTPS URL)으로 설정합니다.
- [ ] `SUPABASE_CONSENT_SIGNATURE_BUCKET`
- [ ] `SUPABASE_EVENT_IMAGE_BUCKET`
- [ ] `SUPABASE_PROFILE_IMAGE_BUCKET`
- [ ] `SUPABASE_APPLICATION_FORM_BUCKET` (Supabase Storage에 **private** bucket 생성)
- [ ] `SUPABASE_APPLICATION_DOCUMENT_BUCKET` (Supabase Storage에 **private** bucket 생성)
- [ ] `DEMO_PASSWORD` (선택, 미설정 시 코드 기본값 사용 가능)

`DATABASE_URL`은 **PostgreSQL 서비스가 아니라 Web Service**에 연결되어 있어야 합니다. (Railway 템플릿이 Postgres URL을 웹 서비스 변수로 주입하는 패턴을 사용합니다.)

## 4. 첫 배포 후 DB 초기화

> **운영(Production) SSOT:** `main` 배포 시 Railway **pre-deploy**에서 `npm run db:migrate:gate`가 실행됩니다.
> (`prisma migrate status` → `prisma migrate deploy`). migration 실패 시 **배포가 중단**됩니다.
> Production에서 **`prisma migrate dev`**, **`prisma db push`**, **`prisma migrate reset`**은 자동화하지 않습니다.

Railway에서 **빌드·배포가 성공해도** PostgreSQL은 **빈 데이터베이스**입니다. Prisma 스키마(`prisma/schema.prisma`)가 반영되지 않으면 `public.Event` 등 테이블이 없어 **`/`·`/events`·`/events/sample-open-2026` 등이 500**이 될 수 있습니다. (`/login`, `/register`처럼 DB의 `Event`를 읽지 않는 경로는 200일 수 있습니다.)

**`db:push` 전에는** 위 공개 페이지가 500일 수 있습니다. 에러 로그에 **`The table public.Event does not exist`**(Prisma `P2021`)가 보이면 **스키마 미반영** → 아래 순서로 `db:push`부터 실행하세요.

### 권장 실행 순서

1. **`npm run db:push`** — Prisma 스키마를 Railway PostgreSQL에 반영합니다. `Event`, `User`, `Fighter` 등 테이블이 생성됩니다.
2. **`npm run db:seed`** — `sample-open-2026`, divisions, applications, brackets, results 등 **시연용 시드 데이터**를 넣습니다. (`prisma db seed` → `prisma.config.ts`의 `migrations.seed`로 `tsx prisma/seed.ts` 실행)
3. **`npm run setup:demo-users`** — Supabase Auth에 데모 계정을 만들고, Prisma `User.authUserId` 등을 맞춥니다.

**중요**

- `db:seed`가 `User` 등 데이터를 만들거나 갱신할 수 있으므로, **시드 이후에 `setup:demo-users`를 다시 한 번 실행**하는 것을 권장합니다(데모 계정·DB 매핑 일치).
- 운영 환경에서는 **마이그레이션 전략**(`db:migrate:deploy` / Railway pre-deploy)을 사용합니다. **`build` / `start`에 `db:push`를 자동으로 넣지 마세요.**

### Production deploy migration gate (Railway)

`main` → Production 자동 배포 흐름:

1. **Build** — Railway Railpack 기본값 (`npm ci` → `npm run build` → `db:generate && next build`)
2. **preDeploy** — `npm run db:migrate:gate` (`prisma migrate status` → `prisma migrate deploy`)
3. **Start** — `npm start` (`next start`)

**레포 SSOT**

| 파일 | 역할 |
|------|------|
| [`railway.toml`](../../railway.toml) | 배포 시 읽히는 Config as Code (preDeployCommand) |
| [`.railway/railway.ts`](../../.railway/railway.ts) | Railway IaC (`railway config apply`로 서비스 설정 동기화) |

**Railway 서비스 설정**에 `preDeployCommand: ["npm run db:migrate:gate"]`가 반드시 있어야 한다. 레거시 `railway.json`만 두면 Railpack 배포에서 preDeploy가 **실행되지 않을 수 있음** (2026-09 `MessagingProviderConfig` P2021 사례).

IaC/레포 변경 후 동기화:

```bash
railway config plan
railway config apply
```

또는 Railway 대시보드 / API에서 `app` 서비스 Deploy → Pre-deploy Command 확인.

migration 실패 시 preDeploy가 non-zero로 종료되어 **새 release가 serving 되지 않습니다** (fail-fast).

### yamabiko migration drift (문서화만)

Production DB(`yamabiko`) `_prisma_migrations`에 repo에 없는 `20260828120000_event_application_structural_audit`가 존재한다. 자동화에서 삭제·resolve하지 않는다. `migrate deploy`는 repo의 pending migration만 적용한다.

로그에 `DATABASE_URL` 전체를 출력하지 않습니다. host / database / Railway environment / yamanote·yamabiko alias만 fingerprint로 남깁니다.

검증:

```bash
npm run verify:prisma-migration-deploy-config
npm run db:migrate:status    # read-only
npm run verify:production-migration-status   # read-only, pending 감지
```

**금지 (Production 자동화):** `prisma migrate dev`, `prisma db push`, `prisma migrate reset`, `|| true`, `continue-on-error`

### Railway CLI 기준

프로젝트 디렉터리에서 Railway CLI를 사용하는 경우:

```bash
railway login
railway link
railway run npm run db:push
railway run npm run db:seed
railway run npm run setup:demo-users
# db:seed 이후 User/auth 매핑을 다시 맞추려면 한 번 더 실행:
railway run npm run setup:demo-users
```

### Railway 대시보드에서 실행 (CLI 없이)

1. Railway 프로젝트로 이동합니다.
2. **app Web Service**(Next.js가 배포된 서비스)를 선택합니다.
3. **Shell** / **Run command** / **Command**(UI 명칭은 시기별로 다를 수 있음) 메뉴에서, 아래를 **순서대로** 실행합니다.

```bash
npm run db:push
npm run db:seed
npm run setup:demo-users
```

**주의**

- 명령은 **PostgreSQL 서비스가 아니라 app Web Service** 환경에서 실행해야 합니다. (같은 변수·네트워크 컨텍스트)
- 해당 서비스에 **`DATABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**, **`SUPABASE_SERVICE_ROLE_KEY`**가 설정되어 있어야 합니다.
- **`DATABASE_URL`**은 Railway PostgreSQL 인스턴스의 URL과 **연결된 값**이어야 합니다.

## 5. DB 상태 확인

스키마가 반영되었는지 Prisma로 확인하려면 (CLI 사용 시):

```bash
railway run npx prisma db pull --print
```

로컬/원격 DB에 연결된 상태에서 스키마 덤프를 출력해 테이블 존재를 간접 확인할 수 있습니다.

Prisma Studio를 쓸 수 있다면:

```bash
railway run npx prisma studio
```

Railway 환경에서는 **포트 노출·브라우저 접속**이 번거로울 수 있어 필수는 아닙니다.

**간단한 확인**

- `db:push` 성공 후 브라우저에서 **`/events`** — 200에 가까워지면 테이블 생성이 된 경우가 많습니다.
- `db:seed` 성공 후 **`/events/sample-open-2026`** — 시드된 이벤트 슬러그 페이지가 열리는지 확인합니다.

## 6. Troubleshooting

### 1) `The table public.Event does not exist` (P2021)

- **원인**: `db:push`를 아직 실행하지 않았거나 실패했습니다.
- **해결**: `railway run npm run db:push` 또는 대시보드 Shell에서 `npm run db:push` 실행 후, 필요 시 `npm run db:seed`까지 진행합니다.

### 2) `DATABASE_URL` is missing / Prisma가 DB에 연결하지 못함

- **원인**: app Web Service에 **`DATABASE_URL`이 없거나** Postgres와 연결되지 않았습니다.
- **해결**: Railway에서 Postgres 플러그인의 연결 문자열을 Web Service 변수 **`DATABASE_URL`**에 연결합니다.

### 3) `setup:demo-users` fails — `NEXT_PUBLIC_SUPABASE_URL` missing

- **원인**: Supabase 관련 env가 Web Service에 없습니다.
- **해결**: **`NEXT_PUBLIC_SUPABASE_URL`**(및 필요 시 anon 키·service role 키)을 Railway Web Service Variables에 추가합니다.

### 4) password too short / Supabase가 비밀번호 거절

- **원인**: Supabase Auth 비밀번호 정책이 **`1234` 같은 짧은 비밀번호**를 거절합니다.
- **해결**: Railway에서 **`DEMO_PASSWORD`**를 `123456` 또는 `Demo1234!` 등 정책을 만족하는 값으로 바꾼 뒤 **`npm run setup:demo-users`**를 다시 실행합니다.

### 5) `sample-open-2026` not found / 404

- **원인**: **`db:seed` 미실행** 또는 시드 실패입니다.
- **해결**: `railway run npm run db:seed` 또는 대시보드에서 `npm run db:seed`를 실행하고 로그를 확인합니다.

### 6) 대회 포스터·갤러리 업로드 실패 (주최자 상세)

#### A) 화면: 「업로드 URL 발급에 실패했습니다」 (signed URL 발급 단계)

서버 action(`requestEventPosterUploadAction` / `requestEventGalleryUploadAction`)에서 Supabase Storage signed upload URL 생성이 실패한 경우입니다. **브라우저 PUT 이전** 단계입니다.

- **Railway app Variables 존재 여부 확인** (값 출력 금지)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (**`NEXT_PUBLIC_` 접두사 금지**)
  - `SUPABASE_EVENT_IMAGE_BUCKET` (미설정 시 코드 기본값 `event-images`)
- **Supabase Storage**
  - `SUPABASE_EVENT_IMAGE_BUCKET`과 **동일한 이름**의 bucket 존재
  - 공개 상세에 포스터/갤러리를 보여야 하므로 bucket **public read** 권장
  - bucket이 없으면 Supabase 대시보드 → Storage → **New bucket** → `event-images` (public)
- **env 변경 후** Railway app **재배포** (Variables만 바꿔도 재배포 필요할 수 있음)
- **UI 메시지** (2026-05 이후): bucket 미존재·service role 누락 등은 보다 구체적인 문구로 표시됨

#### B) signed URL 발급은 성공했으나 스토리지 PUT 실패

- 버킷 **CORS**에 Railway 앱 origin(`NEXT_PUBLIC_APP_URL`)과 `PUT` 허용
- 클라이언트는 **FormData + `x-upsert` PUT** (`putFileToEventSignedUploadUrl`) 사용 — raw File PUT 금지

#### C) 공통 체크

1. Variables: `SUPABASE_EVENT_IMAGE_BUCKET=event-images`(코드 기본값과 동일 권장)
2. Supabase → Storage → 해당 버킷 **public** + CORS에 `PUT`·앱 origin 추가
3. 주최자 상세에서 업로드 재시도 — 실패 시 UI에 HTTP 상태·짧은 응답 본문 표시
4. 공개 상세(`/events/{slug}`)에서 이미지 URL이 열리는지 확인(private `imagePath`는 API에 노출하지 않음)

## 7. Railway 연결 전 체크리스트

- [ ] GitHub에 **실제 시크릿·`.env`가 커밋되지 않았는지** 확인
- [ ] Supabase에서 Storage 버킷 이름이 환경 변수와 일치하는지 확인 (**대회 이미지 버킷은 공개 읽기**, 동의 서명·프로필(예정)은 private)
- [ ] `NEXT_PUBLIC_APP_URL`을 배포 URL로 갱신

## 8. 배포 후 검증 체크리스트

- [ ] Railway build 성공
- [ ] Railway deploy 성공
- [ ] `/login` 200
- [ ] `npm run db:push` 성공
- [ ] `npm run db:seed` 성공
- [ ] `npm run setup:demo-users` 성공
- [ ] `/events` 200
- [ ] `/events/sample-open-2026` 200
- [ ] `admin@demo.local` 로그인 성공
- [ ] `organizer@demo.local` 로그인 성공
- [ ] `gym@demo.local` 로그인 성공
- [ ] `fighter@demo.local` 로그인 성공

## 9. `package.json` 스크립트 참고 (배포·DB 작업)

| 스크립트 | 역할 |
|----------|------|
| `db:generate` | `prisma generate` — 빌드 시 클라이언트 생성 |
| `db:migrate:status` | `prisma migrate status` — pending migration 확인 (read-only) |
| `db:migrate:deploy` | `prisma migrate deploy` — Production pending migration 적용 |
| `db:migrate:gate` | Railway pre-deploy: status → deploy (실패 시 배포 중단) |
| `db:push` | `prisma db push` — **Development/수동** 스키마 반영 (Production 자동화 금지) |
| `db:seed` | `prisma db seed` — `prisma.config.ts`의 `migrations.seed`(`tsx prisma/seed.ts`) 실행 |
| `setup:demo-users` | 데모 Auth·DB 사용자 정합 |
| `seed:demo-fighters` | 데모 체육관 소속 테스트 선수 20명 upsert (`DATABASE_URL`만 필요) |
| `build` | `npm run db:generate && next build` |
| `start` | `next start` |
