/**
 * Supabase `createSignedUploadUrl` 응답으로 브라우저에서 파일을 올릴 때 사용.
 * storage-js `uploadToSignedUrl` 과 동일하게 Blob/File 은 FormData 로 PUT 한다.
 */
export async function putFileToEventSignedUploadUrl(
  signedUrl: string,
  file: File,
): Promise<{ ok: true } | { ok: false; status: number; detail: string }> {
  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append("", file);

  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: { "x-upsert": "true" },
    body: form,
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 200);
    } catch {
      detail = "";
    }
    return {
      ok: false,
      status: res.status,
      detail: detail || res.statusText,
    };
  }

  return { ok: true };
}
