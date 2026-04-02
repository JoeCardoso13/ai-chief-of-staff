import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

const renderSpy = vi.fn();
const createRootSpy = vi.fn(() => ({ render: renderSpy }));

vi.mock("react-dom/client", () => ({
  createRoot: createRootSpy,
}));

describe("main entrypoint", () => {
  beforeEach(() => {
    vi.resetModules();
    renderSpy.mockClear();
    createRootSpy.mockClear();

    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("mounts the app into the root element", async () => {
    await import("../src/main.tsx");

    expect(createRootSpy).toHaveBeenCalledWith(
      document.getElementById("root")
    );
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});
