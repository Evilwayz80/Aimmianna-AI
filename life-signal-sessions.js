export const SIGNAL_SESSION_LIMIT = 30;
export const SIGNAL_MARK_LIMIT = 24;
const date = (v) => Number.isSafeInteger(v) && v > 0 && v <= 8.64e15;
const field = (v) => Number.isFinite(v) && v >= 0 && v <= 1e7;
const cleanText = (v, limit) => typeof v === "string" ? v.trim().slice(0, limit) : "";

export function loadSignalSessions(raw) {
  if (!raw) return [];
  const src = JSON.parse(raw);
  if (src?.version !== 1 || !Array.isArray(src.sessions)) throw new Error("Invalid session log");
  return src.sessions.slice(0, SIGNAL_SESSION_LIMIT).flatMap((s) => {
    if (!date(s?.started) || !date(s.ended) || s.ended < s.started) return [];
    return [{
      started: s.started, ended: s.ended,
      title: cleanText(s.title, 65) || "Untitled investigation",
      notes: cleanText(s.notes, 600),
      low: field(s.low) && field(s.high) && s.low <= s.high ? s.low : null,
      high: field(s.low) && field(s.high) && s.low <= s.high ? s.high : null,
      motionUsed: s.motionUsed === true,
      peaks: Number.isSafeInteger(s.peaks) && s.peaks > 0 ? Math.min(s.peaks, 1e9) : 0,
      marks: Array.isArray(s.marks) ? s.marks.filter((m) => date(m) && m >= s.started && m <= s.ended).slice(0, SIGNAL_MARK_LIMIT) : [],
    }];
  });
}

export function startSignalSession() {
  return { started: Date.now(), title: "", notes: "", low: null, high: null, motionUsed: false, peaks: 0, marks: [] };
}

export function addSignalField(session, reading) {
  if (!session || !field(reading)) return;
  const rounded = Math.round(reading * 10) / 10;
  session.low = session.low === null ? rounded : Math.min(session.low, rounded);
  session.high = session.high === null ? rounded : Math.max(session.high, rounded);
}

export function sessionSummary(s) {
  const mag = s.low === null ? "No magnetic readings" : `Magnetic range: ${s.low.toFixed(1)}–${s.high.toFixed(1)} µT`;
  const motion = s.motionUsed ? `${s.peaks} motion ${s.peaks === 1 ? "peak" : "peaks"}` : "No motion readings";
  return `${mag} · ${motion} · ${s.marks.length} ${s.marks.length === 1 ? "marker" : "markers"}`;
}
