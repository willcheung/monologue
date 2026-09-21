import {
  CalendarDays, CheckSquare, CircleDollarSign, CloudUpload, Code2, Database,
  FileText, Landmark, MessageCircle, PackageCheck, Plane, Send, Settings, ShoppingBag, Users,
} from "lucide-react";

const icons = {
  communication: MessageCircle,
  calendar: CalendarDays,
  purchase: ShoppingBag,
  reservation: Plane,
  finance: Landmark,
  code: Code2,
  file: FileText,
  task: CheckSquare,
  account: Settings,
  crm: Users,
  database: Database,
  deployment: CloudUpload,
  form: Send,
  other: PackageCheck,
} as const;

export function ActionIcon({ category }: { category: string }) {
  const Icon = icons[category as keyof typeof icons] ?? CircleDollarSign;
  return <span className={`action-icon icon-${category}`}><Icon size={19} strokeWidth={2} /></span>;
}
