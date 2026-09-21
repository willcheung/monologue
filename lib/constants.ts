export const CATEGORIES = [
  "communication", "calendar", "purchase", "reservation", "finance", "code",
  "file", "task", "account", "crm", "database", "deployment", "form", "other",
] as const;

export const STATUSES = ["completed", "failed", "pending"] as const;
export const SOURCES = ["self_reported", "verified", "observed"] as const;

export type ActionCategory = (typeof CATEGORIES)[number];
export type ActionStatus = (typeof STATUSES)[number];

export const CATEGORY_PRESENTATION: Record<ActionCategory, { emoji: string; label: string }> = {
  communication: { emoji: "💬", label: "Communication" },
  calendar: { emoji: "📅", label: "Calendar" },
  purchase: { emoji: "🛍️", label: "Purchase" },
  reservation: { emoji: "🎫", label: "Reservation" },
  finance: { emoji: "💰", label: "Finance" },
  code: { emoji: "💻", label: "Code" },
  file: { emoji: "📄", label: "File" },
  task: { emoji: "✅", label: "Task" },
  account: { emoji: "⚙️", label: "Account" },
  crm: { emoji: "🤝", label: "CRM" },
  database: { emoji: "🗄️", label: "Database" },
  deployment: { emoji: "🚀", label: "Deployment" },
  form: { emoji: "📝", label: "Form" },
  other: { emoji: "✨", label: "Other" },
};

export function categoryPresentation(category: string) {
  return CATEGORY_PRESENTATION[category as ActionCategory] ?? CATEGORY_PRESENTATION.other;
}
