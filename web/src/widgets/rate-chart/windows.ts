export const RATE_WINDOWS = ["1h", "3h", "6h", "12h", "24h"] as const;
export type RateWindow = (typeof RATE_WINDOWS)[number];
export const DEFAULT_RATE_WINDOW: RateWindow = "1h";

export const RPS = "RPS";
export const PERIOD = "Period";
export const NO_REQUESTS = "No requests in this window.";
export const POINT_MINUTE = "Each point is one minute.";
export const POINT_HOUR = "Each point is one hour.";
export const CHART_HEIGHT = 250;
export const MINUTE = 60;
export const RPS_COLOR = "#00f0ff";

export function pointMinutes(minutes: number) {
  return `Each point is ${minutes} minutes.`;
}

export function stepCaption(step: number) {
  const minutes = Math.round(step / MINUTE);
  if (minutes <= 1) return POINT_MINUTE;
  if (minutes === MINUTE) return POINT_HOUR;
  return pointMinutes(minutes);
}

export function pointLabel(at: string) {
  return at.slice(11, 16);
}
