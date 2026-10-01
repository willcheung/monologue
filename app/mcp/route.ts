import { handleMcpRequest, mcpOptions } from "@/lib/mcp-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = handleMcpRequest;
export const GET = handleMcpRequest;
export const DELETE = handleMcpRequest;
export const OPTIONS = mcpOptions;
