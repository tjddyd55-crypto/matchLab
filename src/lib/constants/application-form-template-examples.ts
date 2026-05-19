/** 관리자 템플릿 생성 폼용 예시 JSON — 좌표는 페이지 좌상단(top-left) 기준 pt */
export const EXAMPLE_APPLICATION_FORM_FIELDS_JSON = `[
  {
    "id": "event_title",
    "label": "대회명",
    "page": 1,
    "x": 120,
    "y": 80,
    "width": 220,
    "height": 24,
    "type": "text",
    "source": "event.title"
  },
  {
    "id": "gym_name",
    "label": "체육관명",
    "page": 1,
    "x": 120,
    "y": 120,
    "width": 180,
    "height": 24,
    "type": "text",
    "source": "gym.name"
  },
  {
    "id": "fighter_name",
    "label": "선수명",
    "page": 1,
    "x": 120,
    "y": 160,
    "width": 160,
    "height": 24,
    "type": "text",
    "source": "fighter.name"
  },
  {
    "id": "division",
    "label": "신청부문",
    "page": 1,
    "x": 120,
    "y": 200,
    "width": 160,
    "height": 24,
    "type": "text",
    "source": "application.division"
  },
  {
    "id": "athlete_signed_at",
    "label": "선수서명일",
    "page": 1,
    "x": 120,
    "y": 240,
    "width": 160,
    "height": 24,
    "type": "date",
    "source": "athlete.signedAt"
  },
  {
    "id": "guardian_signed_at",
    "label": "보호자동의일",
    "page": 1,
    "x": 120,
    "y": 280,
    "width": 160,
    "height": 24,
    "type": "date",
    "source": "guardian.signedAt"
  },
  {
    "id": "athlete_signature",
    "label": "선수 서명",
    "page": 1,
    "x": 330,
    "y": 620,
    "width": 120,
    "height": 40,
    "type": "signature",
    "source": "athlete.signatureImage"
  },
  {
    "id": "guardian_signature",
    "label": "보호자 서명",
    "page": 1,
    "x": 330,
    "y": 680,
    "width": 120,
    "height": 40,
    "type": "signature",
    "source": "guardian.signatureImage"
  }
]`;

export const EXAMPLE_APPLICATION_FORM_REPEAT_GROUPS_JSON = `[]`;
