import type {
  Tool,
  ToolCallRequest,
  ToolCallResult,
  ToolDefinition,
} from "../../core/tools/Tool.interface";

const MATH_TOOL: ToolDefinition = {
  name: "math",
  description:
    "Performs basic arithmetic: addition, subtraction, multiplication, and division.",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["add", "subtract", "multiply", "divide"],
      },
      left: { type: "number" },
      right: { type: "number" },
    },
    required: ["operation", "left", "right"],
    additionalProperties: false,
  },
};

type MathOperation = "add" | "subtract" | "multiply" | "divide";

interface MathInput {
  readonly operation: MathOperation;
  readonly left: number;
  readonly right: number;
}

/** Demonstration tool for basic arithmetic. */
export class MathTool implements Tool {
  readonly definition = MATH_TOOL;

  async execute(request: ToolCallRequest): Promise<ToolCallResult> {
    const input = parseMathInput(request.input);
    if (typeof input === "string") {
      return toolError(request, input);
    }

    if (input.operation === "divide" && input.right === 0) {
      return toolError(request, "Cannot divide by zero.");
    }

    return {
      callId: request.callId,
      name: request.name,
      output: String(calculate(input)),
      isError: false,
    };
  }
}

function parseMathInput(input: unknown): MathInput | string {
  if (!input || typeof input !== "object") {
    return "Math input must be an object.";
  }
  const candidate = input as Record<string, unknown>;
  if (!isOperation(candidate.operation)) {
    return "Math operation must be add, subtract, multiply, or divide.";
  }
  if (
    typeof candidate.left !== "number" ||
    typeof candidate.right !== "number"
  ) {
    return "Math operands must be numbers.";
  }
  return {
    operation: candidate.operation,
    left: candidate.left,
    right: candidate.right,
  };
}

function isOperation(value: unknown): value is MathOperation {
  return (
    value === "add" ||
    value === "subtract" ||
    value === "multiply" ||
    value === "divide"
  );
}

function calculate(input: MathInput): number {
  switch (input.operation) {
    case "add":
      return input.left + input.right;
    case "subtract":
      return input.left - input.right;
    case "multiply":
      return input.left * input.right;
    case "divide":
      return input.left / input.right;
  }
}

function toolError(request: ToolCallRequest, output: string): ToolCallResult {
  return {
    callId: request.callId,
    name: request.name,
    output,
    isError: true,
  };
}
