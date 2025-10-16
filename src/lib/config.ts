// Centralized frontend config for time windows and refresh interval
// Reads from Vite env variables with sensible defaults

function parseTimeToMinutes(hhmm: string, fallback: number): number {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) return fallback;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  return h * 60 + min;
}

export const CHECKIN_START_MIN = parseTimeToMinutes(
  (import.meta as any).env?.VITE_CHECKIN_START ?? '07:00',
  7 * 60
);

export const CHECKIN_END_MIN = parseTimeToMinutes(
  (import.meta as any).env?.VITE_CHECKIN_END ?? '11:00',
  11 * 60
);

export const CHECKOUT_START_MIN = parseTimeToMinutes(
  (import.meta as any).env?.VITE_CHECKOUT_START ?? '12:00',
  12 * 60
);

export const REFRESH_MS = Number((import.meta as any).env?.VITE_REFRESH_MS ?? 300000);

export function getNowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// Signature modal and canvas sizing
function parsePositiveInt(v: any, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const SIGNATURE_MODAL_WIDTH = parsePositiveInt(
  (import.meta as any).env?.VITE_SIGNATURE_MODAL_WIDTH ?? 520,
  520
);

export const SIGNATURE_MODAL_HEIGHT = parsePositiveInt(
  (import.meta as any).env?.VITE_SIGNATURE_MODAL_HEIGHT ?? 480,
  480
);

export const SIGNATURE_CANVAS_WIDTH = parsePositiveInt(
  (import.meta as any).env?.VITE_SIGNATURE_CANVAS_WIDTH ?? 450,
  450
);

export const SIGNATURE_CANVAS_HEIGHT = parsePositiveInt(
  (import.meta as any).env?.VITE_SIGNATURE_CANVAS_HEIGHT ?? 240,
  240
);
