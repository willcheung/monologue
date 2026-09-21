export const CATEGORIES = [
  "communication", "calendar", "purchase", "reservation", "finance", "code",
  "file", "task", "account", "crm", "database", "deployment", "form", "other",
] as const;

export const STATUSES = ["completed", "failed", "pending"] as const;
export const SOURCES = ["self_reported", "verified", "observed"] as const;

export type ActionCategory = (typeof CATEGORIES)[number];
export type ActionStatus = (typeof STATUSES)[number];
