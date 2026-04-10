import { FLOOR_PLAN_WORLD_HEIGHT, FLOOR_PLAN_WORLD_WIDTH } from "./floor_plan.storage";
import type { FloorPlanBackground } from "./floor_plan.types";

/** 与 Vite base 一致，静态资源放在 public/ 下时通过该前缀访问 */
const WEB_BASE = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

/**
 * 为什么提供内置示例路径：
 * 后端未就绪时同事可把图放进 `public/floor-plan/`，用户一键套用验证流程；后续上传接口只需返回可访问 URL 并写入 `background.src`。
 */
export const FLOOR_PLAN_SAMPLE_BACKGROUND_SRC = `${WEB_BASE}floor-plan/sample-floor.svg`;

const ACCEPT_IMAGE =
  "image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/bmp,image/avif";

export function floorPlanBackgroundAcceptAttribute() {
  return ACCEPT_IMAGE;
}

/**
 * 为什么用「包含」缩放：
 * 任意长宽比的图纸都要完整落在固定世界矩形内，避免拉伸变形导致与现场不符；用户主要靠「对齐」而非像素级 CAD。
 */
export function backgroundContainLayout(
  imageWidth: number,
  imageHeight: number,
): { drawW: number; drawH: number; offsetX: number; offsetY: number } {
  const iw = Math.max(1, imageWidth);
  const ih = Math.max(1, imageHeight);
  const s = Math.min(FLOOR_PLAN_WORLD_WIDTH / iw, FLOOR_PLAN_WORLD_HEIGHT / ih);
  const drawW = iw * s;
  const drawH = ih * s;
  return {
    drawW,
    drawH,
    offsetX: (FLOOR_PLAN_WORLD_WIDTH - drawW) / 2,
    offsetY: (FLOOR_PLAN_WORLD_HEIGHT - drawH) / 2,
  };
}

/**
 * 为什么读尺寸用 Image 而不是 File 直传 Konva：
 * 部分格式在未解码前无法得知像素尺寸，contain 偏移会错；失败时降级为铺满世界矩形，至少能显示而不白屏。
 */
export function readImageNaturalSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) {
        reject(new Error("BAD_DIMENSIONS"));
        return;
      }
      resolve({ width: w, height: h });
    };
    img.onerror = () => reject(new Error("LOAD_FAILED"));
    img.src = src;
  });
}

export async function buildBackgroundFromUserFile(file: File): Promise<FloorPlanBackground> {
  if (!file.type.startsWith("image/")) {
    throw new Error("NOT_IMAGE");
  }
  const maxBytes = 12 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("FILE_TOO_LARGE");
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("READ_FAILED"));
      }
    };
    reader.onerror = () => reject(new Error("READ_FAILED"));
    reader.readAsDataURL(file);
  });
  await readImageNaturalSize(dataUrl);
  return { src: dataUrl };
}
