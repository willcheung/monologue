import { categoryPresentation } from "@/lib/constants";

export function ActionIcon({ category }: { category: string }) {
  const { emoji, label } = categoryPresentation(category);
  return <span className={`action-icon icon-${category}`} role="img" aria-label={label}>{emoji}</span>;
}
