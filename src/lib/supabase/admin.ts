/**
 * Supabase **서버 전용** 관리 클라이언트 (service role).
 *
 * - `server-only` 로 클라이언트 번들에서의 오용을 방지합니다.
 * - **클라이언트 컴포넌트에서는 이 모듈을 import 하지 마세요.**
 */
import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url?.trim()) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 이 설정되지 않았습니다. Storage signed URL 발급을 위해 필요합니다.",
    );
  }
  if (!serviceRoleKey?.trim()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다. private bucket 업로드 URL 발급에 service role 이 필요합니다.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
