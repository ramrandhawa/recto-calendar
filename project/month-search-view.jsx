/* Month view + Search view */
const { useMemo: useMemoM } = React;

function MonthView(props) {
  const {
    viewDate, today, weekStart, events, tasks,
    categoriesById, visibleCats, onPickDay, onEditEvent, onEditTask, onToggleTask,
  } = props;
  const { monthGrid, ymd, sameDay, parseYmd } = window.CAL;
  const cells = monthGrid(viewDate, weekStart);
  const monthIdx = viewDate.getMonth();
  const todayYmd = ymd(today);
  const dowFromIdx = (i) => new Date(2026, 4, 10 + ((weekStart + i) % 7)); // for header labels

  // Build per-day items (all-day events + tasks only, per spec)
  const byDay = {};
  events.forEach((ev) => {
    if (!visibleCats.has(ev.categoryId) && categoriesById[ev.categoryId]) return;
    if (ev.allDay) {
      const s = parseYmd(ev.start);
      const e = parseYmd(ev.end || ev.start);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const k = ymd(d);
        (byDay[k] = byDay[k] || []).push({ ...ev, _kind: "event" });
      }
    }
  });
  tasks.forEach((t) => {
    if (!visibleCats.has(t.categoryId) && categoriesById[t.categoryId]) return;
    let d = t.date;
    let bubbled = false;
    if (t.type === "float" && !t.done && t.date < todayYmd) { d = todayYmd; bubbled = true; }
    (byDay[d] = byDay[d] || []).push({ ...t, _kind: t.type, _bubbled: bubbled });
  });

  return (
    <div className="month-wrap">
      <div className="month-dow-row">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i}>{dowFromIdx(i).toLocaleString("en-US", { weekday: "short" })}</div>
        ))}
      </div>
      <div className="month-grid">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === monthIdx;
          const isToday = sameDay(d, today);
          const items = byDay[ymd(d)] || [];
          const MAX = 4;
          return (
            <div
              key={i}
              className={"month-cell" + (inMonth ? "" : " muted") + (isToday ? " today" : "")}
              onClick={() => onPickDay(d)}
            >
              <div className="month-num">{d.getDate()}</div>
              {items.slice(0, MAX).map((it) => {
                const cat = categoriesById[it.categoryId];
                const c = cat ? cat.color : "var(--ink)";
                if (it._kind === "event") {
                  return (
                    <div key={it.id} className="month-item" style={{ "--c": c }} onClick={(e) => { e.stopPropagation(); onEditEvent(it); }}>
                      <span className="label">{it.title}</span>
                    </div>
                  );
                }
                return (
                  <div
                    key={it.id}
                    className={"month-item " + (it._kind === "float" ? "float" : "task") + (it.done ? " done" : "")}
                    style={{ "--c": c }}
                    onClick={(e) => { e.stopPropagation(); onEditTask(it); }}
                  >
                    <span className="glyph" onClick={(e) => { e.stopPropagation(); onToggleTask(it.id); }} />
                    <span className="label">{it.title}</span>
                  </div>
                );
              })}
              {items.length > MAX && (
                <div className="month-more">+{items.length - MAX} more</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SearchView(props) {
  const { query, events, tasks, categoriesById, visibleCats, time24, onEditEvent, onEditTask, onClear } = props;
  const { fmtTime, ymd, parseYmd, highlight } = window.CAL;
  const q = query.trim();
  const lower = q.toLowerCase();

  const matchedEvents = events.filter((e) => {
    if (!visibleCats.has(e.categoryId) && categoriesById[e.categoryId]) return false;
    return (e.title + " " + (e.location || "") + " " + (e.notes || "")).toLowerCase().includes(lower);
  });
  const matchedTasks = tasks.filter((t) => {
    if (!visibleCats.has(t.categoryId) && categoriesById[t.categoryId]) return false;
    return (t.title + " " + (t.notes || "")).toLowerCase().includes(lower);
  });

  const all = [
    ...matchedEvents.map((e) => ({ kind: e.allDay ? "all-day" : "event", date: e.allDay ? parseYmd(e.start) : new Date(e.start), item: e })),
    ...matchedTasks.map((t) => ({ kind: t.type === "float" ? "float task" : "task", date: parseYmd(t.date), item: t })),
  ].sort((a, b) => a.date - b.date);

  // Group by month-year
  const groups = {};
  all.forEach((r) => {
    const key = r.date.toLocaleString("en-US", { month: "long", year: "numeric" });
    (groups[key] = groups[key] || []).push(r);
  });

  return (
    <div className="search-results">
      <div className="search-results-head">
        <div>
          <h2>Results for “{q}”</h2>
        </div>
        <div className="meta">{all.length} match{all.length === 1 ? "" : "es"} · <button onClick={onClear} style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>Clear</button></div>
      </div>
      <div className="search-results-list">
        {all.length === 0 && <div className="empty">No matches</div>}
        {Object.entries(groups).map(([k, rows]) => (
          <div className="search-group" key={k}>
            <div className="search-group-head">{k}</div>
            {rows.map((r) => {
              const it = r.item;
              const cat = categoriesById[it.categoryId];
              const c = cat ? cat.color : "var(--ink)";
              const dayLabel = r.date.toLocaleString("en-US", { weekday: "short", day: "numeric" });
              const timeLabel = it.allDay || it.type ? "ALL DAY" : fmtTime(new Date(it.start), time24);
              const titleParts = highlight(it.title, q);
              const sub = it.location || it.notes || (cat ? cat.name : "");
              return (
                <div
                  key={it.id}
                  className="search-row"
                  onClick={() => (r.kind === "event" || r.kind === "all-day") ? onEditEvent(it) : onEditTask(it)}
                >
                  <div className="when">
                    <div>{dayLabel}</div>
                    <div style={{ color: "var(--ink-3)", fontSize: 10 }}>{timeLabel}</div>
                  </div>
                  <div className="swatch" style={{ "--c": c }} />
                  <div className="what">
                    <div className="title">
                      {titleParts.map((p, i) => p.hl ? <mark className="search-hl" key={i}>{p.t}</mark> : <span key={i}>{p.t}</span>)}
                    </div>
                    <div className="sub">{sub}</div>
                  </div>
                  <div className="kind">{r.kind}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

window.MonthView = MonthView;
window.SearchView = SearchView;
