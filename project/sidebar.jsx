/* Sidebar: brand, search, add button, mini-cal, categories */
const { useState, useRef, useEffect } = React;

function Sidebar(props) {
  const {
    today, viewDate, setViewDate,
    selectedDate, setSelectedDate,
    query, setQuery,
    categories, hiddenCats, toggleCat,
    onAddClick, onManageCats,
    events, tasks,
    weekStart,
    onCloseMobile,
  } = props;

  const { addDays, addMonths, startOfWeek, weekDays, monthGrid, isoWeek, ymd, monthName, sameDay } = window.CAL;
  const [monthPick, setMonthPick] = useState(false);
  const [pickYear, setPickYear] = useState(viewDate.getFullYear());
  const searchRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current && searchRef.current.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cells = monthGrid(viewDate, weekStart);
  const monthIdx = viewDate.getMonth();
  const selWeekStart = ymd(startOfWeek(selectedDate, weekStart));

  // Map ymd -> count (events + tasks) for has-event dots
  const dayHas = {};
  events.forEach((e) => {
    const k = e.allDay ? e.start : ymd(new Date(e.start));
    dayHas[k] = (dayHas[k] || 0) + 1;
  });
  tasks.forEach((t) => { dayHas[t.date] = (dayHas[t.date] || 0) + 1; });

  // Category counts (visible items)
  const catCount = {};
  events.forEach((e) => { catCount[e.categoryId] = (catCount[e.categoryId] || 0) + 1; });
  tasks.forEach((t) => { catCount[t.categoryId] = (catCount[t.categoryId] || 0) + 1; });

  return (
    <aside className="rail" onClick={(e) => e.stopPropagation()}>
      <div className="brand">
        <div className="brand-name">Recto</div>
        <div className="brand-mark">Cal · v2</div>
      </div>

      <div className="rail-section">
        <div className="search">
          <span className="search-icon" />
          <input
            ref={searchRef}
            placeholder="Search events, tasks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {!query && <span className="search-kbd">⌘K</span>}
          {query && (
            <button className="search-kbd" onClick={() => setQuery("")} style={{ cursor: "pointer" }}>ESC</button>
          )}
        </div>
      </div>

      <div className="rail-section">
        <button className="btn-add" onClick={onAddClick}>
          <span>New event or task</span>
          <span className="plus">+</span>
        </button>
      </div>

      <div className="rail-section">
        <div className="minical">
          <div className="minical-head">
            <div style={{ position: "relative" }}>
              <button
                className="minical-month"
                onClick={() => { setMonthPick(!monthPick); setPickYear(viewDate.getFullYear()); }}
              >
                {monthName(viewDate, true)} {viewDate.getFullYear()}
                <span className="chev">▾</span>
              </button>
              {monthPick && (
                <div className="month-dropdown" onMouseLeave={() => setMonthPick(false)}>
                  <div className="month-dropdown-year">
                    <button onClick={() => setPickYear(pickYear - 1)}>‹</button>
                    <strong>{pickYear}</strong>
                    <button onClick={() => setPickYear(pickYear + 1)}>›</button>
                  </div>
                  {Array.from({ length: 12 }, (_, i) => (
                    <button
                      key={i}
                      className={pickYear === viewDate.getFullYear() && i === viewDate.getMonth() ? "active" : ""}
                      onClick={() => {
                        setViewDate(new Date(pickYear, i, 1));
                        setMonthPick(false);
                      }}
                    >
                      {new Date(2026, i, 1).toLocaleString("en-US", { month: "short" })}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="minical-nav">
              <button onClick={() => setViewDate(addMonths(viewDate, -1))} aria-label="Previous month">‹</button>
              <button onClick={() => setViewDate(today)} title="Today">·</button>
              <button onClick={() => setViewDate(addMonths(viewDate, 1))} aria-label="Next month">›</button>
            </div>
          </div>

          <div className="minical-grid">
            <div className="minical-dow" />
            {weekDays(startOfWeek(today, weekStart)).map((d, i) => (
              <div key={i} className="minical-dow">{d.toLocaleString("en-US", { weekday: "narrow" })}</div>
            ))}

            {Array.from({ length: 6 }, (_, wi) => {
              const wkRow = cells.slice(wi * 7, wi * 7 + 7);
              const wkStartYmd = ymd(wkRow[0]);
              const wkNum = isoWeek(wkRow[0]);
              const active = wkStartYmd === selWeekStart;
              return (
                <React.Fragment key={wi}>
                  <div
                    className={"minical-wk" + (active ? " active" : "")}
                    onClick={() => setSelectedDate(wkRow[0])}
                    title={`Week ${wkNum}`}
                  >
                    {wkNum}
                  </div>
                  {wkRow.map((d, di) => {
                    const inMonth = d.getMonth() === monthIdx;
                    const isToday = sameDay(d, today);
                    const isSel = sameDay(d, selectedDate);
                    const inSelWeek = ymd(startOfWeek(d, weekStart)) === selWeekStart;
                    return (
                      <div
                        key={di}
                        className={
                          "minical-day" +
                          (!inMonth ? " muted" : "") +
                          (isToday ? " today" : "") +
                          (isSel ? " selected" : "") +
                          (inSelWeek && !isSel ? " in-week" : "") +
                          (dayHas[ymd(d)] ? " has-event" : "")
                        }
                        onClick={() => { setSelectedDate(d); setViewDate(d); }}
                      >
                        {d.getDate()}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rail-section flex">
        <div className="cats-head">
          <span className="cats-title">Categories</span>
          <button className="cats-manage" onClick={onManageCats}>Manage</button>
        </div>
        {categories.map((c) => {
          const off = hiddenCats.has(c.id);
          return (
            <div key={c.id} className={"cat-row" + (off ? " off" : "")} style={{ "--c": c.color }} onClick={() => toggleCat(c.id)}>
              <span className="cat-swatch" />
              <span className="cat-name">{c.name}</span>
              <span className="cat-count">{catCount[c.id] || 0}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
