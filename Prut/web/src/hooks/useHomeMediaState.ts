import { useState, useCallback } from "react";
import { CapabilityMode } from "@/lib/capability-mode";
import { ImagePlatform, ImageOutputFormat } from "@/lib/media-platforms";
import { VideoPlatform } from "@/lib/video-platforms";
import { TargetModel } from "@/lib/engines/types";

export interface HomeMediaState {
  imagePlatform: ImagePlatform;
  setImagePlatform: (platform: ImagePlatform) => void;
  imageOutputFormat: ImageOutputFormat;
  setImageOutputFormat: (format: ImageOutputFormat) => void;
  imageAspectRatio: string;
  setImageAspectRatio: (ratio: string) => void;
  videoPlatform: VideoPlatform;
  setVideoPlatform: (platform: VideoPlatform) => void;
  videoAspectRatio: string;
  setVideoAspectRatio: (ratio: string) => void;
  targetModel: TargetModel;
  handleSetTargetModel: (model: TargetModel) => void;
}

interface UseHomeMediaStateProps {
  selectedCapability: CapabilityMode;
}

export function useHomeMediaState(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _props: UseHomeMediaStateProps
): HomeMediaState {
  const [imagePlatform, setImagePlatform] = useState<ImagePlatform>("general");
  const [imageOutputFormat, setImageOutputFormat] =
    useState<ImageOutputFormat>("text");
  const [imageAspectRatio, setImageAspectRatio] = useState("");
  const [videoPlatform, setVideoPlatform] = useState<VideoPlatform>("general");
  const [videoAspectRatio, setVideoAspectRatio] = useState("");
  const [targetModel, setTargetModel] = useState<TargetModel>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("peroot_target_model");
      const valid: TargetModel[] = ["chatgpt", "claude", "gemini", "general"];
      if (stored && valid.includes(stored as TargetModel)) return stored as TargetModel;
    }
    return "general";
  });

  const handleSetTargetModel = useCallback((model: TargetModel) => {
    setTargetModel(model);
    try {
      localStorage.setItem("peroot_target_model", model);
    } catch {
      // QuotaExceededError — state updated, persistence skipped
    }
  }, []);

  return {
    imagePlatform,
    setImagePlatform,
    imageOutputFormat,
    setImageOutputFormat,
    imageAspectRatio,
    setImageAspectRatio,
    videoPlatform,
    setVideoPlatform,
    videoAspectRatio,
    setVideoAspectRatio,
    targetModel,
    handleSetTargetModel,
  };
}
