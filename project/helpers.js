/* Date + format helpers (plain JS, no React) */

window.CAL = window.CAL || {};

(function () {
  const PAD = (n) => String(n).padStart(2, "0");

  function ymd(d) {
    return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}`;
  }
  function parseYmd(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }
  function addMonths(d, n) {
    const x = new Date(d);
    x.setMonth(x.getMonth() + n);
    return x;
  }
  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function isSameYmd(a, b) {
    return ymd(a) === ymd(b);
  }
  function startOfWeek(d, weekStart = 0) {
    const x = startOfDay(d);
    const diff = (x.getDay() - weekStart + 7) % 7;
    x.setDate(x.getDate() - diff);
    return x;
  }
  function weekDays(start) {
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }
  function monthGrid(viewDate, weekStart = 0) {
    // Returns 6x7 grid of dates spanning the month, padded with neighboring days.
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const start = startOfWeek(first, weekStart);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }
  function isoWeek(d) {
    // ISO 8601 week number
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  }
  function minutesSinceMidnight(d) {
    return d.getHours() * 60 + d.getMinutes();
  }
  function fmtHour(h, time24) {
    if (time24) return `${PAD(h)}:00`;
    if (h === 0) return "12 AM";
    if (h === 12) return "12 PM";
    if (h < 12) return `${h} AM`;
    return `${h - 12} PM`;
  }
  function fmtTime(d, time24) {
    if (time24) return `${PAD(d.getHours())}:${PAD(d.getMinutes())}`;
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${PAD(m)} ${ampm}`;
  }
  function fmtTimeShort(d, time24) {
    if (time24) return `${PAD(d.getHours())}:${PAD(d.getMinutes())}`;
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "p" : "a";
    const h12 = h % 12 || 12;
    return m === 0 ? `${h12}${ampm}` : `${h12}:${PAD(m)}${ampm}`;
  }
  function fmtRange(s, e, time24) {
    return `${fmtTime(s, time24)} – ${fmtTime(e, time24)}`;
  }
  function monthName(d, long) {
    return d.toLocaleString("en-US", { month: long ? "long" : "short" });
  }
  function weekdayName(d, kind) {
    return d.toLocaleString("en-US", { weekday: kind || "short" });
  }
  function makeId() {
    return Math.random().toString(36).slice(2, 10);
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Build ISO local datetime string (no Z, for inputs)
  function toLocalISO(d) {
    return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}T${PAD(d.getHours())}:${PAD(d.getMinutes())}`;
  }
  function fromLocalISO(s) { return new Date(s); }

  function snapTo30(d) {
    const x = new Date(d);
    const m = x.getMinutes();
    x.setMinutes(m < 30 ? 0 : 30, 0, 0);
    return x;
  }

  // Highlight matches in a string
  function highlight(text, q) {
    if (!q) return [{ t: text, hl: false }];
    const lower = text.toLowerCase();
    const needle = q.toLowerCase();
    const out = [];
    let i = 0;
    while (i < text.length) {
      const idx = lower.indexOf(needle, i);
      if (idx === -1) { out.push({ t: text.slice(i), hl: false }); break; }
      if (idx > i) out.push({ t: text.slice(i, idx), hl: false });
      out.push({ t: text.slice(idx, idx + needle.length), hl: true });
      i = idx + needle.length;
    }
    return out;
  }

  Object.assign(window.CAL, {
    PAD, ymd, parseYmd, startOfDay, addDays, addMonths, sameDay, isSameYmd,
    startOfWeek, weekDays, monthGrid, isoWeek, minutesSinceMidnight,
    fmtHour, fmtTime, fmtTimeShort, fmtRange, monthName, weekdayName,
    makeId, clamp, toLocalISO, fromLocalISO, snapTo30, highlight,
  });
})();
