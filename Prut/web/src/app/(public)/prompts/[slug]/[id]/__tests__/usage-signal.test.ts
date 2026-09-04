import { describe, it, expect, vi, afterEach } from "vitest";
import { sendUsageSignal } from "../usage-signal";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendUsageSignal", () => {
  it("posts the event with keepalive and the catalogue source", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);

    sendUsageSignal("abc", "enhance", 120);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/prompt-usage");
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(JSON.parse(init.body)).toEqual({
      prompt_key: "abc",
      event_type: "enhance",
      source: "catalog_detail",
      prompt_length: 120,
    });
  });

  it("swallows a rejected request and a throwing fetch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("401")));
    expect(() => sendUsageSignal("abc", "copy", 3)).not.toThrow();
    await Promise.resolve();

    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("closed");
      }),
    );
    expect(() => sendUsageSignal("abc", "copy", 3)).not.toThrow();
  });
});
