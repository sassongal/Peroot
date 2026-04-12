// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useHomeMediaState } from "../useHomeMediaState";
import { CapabilityMode } from "@/lib/capability-mode";

// Minimal localStorage stub (jsdom's localStorage.clear may be unavailable in some configs)
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
  }),
};
vi.stubGlobal("localStorage", localStorageMock);

describe("useHomeMediaState", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("initializes imagePlatform to 'general'", () => {
    const { result } = renderHook(() =>
      useHomeMediaState({ selectedCapability: CapabilityMode.STANDARD })
    );
    expect(result.current.imagePlatform).toBe("general");
  });

  it("initializes imageOutputFormat to 'text'", () => {
    const { result } = renderHook(() =>
      useHomeMediaState({ selectedCapability: CapabilityMode.STANDARD })
    );
    expect(result.current.imageOutputFormat).toBe("text");
  });

  it("initializes imageAspectRatio to empty string", () => {
    const { result } = renderHook(() =>
      useHomeMediaState({ selectedCapability: CapabilityMode.STANDARD })
    );
    expect(result.current.imageAspectRatio).toBe("");
  });

  it("initializes videoPlatform to 'general'", () => {
    const { result } = renderHook(() =>
      useHomeMediaState({ selectedCapability: CapabilityMode.STANDARD })
    );
    expect(result.current.videoPlatform).toBe("general");
  });

  it("initializes videoAspectRatio to empty string", () => {
    const { result } = renderHook(() =>
      useHomeMediaState({ selectedCapability: CapabilityMode.STANDARD })
    );
    expect(result.current.videoAspectRatio).toBe("");
  });

  it("initializes targetModel to 'general' when localStorage is empty", () => {
    const { result } = renderHook(() =>
      useHomeMediaState({ selectedCapability: CapabilityMode.STANDARD })
    );
    expect(result.current.targetModel).toBe("general");
  });

  it("initializes targetModel from localStorage if set", () => {
    localStorage.setItem("peroot_target_model", "claude");
    const { result } = renderHook(() =>
      useHomeMediaState({ selectedCapability: CapabilityMode.STANDARD })
    );
    expect(result.current.targetModel).toBe("claude");
  });

  it("setImagePlatform updates imagePlatform", () => {
    const { result } = renderHook(() =>
      useHomeMediaState({ selectedCapability: CapabilityMode.IMAGE_GENERATION })
    );
    act(() => {
      result.current.setImagePlatform("midjourney");
    });
    expect(result.current.imagePlatform).toBe("midjourney");
  });

  it("setImageOutputFormat updates imageOutputFormat", () => {
    const { result } = renderHook(() =>
      useHomeMediaState({ selectedCapability: CapabilityMode.IMAGE_GENERATION })
    );
    act(() => {
      result.current.setImageOutputFormat("json");
    });
    expect(result.current.imageOutputFormat).toBe("json");
  });

  it("setImageAspectRatio updates imageAspectRatio", () => {
    const { result } = renderHook(() =>
      useHomeMediaState({ selectedCapability: CapabilityMode.IMAGE_GENERATION })
    );
    act(() => {
      result.current.setImageAspectRatio("16:9");
    });
    expect(result.current.imageAspectRatio).toBe("16:9");
  });

  it("setVideoPlatform updates videoPlatform", () => {
    const { result } = renderHook(() =>
      useHomeMediaState({ selectedCapability: CapabilityMode.VIDEO_GENERATION })
    );
    act(() => {
      result.current.setVideoPlatform("runway");
    });
    expect(result.current.videoPlatform).toBe("runway");
  });

  it("setVideoAspectRatio updates videoAspectRatio", () => {
    const { result } = renderHook(() =>
      useHomeMediaState({ selectedCapability: CapabilityMode.VIDEO_GENERATION })
    );
    act(() => {
      result.current.setVideoAspectRatio("9:16");
    });
    expect(result.current.videoAspectRatio).toBe("9:16");
  });

  it("handleSetTargetModel updates targetModel and persists to localStorage", () => {
    const { result } = renderHook(() =>
      useHomeMediaState({ selectedCapability: CapabilityMode.STANDARD })
    );
    act(() => {
      result.current.handleSetTargetModel("chatgpt");
    });
    expect(result.current.targetModel).toBe("chatgpt");
    expect(localStorage.getItem("peroot_target_model")).toBe("chatgpt");
  });

  it("handleSetTargetModel overwrites previous localStorage value", () => {
    localStorage.setItem("peroot_target_model", "claude");
    const { result } = renderHook(() =>
      useHomeMediaState({ selectedCapability: CapabilityMode.STANDARD })
    );
    act(() => {
      result.current.handleSetTargetModel("gemini");
    });
    expect(result.current.targetModel).toBe("gemini");
    expect(localStorage.getItem("peroot_target_model")).toBe("gemini");
  });
});
