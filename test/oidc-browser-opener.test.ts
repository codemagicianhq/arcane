import { EventEmitter } from "node:events";
import { execFile } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openInDefaultBrowser } from "../src/modules/oidc.js";

vi.mock("node:child_process", () => ({ execFile: vi.fn() }));

const opener = vi.mocked(execFile);
const platformDescriptor = Object.getOwnPropertyDescriptor(process, "platform")!;

afterEach(() => {
  opener.mockReset();
  Object.defineProperty(process, "platform", platformDescriptor);
});

function onPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", { ...platformDescriptor, value: platform });
}

function mockChild(error: Error | null): EventEmitter {
  const child = new EventEmitter();
  opener.mockImplementation(((...args: unknown[]) => {
    const callback = args[3] as (error: Error | null) => void;
    queueMicrotask(() => callback(error));
    return child;
  }) as typeof execFile);
  return child;
}

describe("default browser opener", () => {
  it.each([
    ["win32", "rundll32", "url.dll,FileProtocolHandler"],
    ["darwin", "open", undefined],
    ["linux", "xdg-open", undefined],
  ] as const)("uses the %s launcher without a shell", async (platform, command, prefix) => {
    onPlatform(platform);
    mockChild(null);
    const url = "https://example.test/authorize?state=a%26b";
    await expect(openInDefaultBrowser(url)).resolves.toBe(true);
    expect(opener).toHaveBeenCalledOnce();
    const args = opener.mock.calls[0]!;
    expect(args[0]).toBe(command);
    expect(args[1]).toEqual(prefix ? [prefix, url] : [url]);
    expect(args[2]).toMatchObject({ windowsHide: true });
  });

  it("returns false when the launcher reports or emits an error", async () => {
    onPlatform("win32");
    mockChild(new Error("launcher missing"));
    await expect(openInDefaultBrowser("https://example.test/")).resolves.toBe(false);

    const child = mockChild(null);
    const opened = openInDefaultBrowser("https://example.test/");
    child.emit("error", new Error("launcher missing"));
    await expect(opened).resolves.toBe(false);
  });

  it("returns false if launching throws synchronously", async () => {
    opener.mockImplementation(() => { throw new Error("could not launch"); });
    await expect(openInDefaultBrowser("https://example.test/")).resolves.toBe(false);
  });
});
