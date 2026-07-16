import { redirect } from "next/navigation";

/** 요구사항 별칭 — 본인 확인은 /judge/verify 와 동일 */
export default function JudgeProfilePage() {
  redirect("/judge/verify");
}
