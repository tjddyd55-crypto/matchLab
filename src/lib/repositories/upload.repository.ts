/**
 * [CONTRACT] Storage 메타는 DB에 둘 수 있으나, 파일 바이너리 접근은 Supabase SDK(`upload.service`)에서 처리.
 * DB 행만 다룰 경우 이 레이어에서 Prisma를 import한다.
 */

export const uploadRepository = {};
