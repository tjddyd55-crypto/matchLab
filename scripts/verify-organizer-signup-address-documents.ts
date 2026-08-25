/**
 * 협회 가입 주소·첨부파일 UI 정적 검증.
 * npm run verify:organizer-signup-document-upload-ui
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const field = read("src/components/shared/AddressSearchField.tsx");
  assert.match(field, /"use client"/);
  assert.match(field, /loadDaumPostcodeScript/);
  assert.match(field, /\.embed\(/);
  assert.doesNotMatch(field, /\.open\(\)/);
  assert.doesNotMatch(field, /window\.open/);
  assert.match(field, /readOnly=\{!scriptFailed\}/);
  assert.match(field, /detailRef\.current\?\.focus/);
  assert.match(field, /isOpen/);
  assert.match(field, /data-address-search-embed/);

  const loader = read("src/lib/daum-postcode-loader.ts");
  assert.match(loader, /data-matchon-daum-postcode/);
  assert.match(loader, /loadPromise/);
  assert.match(loader, /daumcdn\.net\/mapjsapi\/bundle\/postcode/);

  const eventAddress = read("src/components/domain/events/EventAddressInput.tsx");
  assert.match(eventAddress, /\.embed\(/);
  assert.doesNotMatch(eventAddress, /\.open\(\)/);

  const form = read(
    "src/components/domain/association-applications/AssociationApplicationForm.tsx",
  );
  assert.match(form, /AddressSearchField/);
  assert.match(form, /postalName="postalCode"/);
  assert.match(form, /DocumentUploadField/);
  assert.match(form, /attachmentType === AssociationApplicationAttachmentType\.logo/);
  assert.match(form, /required: false/);
  assert.match(form, /business_registration/);
  assert.match(form, /required: true/);
  assert.match(form, /\/api\/uploads\/association-application/);
  assert.match(form, /isUploading/);
  assert.match(form, /\(필수\)/);
  assert.doesNotMatch(form, /private 저장소/);

  const documentUploadField = read("src/components/shared/DocumentUploadField.tsx");
  assert.match(documentUploadField, /className="sr-only"/);
  assert.match(documentUploadField, /type="file"/);
  assert.match(documentUploadField, /flex-wrap/);
  assert.match(documentUploadField, /min-w-0/);

  const helper = read("src/lib/postal-address.ts");
  assert.match(helper, /formatPostalAddress/);
  assert.match(helper, /normalizePostalCode/);

  const schema = read("prisma/schema.prisma");
  assert.match(
    schema,
    /model AssociationApplication[\s\S]*?postalCode\s+String\?/,
  );

  const sqlBody = read(
    "scripts/sql/add-association-application-postal-code-additive.sql",
  )
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  assert.match(sqlBody, /ADD COLUMN IF NOT EXISTS "postalCode"/);
  assert.doesNotMatch(sqlBody, /DROP\s+|SET\s+NOT\s+NULL|TRUNCATE/i);

  const svc = read("src/lib/services/association-application.service.ts");
  assert.match(svc, /postalCode: normalizePostalCode/);
  assert.match(svc, /assertAssociationAttachmentMimeAndSize/);
  assert.match(
    svc,
    /REQUIRED_ATTACHMENT_TYPES[\s\S]*?AssociationApplicationAttachmentType\.business_registration/,
  );
  assert.doesNotMatch(
    svc.match(/const REQUIRED_ATTACHMENT_TYPES[\s\S]*?];/)?.[0] ?? "",
    /AssociationApplicationAttachmentType\.logo/,
  );
  assert.match(svc, /logoUrl: null/);
  assert.match(svc, /logoPath: null/);

  const uploadService = read(
    "src/lib/services/association-application-upload.service.ts",
  );
  assert.match(uploadService, /associationAttachmentMaxBytes/);
  assert.match(uploadService, /assertAssociationAttachmentMimeAndSize/);
  assert.match(uploadService, /MEMBER_GYM_ALLOWED_IMAGE_MIME/);
  assert.match(
    uploadService,
    /지원하지 않는 파일 형식입니다\. JPEG, PNG, WebP 파일을 선택해 주세요\./,
  );
  assert.match(uploadService, /issueUploadUrl[\s\S]*?assertAssociationAttachmentMimeAndSize/);
  assert.match(uploadService, /createSignedUploadUrl/);
  assert.match(uploadService, /createSignedUrl/);
  assert.match(uploadService, /requireRole\(actor, \[UserRole\.admin\]\)/);

  const admin = read(
    "src/app/(dashboard)/admin/association-applications/[applicationId]/page.tsx",
  );
  assert.match(admin, /formatPostalAddress/);

  console.log("verify:organizer-signup-address-search: OK");
  console.log("verify:organizer-signup-document-upload-ui: OK");
  console.log("verify:organizer-signup-document-validation: OK");
  console.log("verify:organizer-signup-private-attachments: OK");
  console.log("verify:organizer-signup-mobile-layout: OK");
  console.log("verify:organizer-signup-address-documents: ALL_PASS");
}

main();
