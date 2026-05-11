/* Week view: day headers, all-day strip, time grid with drag-create / move / resize */
const { useState: useStateW, useRef: useRefW, useEffect: useEffectW, useMemo: useMemoW } = React;

function WeekView(props) {
  const {
    weekStartDate, today, time24, density,
    events, tasks, categoriesById, visibleCats,
    onCreateAt, onEditEvent, onEditTask, onUpdateEvent, onToggleTask,
    mobileDayIndex,
  } = props;

  const { weekDays, ymd, addDays, minutesSinceMidnight, fmtHour, fmtTimeShort, sameDay } = window.CAL;
  const days = weekDays(weekStartDate);
  const SLOT = density === "compact" ? 22 : density === "spacious" ? 36 : 28;
  const HOUR = SLOT * 2;

  const scrollRef = useRefW(null);
  const gridRef = useRefW(null);

  // Set initial scroll to 8am
  useEffectW(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = 8 * HOUR - 20;
  }, [HOUR]);

  // ---- DRAG STATE ----
  const [drag, setDrag] = useStateW(null);
  // drag: { kind: 'create'|'move'|'resize', dayIdx, startMin, endMin, eventId?, origMins?, snapEvt? }

  function pxToMin(y) {
    return Math.max(0, Math.round(y / SLOT) * 30);
  }

  function getDayIndexFromX(x, rect, cols) {
    const gutter = 56;
    const colW = (rect.width - gutter) / cols;
    const idx = Math.floor((x - rect.left - gutter) / colW);
    return Math.max(0, Math.min(cols - 1, idx));
  }

  function startCreate(e, dayIdx) {
    if (e.target.closest(".event")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const m = pxToMin(y);
    setDrag({ kind: "create", dayIdx, startMin: m, endMin: m + 60 });
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (!drag) return;
    const grid = gridRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const cols = mobileDayIndex != null ? 1 : 7;
    const dayIdx = mobileDayIndex != null ? 0 : getDayIndexFromX(e.clientX, rect, cols);
    const y = e.clientY - rect.top;
    const m = pxToMin(y);
    if (drag.kind === "create") {
      setDrag({ ...drag, dayIdx, endMin: Math.max(drag.startMin + 30, m) });
    } else if (drag.kind === "move") {
      const newStart = Math.max(0, drag.origMins.start + (m - drag.anchorMin));
      const dur = drag.origMins.end - drag.origMins.start;
      setDrag({ ...drag, dayIdx, startMin: newStart, endMin: newStart + dur });
    } else if (drag.kind === "resize") {
      const newEnd = Math.max(drag.startMin + 30, m);
      setDrag({ ...drag, endMin: newEnd });
    }
  }

  function onMouseUp() {
    if (!drag) return;
    const realDayIdx = mobileDayIndex != null ? mobileDayIndex : drag.dayIdx;
    const date = days[realDayIdx];
    if (drag.kind === "create") {
      const s = new Date(date); s.setHours(0, drag.startMin, 0, 0);
      const en = new Date(date); en.setHours(0, drag.endMin, 0, 0);
      onCreateAt(s, en);
    } else if (drag.kind === "move" && drag.eventId) {
      const s = new Date(date); s.setHours(0, drag.startMin, 0, 0);
      const en = new Date(date); en.setHours(0, drag.endMin, 0, 0);
      onUpdateEvent(drag.eventId, { start: s.toISOString(), end: en.toISOString() });
    } else if (drag.kind === "resize" && drag.eventId) {
      const ev = events.find((x) => x.id === drag.eventId);
      if (ev) {
        const s = new Date(ev.start);
        const en = new Date(s); en.setHours(0, drag.endMin, 0, 0); en.setFullYear(s.getFullYear(), s.getMonth(), s.getDate());
        onUpdateEvent(drag.eventId, { end: en.toISOString() });
      }
    }
    setDrag(null);
  }

  useEffectW(() => {
    if (!drag) return;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    // eslint-disable-next-line
  }, [drag]);

  function startMove(e, ev, dayIdx) {
    e.stopPropagation();
    e.preventDefault();
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const m = pxToMin(y);
    const startD = new Date(ev.start);
    const endD = new Date(ev.end);
    const sMin = minutesSinceMidnight(startD);
    const eMin = minutesSinceMidnight(endD);
    setDrag({ kind: "move", dayIdx, eventId: ev.id, origMins: { start: sMin, end: eMin }, anchorMin: m, startMin: sMin, endMin: eMin });
  }

  function startResize(e, ev, dayIdx) {
    e.stopPropagation();
    e.preventDefault();
    const startD = new Date(ev.start);
    const endD = new Date(ev.end);
    setDrag({ kind: "resize", dayIdx, eventId: ev.id, startMin: minutesSinceMidnight(startD), endMin: minutesSinceMidnight(endD) });
  }

  // ---- now indicator ----
  const [nowMin, setNowMin] = useStateW(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  useEffectW(() => {
    const t = setInterval(() => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
    }, 60000);
    return () => clearInterval(t);
  }, []);
  // Force "today" relative to today prop for demo
  const todayIdx = days.findIndex((d) => sameDay(d, today));

  // ---- group items per day ----
  const allDayPerDay = days.map((d) => []);
  const timedPerDay = days.map((d) => []);

  events.forEach((ev) => {
    if (!visibleCats.has(ev.categoryId) && categoriesById[ev.categoryId]) return;
    if (ev.allDay) {
      // span dates
      const s = window.CAL.parseYmd(ev.start);
      const e = window.CAL.parseYmd(ev.end || ev.start);
      days.forEach((d, i) => {
        if (d >= s && d <= e) allDayPerDay[i].push({ ...ev, _kind: "event" });
      });
    } else {
      const s = new Date(ev.start);
      const idx = days.findIndex((d) => sameDay(d, s));
      if (idx >= 0) timedPerDay[idx].push(ev);
    }
  });

  // tasks → all-day strip (with floating-task bubble-forward logic)
  const todayYmd = ymd(today);
  tasks.forEach((t) => {
    if (!visibleCats.has(t.categoryId) && categoriesById[t.categoryId]) return;
    let displayDate = t.date;
    let bubbled = false;
    if (t.type === "float" && !t.done && t.date < todayYmd) {
      displayDate = todayYmd; bubbled = true;
    }
    const idx = days.findIndex((d) => ymd(d) === displayDate);
    if (idx >= 0) allDayPerDay[idx].push({ ...t, _kind: t.type, _bubbled: bubbled });
  });

  // ---- render ----
  return (
    <div className="week-wrap">
      <div className="day-headers">
        <div className="gutter">GMT-7</div>
        {days.map((d, i) => {
          const isToday = sameDay(d, today);
          return (
            <div
              key={i}
              className={"day-head" + (isToday ? " today" : "") + (mobileDayIndex === i ? " active-day" : "")}
            >
              <div className="day-head-dow">{d.toLocaleString("en-US", { weekday: "short" })}</div>
              <div className="day-head-num">{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      <div className="allday">
        <div className="allday-label">All day</div>
        {days.map((d, i) => (
          <div key={i} className={"allday-cell" + (mobileDayIndex === i ? " active-day" : "")}>
            {allDayPerDay[i].map((it) => {
              const cat = categoriesById[it.categoryId];
              const c = cat ? cat.color : "var(--ink)";
              if (it._kind === "event") {
                return (
                  <div key={it.id} className="allday-item event" style={{ "--c": c }} onClick={() => onEditEvent(it)}>
                    <span className="label">{it.title}</span>
                  </div>
                );
              }
              return (
                <div
                  key={it.id}
                  className={"allday-item " + (it._kind === "float" ? "float" : "task") + (it.done ? " done" : "") + (it._bubbled ? " bubbled" : "")}
                  style={{ "--c": c }}
                  onClick={(e) => {
                    if (e.target.closest(".glyph")) return;
                    onEditTask(it);
                  }}
                >
                  <span className="glyph" onClick={(e) => { e.stopPropagation(); onToggleTask(it.id); }} />
                  <span className="label">{it.title}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="time-grid-scroll" ref={scrollRef} style={{ "--slot-h": SLOT + "px" }}>
        <div className="time-grid" ref={gridRef}>
          <div className="time-col">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="hour" style={{ height: HOUR + "px" }}>
                {fmtHour(h, time24)}
              </div>
            ))}
          </div>

          {days.map((d, dayIdx) => {
            const isToday = sameDay(d, today);
            return (
              <div
                key={dayIdx}
                className={"day-col" + (isToday ? " today" : "") + (mobileDayIndex === dayIdx ? " active-day" : "")}
                onMouseDown={(e) => startCreate(e, dayIdx)}
              >
                {Array.from({ length: 48 }, (_, i) => (
                  <div
                    key={i}
                    className={"slot" + (i % 2 === 1 ? " hour-mark" : " half")}
                    style={{ height: SLOT + "px" }}
                  />
                ))}

                {/* Events for this day */}
                {timedPerDay[dayIdx].map((ev) => {
                  const s = new Date(ev.start);
                  const e = new Date(ev.end);
                  const sMin = minutesSinceMidnight(s);
                  const eMin = minutesSinceMidnight(e);
                  const top = (sMin / 30) * SLOT;
                  const height = ((eMin - sMin) / 30) * SLOT;
                  const cat = categoriesById[ev.categoryId];
                  const c = cat ? cat.color : "var(--ink)";
                  const isDragging = drag && drag.kind !== "create" && drag.eventId === ev.id;
                  const ghostTop = isDragging ? (drag.startMin / 30) * SLOT : top;
                  const ghostH = isDragging ? ((drag.endMin - drag.startMin) / 30) * SLOT : height;
                  return (
                    <div
                      key={ev.id}
                      className={"event" + (isDragging ? " dragging" : "")}
                      style={{ top: ghostTop + "px", height: ghostH + "px", "--c": c }}
                      onClick={(e) => { if (!isDragging) onEditEvent(ev); }}
                      onMouseDown={(e) => startMove(e, ev, dayIdx)}
                    >
                      <div className="ev-time">{fmtTimeShort(s, time24)} – {fmtTimeShort(e, time24)}</div>
                      <div className="ev-title">{ev.title}</div>
                      {ev.location && <div className="ev-loc">{ev.location}</div>}
                      <div className="resize-handle" onMouseDown={(e) => startResize(e, ev, dayIdx)} />
                    </div>
                  );
                })}

                {/* drag ghost (create) */}
                {drag && drag.kind === "create" && drag.dayIdx === dayIdx && (
                  <div
                    className="drag-ghost"
                    style={{
                      top: (drag.startMin / 30) * SLOT + "px",
                      height: ((drag.endMin - drag.startMin) / 30) * SLOT + "px",
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Now line on today's column */}
          {todayIdx >= 0 && (
            <div
              className="now-line"
              style={{
                top: (nowMin / 30) * SLOT + "px",
                left: `calc(56px + (100% - 56px) * ${todayIdx} / 7)`,
                width: `calc((100% - 56px) / 7)`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

window.WeekView = WeekView;
