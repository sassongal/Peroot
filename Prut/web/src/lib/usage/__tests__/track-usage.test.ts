// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { trackUsage, getSessionId } from "../track-usage";

describe("track-usage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("getSessionId returns a stable UUID per session", () => {
    const a = getSessionId();
    const b = getSessionId();
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("trackUsage POSTs to /api/prompts/:id/track-usage", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    await trackUsage("prompt-123", "library");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/prompts/prompt-123/track-usage",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.source).toBe("library");
    expect(body.session_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("trackUsage swallows errors silently", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch;
    await expect(trackUsage("p", "library")).resolves.toBeUndefined();
  });
});
