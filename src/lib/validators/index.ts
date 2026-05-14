import { z } from "zod";

/**
 * Zod 스키마 모음 진입점.
 * 도메인별 파일은 다음 단계에서 `validators/events.ts` 등으로 분리한다.
 */

export const emptyObjectSchema = z.object({});

export type EmptyObject = z.infer<typeof emptyObjectSchema>;
