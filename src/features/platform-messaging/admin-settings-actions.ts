"use server";

import { requireActor } from "@/lib/auth/actor";
import { adminPlatformMessagingSettingsService } from "@/lib/services/platform-auth-sms.service";

export async function getAdminPlatformMessagingSettingsAction() {
  const actor = await requireActor();
  return adminPlatformMessagingSettingsService.getSettings(actor);
}

export async function saveAdminPlatformMessagingSettingsAction(input: {
  loginId: string;
  senderPhone: string;
  apiKey?: string;
}) {
  const actor = await requireActor();
  return adminPlatformMessagingSettingsService.saveSettings(actor, input);
}

export async function testAdminPlatformMessagingConnectionAction(input?: {
  loginId?: string;
  apiKey?: string;
  senderPhone?: string;
}) {
  const actor = await requireActor();
  return adminPlatformMessagingSettingsService.testConnection(actor, input);
}
