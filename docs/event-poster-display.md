# 대회 포스터 표시·업로드 기준

## 표준

| 항목 | 값 |
|------|-----|
| 카드·공개 UI 비율 | **4:5** (`aspect-[4/5]`) |
| 권장 픽셀 | **1080 × 1350px** |
| 공개 표시 | `object-contain` (글자·원본 잘림 없음) |
| 포스터 영역 배경 | `bg-white` / `bg-neutral-50` |

## 카드가 기대와 다르게 보이는 이유

1. **CSS 4:5만으로는 원본 이미지 비율이 바뀌지 않습니다.**  
   레이아웃 박스만 4:5이고, 파일이 A2·가로형이면 그대로입니다.

2. **4:5가 아닌 원본은 `object-contain` 시 여백(레터박스)이 생깁니다.**  
   잘리지 않게 하려면 contain이 맞고, 그 대신 상·하 또는 좌·우에 빈 공간이 보입니다.

3. **운영상 가장 깔끔한 방법은 주최자가 1080×1350(4:5) 포스터를 업로드하는 것입니다.**  
   그 경우 공개 카드·상세 Hero에서 영역을 거의 꽉 채웁니다.

4. **기존 A2/가로형 포스터는 강제 crop하지 않습니다.**  
   재업로드 안내 또는 업로드·미리보기 단계의 비율 경고로 안내합니다.

## MVP (현재)

- `EventPosterUpload` / `EventCreateForm`: `EventPosterUploadGuide` 안내 + 비율 검사
- 4:5가 아니면 amber 경고 박스 (업로드 차단 없음)
- 미리보기: `uploadPreview` variant + `EVENT_POSTER_PREVIEW_CAPTION`
- 공개: `EventPosterImage` — variant별 wrapper 크기 + 4:5 + contain
  - `card`: 중앙 정렬, `w-[82%] max-w-[300px]` (카드 폭 전체를 포스터가 채우지 않음)
  - `detail`: `max-w-[420px]`
  - `uploadPreview`: 업로드 폼용 `w-32`

## TODO (다음 단계)

- [ ] 업로드 시 **4:5 크롭 편집기** 제공
- [ ] 서버 또는 클라이언트에서 **1080×1350 카드용 썸네일** 생성 후 저장
- [ ] DB/API: 원본 `posterUrl`과 카드용 `posterCardImageUrl` 분리

관련 코드:

- 상수·레이아웃: `src/components/domain/events/public/public-event-layout.ts`
- 공개 렌더: `src/components/domain/events/EventPosterImage.tsx`
- 비율 검사: `src/lib/client/event-poster-aspect.ts`
- 주최자 업로드: `src/components/domain/events/EventPosterUpload.tsx`
