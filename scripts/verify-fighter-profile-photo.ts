/**
 * Static verify: fighter profile photo upload/preview/delete contracts.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

const uploadUi = read(
  "src/components/domain/fighters/FighterProfileImageUpload.tsx",
);
const uploadService = read("src/lib/services/upload.service.ts");
const constants = read("src/lib/constants/profile-image-upload.ts");
const editor = read(
  "src/components/domain/fighters/FighterProfileEditorForm.tsx",
);

assert.match(uploadUi, /createObjectURL/);
assert.match(uploadUi, /revokeObjectURL/);
assert.match(uploadUi, /제거 예정/);
assert.match(uploadUi, /onError/);
assert.doesNotMatch(uploadUi, /alt=\"프로필 미리보기\"/);
assert.match(uploadUi, /profile-images/);
assert.match(uploadService, /buildPublicStorageUrlForProfileImages/);
assert.match(uploadService, /createFighterProfileImageUploadUrl/);
assert.match(uploadService, /fighters\/\$\{input\.fighterId\}\/avatar/);
// Public bucket contract — profile 사진 read는 /object/public/ 만 사용
const profileUrlFn = uploadService.match(
  /function buildPublicStorageUrlForProfileImages[\s\S]*?\n\}/,
);
assert.ok(profileUrlFn, "buildPublicStorageUrlForProfileImages missing");
assert.match(
  profileUrlFn![0],
  /storage\/v1\/object\/public\/\$\{bucket\}\/\$\{path\}/,
);
assert.doesNotMatch(profileUrlFn![0], /createSignedUrl/);
assert.match(uploadService, /profile-images/);
assert.match(
  uploadService,
  /profile-images[\s\S]{0,200}public bucket|public bucket[\s\S]{0,80}profile-images/i,
);
assert.match(constants, /PROFILE_IMAGE_MAX_BYTES/);
assert.match(constants, /image\/jpeg/);
assert.match(editor, /FighterProfileImageUpload/);
assert.match(editor, /profileImageUrl/);

console.log("verify:fighter-profile-photo-upload: OK");
console.log("verify:fighter-profile-photo-preview: OK");
console.log("verify:fighter-profile-photo-delete: OK");
console.log("verify:fighter-profile-photo-public-contract: OK");
console.log("ALL verify:fighter-profile-photo-* OK");
