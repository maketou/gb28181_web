export type PlannerTool = "select" | "wall" | "room" | "camera" | "pan";

export type FloorPlanTemplateId = "small_room" | "corridor" | "l_room";

export type PlannerPoint = {
  x: number;
  y: number;
};

export type PlannerView = {
  x: number;
  y: number;
  scale: number;
};

export type FloorWall = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  groupId?: string | null;
};

export type CameraMarker = {
  id: string;
  x: number;
  y: number;
  angle: number;
  fov: number;
  range: number;
  channelId: string | null;
  channelName: string | null;
  groupId?: string | null;
  deviceName?: string | null;
  latestEventAt?: number | null;
  latestEventImage?: string | null;
  latestEventLabel?: string | null;
  latestEventScore?: number | null;
};

/**
 * 为什么底图只存 src 字符串：
 * 与撤销栈、localStorage、JSON 导出同一套序列化；data URL 或 `/web/...` 静态路径都能持久化，后端上传就绪后只需把 src 换成接口返回的 URL。
 */
export type FloorPlanBackground = {
  src: string;
};

export type FloorPlanState = {
  version: 3;
  walls: FloorWall[];
  cameras: CameraMarker[];
  /** 铺满世界矩形内的「包含」缩放，null 表示沿用纯白底+网格 */
  background: FloorPlanBackground | null;
  view: PlannerView;
  updatedAt: number;
};

export type PlannerSelection = {
  wallIds: string[];
  cameraIds: string[];
} | null;

export type LatestCameraEvent = {
  channelId: string;
  startedAt: number;
  imageSrc: string;
  label: string;
  score: number;
};
