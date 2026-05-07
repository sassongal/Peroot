// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import * as analyticsModule from "@/lib/analytics";
import {
  trackPalaceOpened,
  trackPalaceNodeClicked,
  trackPalaceNavigated,
} from "../palace-analytics";

describe("palace-analytics", () => {
  it("trackPalaceOpened captures palace_sidebar_opened with viewport", () => {
    const spy = vi
      .spyOn(analyticsModule.analytics!, "capture")
      .mockImplementation(() => undefined as never);
    trackPalaceOpened({ viewport: "desktop", promptCount: 42 });
    expect(spy).toHaveBeenCalledWith("palace_sidebar_opened", {
      viewport: "desktop",
      prompt_count: 42,
    });
  });

  it("trackPalaceNodeClicked captures edge_type and hop_index", () => {
    const spy = vi
      .spyOn(analyticsModule.analytics!, "capture")
      .mockImplementation(() => undefined as never);
    trackPalaceNodeClicked({
      fromId: "a",
      toId: "b",
      edgeType: "similarity",
      hopIndex: 1,
    });
    expect(spy).toHaveBeenCalledWith("palace_node_clicked", {
      from_id: "a",
      to_id: "b",
      edge_type: "similarity",
      hop_index: 1,
    });
  });

  it("trackPalaceNavigated marks success metric", () => {
    const spy = vi
      .spyOn(analyticsModule.analytics!, "capture")
      .mockImplementation(() => undefined as never);
    trackPalaceNavigated({ promptId: "p", fromNeighbor: true });
    expect(spy).toHaveBeenCalledWith("palace_navigated_to_prompt", {
      via: "palace",
      from_neighbor: true,
      prompt_id: "p",
    });
  });
});
