import type { Prisma } from "@/generated/prisma";
import { MatchonMessageChannel, MatchonMessageOwnerType } from "@/lib/enums";
import { matchonMessageRepository } from "@/lib/repositories/matchon-message.repository";
import {
  MatchonMessagingError,
  MatchonMessagingErrorCode,
} from "../domain/matchon-message-errors";
import type {
  MatchonTemplateButton,
  MatchonTemplateVariableSchema,
} from "../domain/matchon-message-types";
import { computeMatchonTemplateFingerprint } from "../templates/matchon-template-fingerprint";

export class MatchonMessageTemplateService {
  async createDraft(params: {
    ownerType?: MatchonMessageOwnerType;
    gymId?: string | null;
    channel: MatchonMessageChannel;
    name: string;
    subject?: string | null;
    body: string;
    variables?: MatchonTemplateVariableSchema;
    buttons?: MatchonTemplateButton[] | null;
    createdByUserId?: string | null;
  }) {
    if (!params.body.trim()) {
      throw new MatchonMessagingError(
        MatchonMessagingErrorCode.INVALID_MESSAGE,
        "템플릿 본문이 비어 있습니다.",
      );
    }
    const data: Prisma.MatchonMessageTemplateCreateInput = {
      ownerType: params.ownerType ?? MatchonMessageOwnerType.platform,
      channel: params.channel,
      name: params.name.trim(),
      subject: params.subject ?? null,
      body: params.body,
      variables: params.variables ?? {},
      buttons: params.buttons ?? undefined,
      kakaoTemplateCode: null,
      approvedFingerprint: null,
      isApproved: false,
      isActive: true,
      isSystem: false,
      createdByUserId: params.createdByUserId ?? null,
      ...(params.gymId
        ? { gym: { connect: { id: params.gymId } } }
        : {}),
    };
    return matchonMessageRepository.createTemplate(data);
  }

  async list(channel?: MatchonMessageChannel) {
    return matchonMessageRepository.listTemplates({ channel });
  }

  async get(id: string) {
    const t = await matchonMessageRepository.findTemplateById(id);
    if (!t) {
      throw new MatchonMessagingError(
        MatchonMessagingErrorCode.TEMPLATE_NOT_FOUND,
        "템플릿을 찾을 수 없습니다.",
      );
    }
    return t;
  }

  currentFingerprint(template: {
    body: string;
    variables: unknown;
    buttons: unknown;
  }) {
    return computeMatchonTemplateFingerprint({
      body: template.body,
      variables: (template.variables ?? {}) as MatchonTemplateVariableSchema,
      buttons: (template.buttons ?? null) as MatchonTemplateButton[] | null,
    });
  }
}

export const matchonMessageTemplateService = new MatchonMessageTemplateService();
