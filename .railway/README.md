# Railway Infrastructure as Code

MATCHON의 Railway 배포 설정 SSOT입니다.

## 배포 순서

```text
build → preDeploy (db:migrate:gate) → start
```

| 레포 파일 | 역할 |
|-----------|------|
| `railway.toml` | Config as Code — 배포 시 preDeployCommand 읽기 |
| `.railway/railway.ts` | IaC — `railway config plan/apply`로 서비스 설정 동기화 |

Railway **서비스 설정**에도 `preDeployCommand: npm run db:migrate:gate`가 있어야 한다 (dashboard/API). `railway.json`만 두면 preDeploy가 실행되지 않을 수 있다.

- **preDeploy**: `npm run db:migrate:gate` — `prisma migrate status` 후 `prisma migrate deploy`
- migration 실패 시 배포가 진행되지 않습니다 (fail-fast)
- Production에서 `db push` / `migrate dev` / `migrate reset` 금지

## 명령

```bash
railway login
railway link   # project + environment 선택

railway config plan
railway config apply
```

IaC 파일(`.railway/railway.ts`)을 변경한 뒤에는 `plan` → `apply`로 Railway에 반영합니다.

## DB 환경

| 별칭 | Railway 환경 | host fingerprint |
|------|--------------|------------------|
| yamanote | development | `yamanote.proxy.rlwy.net` |
| yamabiko | production | `yamabiko.proxy.rlwy.net` |

`DATABASE_URL`은 각 환경의 Web Service(`app`) variables에 설정됩니다. host만으로 환경을 확인하세요 (secret 출력 금지).

## 문서

- [`docs/operations/runbook.md`](../docs/operations/runbook.md)
- [`docs/deploy-railway.md`](../docs/deploy-railway.md)
