"use server";

import { MessagingProviderOwnerType } from "@/generated/prisma";
import { requireActor } from "@/lib/auth/actor";
import { messagingProviderSettingsService } from "@/lib/services/messaging-provider-settings.service";

export async function getMessagingProviderSettingsAction(
  ownerType: MessagingProviderOwnerType,
) {
  const actor = await requireActor();
  return messagingProviderSettingsService.getSettings(actor, ownerType);
}

export async function saveMessagingProviderSettingsAction(input: {
  ownerType: MessagingProviderOwnerType;
  enabled: boolean;
  loginId: string;
  senderPhone: string;
  apiKey?: string;
}) {
  const actor = await requireActor();
  return messagingProviderSettingsService.saveSettings(actor, input.ownerType, {
    enabled: input.enabled,
    loginId: input.loginId,
    senderPhone: input.senderPhone,
    apiKey: input.apiKey,
  });
}

export async function testMessagingProviderConnectionAction(input: {
  ownerType: MessagingProviderOwnerType;
  loginId?: string;
  apiKey?: string;
  senderPhone?: string;
}) {
  const actor = await requireActor();
  return messagingProviderSettingsService.testConnection(
    actor,
    input.ownerType,
    {
      loginId: input.loginId,
      apiKey: input.apiKey,
      senderPhone: input.senderPhone,
    },
  );
}
