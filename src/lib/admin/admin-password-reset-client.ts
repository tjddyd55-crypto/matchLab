export type AdminPasswordResetClientTarget = {
  userId: string;
  loginId: string;
  name: string;
  emailMasked: string | null;
  phoneMasked: string | null;
  accountType: string;
  accountLabel: string;
  representativeName: string | null;
  accountStatus: string;
  activeLink: {
    id: string;
    expiresAt: string;
    createdAt: string;
  } | null;
  lastIssuedAt: string | null;
};

export function toClientAdminPasswordResetTarget(target: {
  userId: string;
  authUserId?: string;
  loginId: string;
  name: string;
  emailMasked: string | null;
  phoneMasked: string | null;
  accountType: string;
  accountLabel: string;
  representativeName: string | null;
  accountStatus: string;
  activeLink: AdminPasswordResetClientTarget["activeLink"];
  lastIssuedAt: string | null;
}): AdminPasswordResetClientTarget {
  return {
    userId: target.userId,
    loginId: target.loginId,
    name: target.name,
    emailMasked: target.emailMasked,
    phoneMasked: target.phoneMasked,
    accountType: target.accountType,
    accountLabel: target.accountLabel,
    representativeName: target.representativeName,
    accountStatus: target.accountStatus,
    activeLink: target.activeLink,
    lastIssuedAt: target.lastIssuedAt,
  };
}
