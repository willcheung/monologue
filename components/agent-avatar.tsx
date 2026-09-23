function initials(name: string) {
  return name.split(/\s+|·/).map((part) => part.trim()).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function AgentAvatar({ name, large = false }: { name: string; large?: boolean }) {
  const palette = (name.codePointAt(0) ?? 0) % 5;
  return <span className={`agent-avatar agent-avatar-${palette}${large ? " agent-avatar-large" : ""}`} aria-hidden="true">{initials(name)}</span>;
}
