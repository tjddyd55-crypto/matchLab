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

## 2. PostgreSQL 추가

1. 같은 프로젝트에 **PostgreSQL** 플러그인을 추가합니다.
2. Postgres 서비스의 **Variables** 또는 **Connect** 탭에서 **`DATABASE_URL`**(또는 Railway가 제공하는 연결 문자열 변수명)을 확인합니다.
3. Web Service의 환경 변수에 **`DATABASE_URL`**로 그 값을 넣습니다. (Railway가 `DATABASE_URL`을 자동 주입하는 템플릿이 있으면 그대로 사용해도 됩니다.)

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
| `SUPABASE_PROFILE_IMAGE_BUCKET` | `profile-images` (기본값과 동일하면 그대로) |
| `DEMO_PASSWORD` | 시연용 데모 계정 비밀번호. 기본 예: `1234` |

### 주의

- **`SUPABASE_SERVICE_ROLE_KEY`에는 절대 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.** 브라우저 번들에 포함되면 전역 노출됩니다.
- **`.env` 파일은 GitHub에 올리지 마세요.** Railway Variables에만 설정합니다.
- **`DEMO_PASSWORD=1234`는 시연용**입니다. 운영 환경에서는 사용하지 않거나 강한 비밀번호로 바꾸세요.
- 배포가 끝난 **Railway 공개 URL**을 `NEXT_PUBLIC_APP_URL`에 넣어야 리다이렉트·절대 링크가 올바르게 동작합니다.

## 4. 배포 후 실행 명령

Railway **일회성 셸/Run Command** 또는 로컬에서 프로덕션 DB를 가리키는 `.env`로 다음을 순서대로 실행할 수 있습니다.

```bash
# Prisma 스키마를 DB에 반영 (프로젝트 스크립트명에 맞게 선택)
npm run db:push
# 또는
npm run db:migrate

# 데모 계정 생성 (Supabase Auth + Prisma User 등)
npm run setup:demo-users

# 시드 데이터
npm run db:seed
```

- `setup:demo-users`는 **`NEXT_PUBLIC_SUPABASE_URL`**, **`SUPABASE_SERVICE_ROLE_KEY`**, **`DATABASE_URL`**, **`DEMO_PASSWORD`**(또는 기본값)가 필요합니다.
- 첫 배포 후 DB가 비어 있으면 위 순서를 권장합니다.

## 5. Railway 연결 전 체크리스트

- [ ] GitHub에 **실제 시크릿·`.env`가 커밋되지 않았는지** 확인
- [ ] Supabase에서 Storage 버킷 이름이 환경 변수와 일치하는지 확인
- [ ] `NEXT_PUBLIC_APP_URL`을 배포 URL로 갱신
