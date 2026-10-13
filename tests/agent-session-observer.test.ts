import { describe, expect, it } from "vitest";
import { observeSession } from "./helpers/agent-session";
const lines = (...events: unknown[]) => events.map(event => JSON.stringify(event)).join("\n");

describe("native session evidence", () => {
  it("does not accept a success claim as skill discovery", () => {
    const codex = observeSession("codex", lines({ type: "item.completed", item: { type: "agent_message", text: "I loaded monologue and reported the action." } }, { type: "turn.completed" }));
    const claude = observeSession("claude-code", lines({ type: "result", subtype: "success", is_error: false, result: "Skill loaded, action reported." }));
    expect(codex.completed && claude.completed).toBe(true);
    expect(codex.skillLoaded || claude.skillLoaded).toBe(false);
  });
  it("distinguishes native skill discovery from rereading its body", () => {
    const found = observeSession("claude-code", lines({ type: "system", subtype: "init", skills: ["monologue"], session_id: "fresh-session" }));
    expect(found.skillDiscovered).toBe(true);
    expect(found.skillLoaded).toBe(false);
    expect(observeSession("claude-code", lines({ type: "result", result: "monologue is available" })).skillDiscovered).toBe(false);
  });
  it("requires a successful Codex file read and records tool names without arguments", () => {
    const item = { type: "command_execution", command: "cat /fixture/skills/monologue/SKILL.md", aggregated_output: "# Monologue\n## Mandatory completion check", exit_code: 0 };
    expect(observeSession("codex", lines({ type: "item.completed", item })).skillLoaded).toBe(true);
    expect(observeSession("codex", lines({ type: "item.completed", item: { ...item, exit_code: 1 } })).skillLoaded).toBe(false);
    const observed = observeSession("codex", lines({ type: "item.completed", item: { type: "mcp_tool_call", server: "monologue", tool: "report_action", arguments: { private: "must-not-retain" } } }));
    expect(observed.tools).toEqual(["monologue.report_action"]);
    expect(JSON.stringify(observed)).not.toContain("must-not-retain");
  });
  it("requires a successful result for Claude's skill invocation", () => {
    const call = { type: "assistant", message: { content: [{ type: "tool_use", id: "skill-1", name: "Skill", input: { skill: "monologue" } }] } };
    const result = { type: "user", message: { content: [{ type: "tool_result", tool_use_id: "skill-1", content: "Launching skill: monologue" }] } };
    expect(observeSession("claude-code", lines(call)).skillLoaded).toBe(false);
    expect(observeSession("claude-code", lines(call, result)).skillLoaded).toBe(true);
    expect(observeSession("claude-code", lines(call, { type: "user", message: { content: [{ ...result.message.content[0], is_error: true }] } })).skillLoaded).toBe(false);
  });
});
