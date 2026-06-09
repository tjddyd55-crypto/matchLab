export type GymFighterAccountStatus = "none" | "issued";
export type GymFighterProfileDisplayStatus = "missing" | "private" | "public";

export type GymFighterEditPageData = {
  accountStatus: GymFighterAccountStatus;
  profileStatus: GymFighterProfileDisplayStatus;
  loginId: string | null;
  email: string | null;
  publicProfileHref: string | null;
  hasFighterProfile: boolean;
};
