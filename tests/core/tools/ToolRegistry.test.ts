import { MathTool } from "../../../src/adapters/tools/MathTool";
import type {
  Tool,
  ToolCallRequest,
  ToolCallResult,
} from "../../../src/core/tools/Tool.interface";
import { ToolRegistry } from "../../../src/core/tools/ToolRegistry";

test("tool registry lists definitions from registered tools", async () => {
  const registry = new ToolRegistry([new MathTool()]);

  await expect(registry.list()).resolves.toEqual([
    expect.objectContaining({ name: "math" }),
  ]);
});

test("tool registry lists a deterministic tool catalog", async () => {
  const first = new ToolRegistry([
    new TestTool("zeta", { type: "object", properties: { b: {}, a: {} } }),
    new TestTool("alpha", { type: "object", properties: { d: {}, c: {} } }),
  ]);
  const second = new ToolRegistry([
    new TestTool("alpha", { properties: { c: {}, d: {} }, type: "object" }),
    new TestTool("zeta", { properties: { a: {}, b: {} }, type: "object" }),
  ]);

  const firstCatalog = await first.list();
  const secondCatalog = await second.list();

  expect(firstCatalog).toEqual(secondCatalog);
  expect(firstCatalog.map((tool) => tool.name)).toEqual(["alpha", "zeta"]);
  expect(Object.keys(firstCatalog[0]?.inputSchema ?? {})).toEqual([
    "properties",
    "type",
  ]);
  expect(Object.keys(firstCatalog[0]?.inputSchema.properties ?? {})).toEqual([
    "c",
    "d",
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

class TestTool implements Tool {
  readonly definition;

  constructor(name: string, inputSchema: Readonly<Record<string, unknown>>) {
    this.definition = {
      name,
      description: `${name} test tool`,
      inputSchema,
    };
  }

  async execute(request: ToolCallRequest): Promise<ToolCallResult> {
    return {
      callId: request.callId,
      name: request.name,
      output: "ok",
      isError: false,
    };
  }
}
