import type { OnboardingTeam, Role } from "@prisma/client";

export type SessionUser = { id: string; role: Role };

export const canApprovePricing = (user: SessionUser) => user.role === "CEO" || user.role === "ADMIN";

export const canManageBilling = (user: SessionUser) => user.role === "FINANCE" || user.role === "ADMIN";

export const canManagePlatforms = (user: SessionUser) => user.role === "OPERATIONS" || user.role === "ADMIN";

export const canViewCommercials = (user: SessionUser) => (["SALES", "CEO", "FINANCE", "ADMIN"] as Role[]).includes(user.role);

export const canManageOnboardingTeam = (user: SessionUser, team: OnboardingTeam) =>
  user.role === "ADMIN" || (user.role as string) === (team as string);

export const isAdmin = (user: SessionUser) => user.role === "ADMIN";
