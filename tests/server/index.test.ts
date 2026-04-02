import { beforeEach, describe, expect, test, vi } from "vitest";

const accessMock = vi.fn();
const staticMock = vi.fn(() => "static-middleware");
const useMock = vi.fn();
const getMock = vi.fn();
const listenMock = vi.fn((_port: number, cb?: () => void) => cb?.());
const sendFileMock = vi.fn();
const createAppMock = vi.fn(() => ({
  use: useMock,
  get: getMock,
  listen: listenMock,
}));
const anthropicCtorMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  function AnthropicMock(this: Record<string, unknown>) {
    anthropicCtorMock();
    this.messages = { create: vi.fn() };
  }

  return {
    default: AnthropicMock,
  };
});

vi.mock("node:fs/promises", () => ({
  default: {
    access: accessMock,
  },
}));

vi.mock("express", () => ({
  default: {
    static: staticMock,
  },
}));

vi.mock("../../server/app.js", () => ({
  createApp: createAppMock,
}));

describe("server index bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    accessMock.mockReset();
    staticMock.mockClear();
    useMock.mockClear();
    getMock.mockClear();
    listenMock.mockClear();
    sendFileMock.mockClear();
    createAppMock.mockClear();
    anthropicCtorMock.mockClear();
    delete process.env.PORT;
  });

  test("serves built frontend when dist exists", async () => {
    accessMock.mockResolvedValue(undefined);

    await import("../../server/index.ts");

    expect(anthropicCtorMock).toHaveBeenCalledTimes(1);
    expect(createAppMock).toHaveBeenCalledTimes(1);
    expect(staticMock).toHaveBeenCalledTimes(1);
    expect(useMock).toHaveBeenCalledWith("static-middleware");
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(listenMock).toHaveBeenCalledWith(3001, expect.any(Function));

    const routeHandler = getMock.mock.calls[0][1];
    routeHandler({}, { sendFile: sendFileMock });
    expect(sendFileMock).toHaveBeenCalledWith(expect.stringContaining("dist/index.html"));
  });

  test("skips static frontend wiring when dist is missing and respects PORT", async () => {
    accessMock.mockRejectedValue(new Error("missing dist"));
    process.env.PORT = "4321";

    await import("../../server/index.ts");

    expect(staticMock).not.toHaveBeenCalled();
    expect(useMock).not.toHaveBeenCalled();
    expect(getMock).not.toHaveBeenCalled();
    expect(listenMock).toHaveBeenCalledWith(4321, expect.any(Function));
  });
});
