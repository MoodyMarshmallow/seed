import { MathTool } from "../../../src/adapters/tools/MathTool";
import { ToolRegistry } from "../../../src/core/tools/ToolRegistry";

test("tool registry lists definitions from registered tools", async () => {
  const registry = new ToolRegistry([new MathTool()]);

  await expect(registry.list()).resolves.toEqual([
    expect.objectContaining({ name: "math" }),
  ]);
});

test("tool registry dispatches calls to the matching tool", async () => {
  const registry = new ToolRegistry([new MathTool()]);

  await expect(
    registry.execute({
      callId: "call_1",
      name: "math",
      input: { operation: "add", left: 2, right: 3 },
    }),
  ).resolves.toEqual({
    callId: "call_1",
    name: "math",
    output: "5",
    isError: false,
  });
});

test("tool registry returns structured errors for missing tools", async () => {
  const registry = new ToolRegistry([]);

  await expect(
    registry.execute({ callId: "call_1", name: "missing", input: {} }),
  ).resolves.toEqual({
    callId: "call_1",
    name: "missing",
    output: "Tool 'missing' is not available in this agent.",
    isError: true,
  });
});
