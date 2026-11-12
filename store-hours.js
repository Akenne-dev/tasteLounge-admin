// Copy of TheCityKitchen/public/store-hours.js (the customer app) — keep the two files the same.
/**
 * Taste Lounge — opening hours & "pause orders"
 * ---------------------------------------------
 * Everything comes from Admin → Store Settings (Firestore settings/store):
 *   hours:        { mon: { open: "09:00", close: "22:00", closed: false }, tue: {…}, … }
 *   timezone:     e.g. "Africa/Lagos" (the kitchen's local time)
 *   ordersPaused: true while the kitchen is too busy to take orders
 *   pauseMessage: optional text shown to customers while paused
 *
 * No hours saved = always open. A day whose close time is earlier than its open
 * time runs past midnight (e.g. 18:00 → 02:00).
 *
 *   const status = tlStoreStatus(settings);
 *   status.canOrder   → false when closed or paused
 *   status.message    → "We're closed right now · Opens tomorrow at 9:00 AM"
 */
const TL_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const TL_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function tlMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "").trim());
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  return h <= 24 && min < 60 ? h * 60 + min : null;
}

// "21:30" -> "9:30 PM"
function tlTimeLabel(hhmm) {
  const total = tlMinutes(hhmm);
  if (total === null) return "";
  const h = Math.floor(total / 60) % 24, m = total % 60;
  const suffix = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

// Day of week + minutes past midnight in the kitchen's timezone
function tlLocalNow(timezone, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || undefined, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(date);
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    return { day, minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")) };
  } catch (e) {
    return { day: date.getDay(), minutes: date.getHours() * 60 + date.getMinutes() };
  }
}

// The day's window in minutes, or null when closed / not set
function tlDayWindow(hours, dayIndex) {
  const d = hours && hours[TL_DAYS[(dayIndex + 7) % 7]];
  if (!d || d.closed) return null;
  const open = tlMinutes(d.open), close = tlMinutes(d.close);
  if (open === null || close === null || open === close) return null;
  return { open, close, overnight: close < open, openLabel: tlTimeLabel(d.open), closeLabel: tlTimeLabel(d.close) };
}

function tlHasHours(hours) {
  return !!hours && TL_DAYS.some((k) => hours[k] && (hours[k].closed || (hours[k].open && hours[k].close)));
}

function tlStoreStatus(settings, date = new Date()) {
  const s = settings || {};
  const paused = s.ordersPaused === true;
  const hours = s.hours;
  let open = true, closesAt = "", nextOpen = "";

  if (tlHasHours(hours)) {
    const now = tlLocalNow(s.timezone, date);
    const today = tlDayWindow(hours, now.day);
    const yesterday = tlDayWindow(hours, now.day - 1);

    if (today && !today.overnight && now.minutes >= today.open && now.minutes < today.close) {
      closesAt = today.closeLabel;
    } else if (today && today.overnight && now.minutes >= today.open) {
      closesAt = today.closeLabel;
    } else if (yesterday && yesterday.overnight && now.minutes < yesterday.close) {
      closesAt = yesterday.closeLabel;
    } else {
      open = false;
    }

    if (!open) {
      for (let i = 0; i <= 7; i++) {
        const w = tlDayWindow(hours, now.day + i);
        if (!w || (i === 0 && w.open <= now.minutes)) continue;
        const when = i === 0 ? "today" : i === 1 ? "tomorrow" : TL_DAY_NAMES[(now.day + i) % 7];
        nextOpen = `Opens ${when} at ${w.openLabel}`;
        break;
      }
    }
  }

  let message = "";
  if (paused) {
    message = (s.pauseMessage || "").trim() || "We're not taking new orders right now. Please check back soon.";
  } else if (!open) {
    message = "We're closed right now" + (nextOpen ? ` · ${nextOpen}` : "");
  }

  return { open, paused, canOrder: open && !paused, closesAt, nextOpen, message };
}

// [{ day: "Monday", text: "9:00 AM – 10:00 PM" }, …] starting Monday, for display
function tlHoursList(hours) {
  if (!tlHasHours(hours)) return [];
  return [1, 2, 3, 4, 5, 6, 0].map((i) => {
    const w = tlDayWindow(hours, i);
    return { day: TL_DAY_NAMES[i], text: w ? `${w.openLabel} – ${w.closeLabel}` : "Closed" };
  });
}
