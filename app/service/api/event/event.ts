import { GET } from "~/service/config/http";
import type { Event, FindEventsParams, FindEventsResponse } from "./state";
import { getToken } from "../user/user";

export const findEventsKey = "findEvents";

export async function FindEvents(params: FindEventsParams) {
  return await GET<FindEventsResponse>("/events", params);
}

/**
 * 为什么在图片 URL 层补 token：
 * 图片请求不是统一 axios 流程，后端开启鉴权后若不在 URL 注入 token 会出现“列表可见但图片 401”的割裂体验。
 */
export function GetEventImageUrl(imagePath: string): string {
  if (!imagePath) return imagePath;
  if (imagePath.startsWith("http")) {
    return imagePath;
  }
  const base = `${window.location.origin}/events/image/${imagePath}`;
  const token = getToken()?.trim();
  if (!token) return base;
  const authToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  return `${base}?token=${encodeURIComponent(authToken)}`;
}

export type LatestChannelEvent = {
  channelId: string;
  startedAt: number;
  imageSrc: string;
  label: string;
  score: number;
  raw: Event;
};

/**
 * 为什么单独导出映射函数：
 * 批量预取与单通道查询共用同一字段语义，避免「列表页一条」与「详情一条」展示字段漂移。
 */
export function MapEventToLatestChannelEvent(item: Event, cid: string): LatestChannelEvent {
  return {
    channelId: cid,
    startedAt: item.started_at,
    imageSrc: GetEventImageUrl(item.image_path),
    label: item.label,
    score: item.score,
    raw: item,
  };
}

export async function FindLatestChannelEvent(cid: string): Promise<LatestChannelEvent | null> {
  const response = await FindEvents({
    page: 1,
    size: 1,
    cid,
    sort: "started_at desc",
  });

  const item = response.data.items?.[0];
  if (!item) {
    return null;
  }

  return MapEventToLatestChannelEvent(item, cid);
}
