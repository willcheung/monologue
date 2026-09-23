import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AgentAvatar } from "./agent-avatar";

function relativeTime(value: Date | null) {
  if (!value) return "No actions yet";
  const seconds = Math.max(0, Math.floor((Date.now() - value.getTime()) / 1000));
  if (seconds < 60) return "Active just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Active ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Active ${days}d ago`;
}

export type AgentCardData = {
  id: string;
  name: string;
  platform: string | null;
  description: string | null;
  actionCount: number;
  lastActive: Date | null;
  systems: string[];
  connectedToMonologue: boolean;
};

export function AgentCard({ agent }: { agent: AgentCardData }) {
  return <Link href={`/agents/${agent.id}`} className="agent-card">
    <div className="agent-card-heading">
      <AgentAvatar name={agent.name} />
      <div><span>{agent.platform ?? "AI agent"}</span><h2>{agent.name}</h2></div>
      <ArrowUpRight size={18} />
    </div>
    <p>{agent.description ?? "An agent with a track record in your Monologue feed."}</p>
    <div className="agent-card-systems">
      <span>Has worked with</span>
      <div>{agent.systems.slice(0, 3).map((system) => <b key={system}>{system}</b>)}{agent.systems.length > 3 && <b>+{agent.systems.length - 3}</b>}</div>
    </div>
    <div className="agent-card-footer">
      <strong>{agent.actionCount} {agent.actionCount === 1 ? "action" : "actions"}</strong>
      <span>{relativeTime(agent.lastActive)}</span>
    </div>
  </Link>;
}
