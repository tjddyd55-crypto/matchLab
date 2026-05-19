/** 관리자 템플릿 생성 폼용 예시 JSON */
export const EXAMPLE_APPLICATION_FORM_FIELDS_JSON = `[
  {
    "id": "event_title",
    "label": "대회명",
    "page": 1,
    "x": 80,
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
    "x": 80,
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
    "x": 80,
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
    "x": 80,
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
    "x": 80,
    "y": 240,
    "width": 160,
    "height": 24,
    "type": "text",
    "source": "athlete.signedAt"
  },
  {
    "id": "guardian_signed_at",
    "label": "보호자동의일",
    "page": 1,
    "x": 80,
    "y": 280,
    "width": 160,
    "height": 24,
    "type": "text",
    "source": "guardian.signedAt"
  }
]`;

export const EXAMPLE_APPLICATION_FORM_REPEAT_GROUPS_JSON = `[]`;

export const PLACEHOLDER_PDF_PATH = "templates/sample-open-2026-application.pdf";
export const PLACEHOLDER_PDF_FILE_NAME = "sample-open-2026-application.pdf";
