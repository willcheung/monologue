import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (typeof params.workspaceId === "string") query.set("workspaceId", params.workspaceId);
  redirect(`/recap${query.size ? `?${query}` : ""}#daily-report`);
}
