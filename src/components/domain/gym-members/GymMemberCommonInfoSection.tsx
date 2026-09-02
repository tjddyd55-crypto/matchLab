"use client";

import { AppDateInput } from "@/components/shared/AppDateInput";
import { AddressSearchField } from "@/components/shared/AddressSearchField";
import { PhoneInput } from "@/components/shared/PhoneInput";
import {
  GymMemberFieldCell,
  GymMemberFieldGrid,
  GymMemberFormSection,
} from "@/components/domain/gym-members/GymMemberFormLayout";
import { matchonFieldInputClass } from "@/lib/ui/matchon-shell-ui";
import { toGymMemberGenderFormValue } from "@/lib/gym-member/gender";

export type GymMemberCommonInfoInitial = {
  name?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  email?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  joinedAt?: string;
  memberNumber?: string;
  rankName?: string;
  guardianName?: string;
  guardianPhone?: string;
  memo?: string;
  smsOptOut?: boolean;
};

export function GymMemberCommonInfoSection({
  initial = {},
  showMemberNumber = false,
  joinedRequired = true,
}: {
  initial?: GymMemberCommonInfoInitial;
  showMemberNumber?: boolean;
  joinedRequired?: boolean;
}) {
  return (
    <GymMemberFormSection title="기본 정보" badge="공통">
      <GymMemberFieldGrid>
        <GymMemberFieldCell span={3}>
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-medium text-matchon-text-secondary">
              이름 *
            </span>
            <input
              name="name"
              required
              defaultValue={initial.name ?? ""}
              className={matchonFieldInputClass}
            />
          </label>
        </GymMemberFieldCell>
        <GymMemberFieldCell span={3}>
          <PhoneInput
            name="phone"
            label="휴대전화번호"
            required
            defaultValue={initial.phone}
          />
        </GymMemberFieldCell>
        <GymMemberFieldCell span={3}>
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-medium text-matchon-text-secondary">
              생년월일
            </span>
            <AppDateInput
              name="birthDate"
              defaultValue={initial.birthDate ?? ""}
              disallowFuture
            />
          </label>
        </GymMemberFieldCell>
        <GymMemberFieldCell span={3}>
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-medium text-matchon-text-secondary">
              성별
            </span>
            <select
              name="gender"
              defaultValue={toGymMemberGenderFormValue(initial.gender)}
              className={matchonFieldInputClass}
            >
              <option value="">선택</option>
              <option value="남">남</option>
              <option value="여">여</option>
            </select>
          </label>
        </GymMemberFieldCell>

        <GymMemberFieldCell span={4}>
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-medium text-matchon-text-secondary">
              이메일
            </span>
            <input
              name="email"
              type="email"
              defaultValue={initial.email ?? ""}
              className={matchonFieldInputClass}
            />
          </label>
        </GymMemberFieldCell>
        <GymMemberFieldCell span={3}>
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-medium text-matchon-text-secondary">
              등록일{joinedRequired ? " *" : ""}
            </span>
            <AppDateInput
              name="joinedAt"
              defaultValue={initial.joinedAt ?? ""}
              required={joinedRequired}
            />
          </label>
        </GymMemberFieldCell>
        {showMemberNumber ? (
          <GymMemberFieldCell span={3}>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-medium text-matchon-text-secondary">
                회원번호
              </span>
              <input
                value={initial.memberNumber ?? ""}
                readOnly
                className={matchonFieldInputClass}
              />
            </label>
          </GymMemberFieldCell>
        ) : (
          <GymMemberFieldCell span={3}>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-medium text-matchon-text-secondary">
                회원 등급
              </span>
              <input
                name="rankName"
                defaultValue={initial.rankName ?? ""}
                className={matchonFieldInputClass}
              />
            </label>
          </GymMemberFieldCell>
        )}
        {showMemberNumber ? (
          <GymMemberFieldCell span={2}>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-medium text-matchon-text-secondary">
                회원 등급
              </span>
              <input
                name="rankName"
                defaultValue={initial.rankName ?? ""}
                className={matchonFieldInputClass}
              />
            </label>
          </GymMemberFieldCell>
        ) : null}

        <GymMemberFieldCell span={12}>
          <AddressSearchField
            label="주소"
            addressName="address"
            detailName="addressDetail"
            postalName="postalCode"
            defaultAddress={initial.address ?? ""}
            defaultDetail={initial.addressDetail ?? ""}
            defaultPostal={initial.postalCode ?? ""}
          />
        </GymMemberFieldCell>

        <GymMemberFieldCell span={4}>
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-medium text-matchon-text-secondary">
              보호자 이름
            </span>
            <input
              name="guardianName"
              defaultValue={initial.guardianName ?? ""}
              className={matchonFieldInputClass}
            />
          </label>
        </GymMemberFieldCell>
        <GymMemberFieldCell span={4}>
          <PhoneInput
            name="guardianPhone"
            label="보호자 연락처"
            defaultValue={initial.guardianPhone}
          />
        </GymMemberFieldCell>

        <GymMemberFieldCell span={12}>
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-medium text-matchon-text-secondary">
              메모
            </span>
            <textarea
              name="memo"
              rows={2}
              defaultValue={initial.memo ?? ""}
              className={`${matchonFieldInputClass} min-h-[4rem] py-2`}
            />
          </label>
        </GymMemberFieldCell>

        <GymMemberFieldCell span={12}>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="smsOptOut"
              value="true"
              defaultChecked={initial.smsOptOut}
            />
            출석 문자 수신 거부
          </label>
        </GymMemberFieldCell>
      </GymMemberFieldGrid>
    </GymMemberFormSection>
  );
}
