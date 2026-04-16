import { DELETE, GET, POST } from "~/service/config/http";
import type {
  ControlPlaybackSessionParams,
  ControlPlaybackSessionResponse,
  CreatePlaybackSessionParams,
  CreatePlaybackSessionResponse,
  FindRecordingsParams,
  FindRecordingsResponse,
  MonthlyParams,
  MonthlyResponse,
  PlaybackCapabilitiesResponse,
  QueryPlaybackFilesParams,
  QueryPlaybackFilesResponse,
  TimelineParams,
  TimelineResponse,
} from "./state";
import { getToken } from "../user/user";

export const findRecordingsKey = "findRecordings";
export const timelineKey = "recordingsTimeline";
export const monthlyKey = "recordingsMonthly";
export const gbPlaybackCapabilitiesKey = "gbPlaybackCapabilities";

export async function FindRecordings(params: FindRecordingsParams) {
  return await GET<FindRecordingsResponse>("/recordings", params);
}

export async function GetTimeline(params: TimelineParams) {
  return await GET<TimelineResponse>("/recordings/timeline", params);
}

export async function GetMonthly(params: MonthlyParams) {
  return await GET<MonthlyResponse>("/recordings/monthly", params);
}

function normalizeAuthToken(token?: string | null): string | undefined {
  const value = (token ?? getToken() ?? "").trim();
  if (!value) return undefined;
  return value.startsWith("Bearer ") ? value : `Bearer ${value}`;
}

/**
 * 为什么统一转成绝对 URL：
 * 回放场景会在代理、直连、嵌套路由之间切换，统一为绝对地址可减少环境差异带来的播放失败。
 */
function ensureAbsoluteUrl(input: string): URL {
  if (/^https?:\/\//i.test(input)) {
    return new URL(input);
  }
  return new URL(input, window.location.origin);
}

/**
 * 为什么在前端再做路径归一化：
 * 后端历史数据与新数据可能并存，前端兜底能保证旧数据也能被稳定播放，降低线上兼容风险。
 */
function ensureRecordingPath(path: string): string {
  const raw = path.trim();
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/static/recordings/")) return raw;
  if (raw.startsWith("static/recordings/")) return `/${raw}`;
  const relativePath = raw.startsWith("/") ? raw.slice(1) : raw;
  return `/static/recordings/${relativePath}`;
}

export function GetHlsPlaylistUrl(
  cid: string,
  startMs: number,
  endMs: number,
  token?: string,
): string {
  const baseUrl = `/recordings/channels/${cid}/index.m3u8?start_ms=${startMs}&end_ms=${endMs}`;
  const authToken = normalizeAuthToken(token);
  return authToken
    ? `${baseUrl}&token=${encodeURIComponent(authToken)}`
    : baseUrl;
}

export function GetRecordingMp4Url(path: string, token?: string): string {
  const normalizedPath = ensureRecordingPath(path);
  if (!normalizedPath) return normalizedPath;

  const url = ensureAbsoluteUrl(normalizedPath);
  const authToken = normalizeAuthToken(token);
  if (authToken) {
    url.searchParams.set("token", authToken);
  }
  return url.toString();
}

export function GetRecordingDownloadUrl(recordingId: number): string {
  return `/recordings/${recordingId}/download`;
}

/**
 * 为什么独立文件查询接口：
 * 把“可播放文件选择”与“会话建立”分离，方便后续接入真实 SIP 录像目录查询而不改页面流程。
 */
export async function QueryPlaybackFiles(params: QueryPlaybackFilesParams) {
  return await POST<QueryPlaybackFilesResponse>("/gb28181/playback/files/query", params);
}

/**
 * 为什么创建会话单独封装：
 * 回放会话是后续控制动作的锚点，单独入口便于统一埋点和故障回放。
 */
export async function CreatePlaybackSession(params: CreatePlaybackSessionParams) {
  return await POST<CreatePlaybackSessionResponse>("/gb28181/playback/sessions", params);
}

/**
 * 为什么控制接口只传 sessionId + action：
 * 让页面层不感知后端协议细节，后续替换为真实 SIP INFO/BYE 映射时前端改动最小。
 */
export async function ControlPlaybackSession(sessionId: string, params: ControlPlaybackSessionParams) {
  return await POST<ControlPlaybackSessionResponse>(`/gb28181/playback/sessions/${sessionId}/control`, params);
}

/**
 * 为什么显式删除会话：
 * 防止页面切换或异常退出后残留会话，减少后端资源占用与状态漂移。
 */
export async function DeletePlaybackSession(sessionId: string) {
  return await DELETE(`/gb28181/playback/sessions/${sessionId}`);
}

/**
 * 为什么暴露能力探测：
 * 设备兼容性不一致时，前端可以提前降级控件而不是让用户在操作后才看到错误。
 */
export async function GetPlaybackCapabilities(deviceId: string) {
  return await GET<PlaybackCapabilitiesResponse>(`/gb28181/devices/${deviceId}/playback/capabilities`);
}
