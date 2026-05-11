/* Main app */
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA, useRef: useRefA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "neutral",
  "mode": "light",
  "fontPair": "hanken"
}/*EDITMODE-END*/;

const FONT_PAIRS = {
  hanken:   { sans: '"Hanken Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif', mono: '"JetBrains Mono", "SF Mono", Menlo, monospace', label: "Hanken · JetBrains" },
  space:    { sans: '"Space Grotesk", "Helvetica Neue", Helvetica, sans-serif', mono: '"IBM Plex Mono", "SF Mono", Menlo, monospace', label: "Space · IBM Plex" },
  geist:    { sans: '"Geist", "Helvetica Neue", Helvetica, sans-serif', mono: '"Geist Mono", "SF Mono", Menlo, monospace', label: "Geist · Geist Mono" },
  archivo:  { sans: '"Archivo", "Helvetica Neue", Helvetica, sans-serif', mono: '"JetBrains Mono", "SF Mono", Menlo, monospace', label: "Archivo · JetBrains" },
};

function App() {
  const SEED = window.CAL.SEED;
  const { startOfWeek, weekDays, addDays, ymd, monthName, sameDay } = window.CAL;

  // Tweaks
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  useEffectA(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
    document.documentElement.setAttribute("data-mode", tweaks.mode);
    const fp = FONT_PAIRS[tweaks.fontPair] || FONT_PAIRS.hanken;
    document.documentElement.style.setProperty("--font-sans", fp.sans);
    document.documentElement.style.setProperty("--font-mono", fp.mono);
    // Run flash
    const fl = document.querySelector(".theme-flash");
    if (fl) {
      fl.classList.remove("run");
      void fl.offsetWidth;
      fl.classList.add("run");
    }
  }, [tweaks.theme, tweaks.mode, tweaks.fontPair]);

  const today = SEED.today;
  const weekStartDay = 0; // Sunday
  const [view, setView] = useStateA("week"); // week | month
  const [viewDate, setViewDate] = useStateA(today);
  const [selectedDate, setSelectedDate] = useStateA(today);
  const [query, setQuery] = useStateA("");

  const [categories, setCategories] = useStateA(SEED.categories);
  const [events, setEvents] = useStateA(SEED.events);
  const [tasks, setTasks] = useStateA(SEED.tasks);
  const [hiddenCats, setHiddenCats] = useStateA(new Set());

  const [editor, setEditor] = useStateA(null); // { initial, mode }
  const [showCatMgr, setShowCatMgr] = useStateA(false);
  const [railOpen, setRailOpen] = useStateA(false);
  const [mobileDayIndex, setMobileDayIndex] = useStateA(today.getDay());

  const categoriesById = useMemoA(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const visibleCats = useMemoA(() => {
    const s = new Set(categories.map((c) => c.id));
    hiddenCats.forEach((id) => s.delete(id));
    return s;
  }, [categories, hiddenCats]);

  function toggleCat(id) {
    const s = new Set(hiddenCats);
    if (s.has(id)) s.delete(id); else s.add(id);
    setHiddenCats(s);
  }

  const weekStartDate = startOfWeek(selectedDate, weekStartDay);
  const wkDays = weekDays(weekStartDate);
  const rangeTitle = (() => {
    if (view === "month") return `${monthName(viewDate, true)} ${viewDate.getFullYear()}`;
    const last = wkDays[6];
    if (weekStartDate.getMonth() === last.getMonth()) {
      return `${monthName(weekStartDate, true)} ${weekStartDate.getDate()} — ${last.getDate()}, ${last.getFullYear()}`;
    }
    return `${monthName(weekStartDate)} ${weekStartDate.getDate()} — ${monthName(last)} ${last.getDate()}, ${last.getFullYear()}`;
  })();
  const rangeSub = view === "month" ? "MONTH VIEW" : `WEEK ${window.CAL.isoWeek(weekStartDate)} · ${weekStartDate.getFullYear()}`;

  function goPrev() {
    if (view === "month") setViewDate(window.CAL.addMonths(viewDate, -1));
    else { const d = addDays(selectedDate, -7); setSelectedDate(d); setViewDate(d); }
  }
  function goNext() {
    if (view === "month") setViewDate(window.CAL.addMonths(viewDate, 1));
    else { const d = addDays(selectedDate, 7); setSelectedDate(d); setViewDate(d); }
  }
  function goToday() {
    setSelectedDate(today); setViewDate(today);
    setMobileDayIndex(today.getDay());
  }

  function openNew() {
    setEditor({ initial: null, mode: "event" });
  }
  function createAt(start, end) {
    setEditor({
      initial: {
        title: "", categoryId: categories[0].id,
        start: start.toISOString(), end: end.toISOString(), allDay: false,
      },
      mode: "event",
    });
  }
  function saveItem(item) {
    if (item.type === "event") {
      if (item.id && events.find((e) => e.id === item.id)) {
        setEvents(events.map((e) => e.id === item.id ? { ...e, ...item } : e));
      } else {
        setEvents([...events, { ...item, id: item.id || window.CAL.makeId() }]);
      }
    } else {
      if (item.id && tasks.find((t) => t.id === item.id)) {
        setTasks(tasks.map((t) => t.id === item.id ? { ...t, ...item } : t));
      } else {
        setTasks([...tasks, { ...item, id: item.id || window.CAL.makeId() }]);
      }
    }
    setEditor(null);
  }
  function deleteItem(id) {
    setEvents(events.filter((e) => e.id !== id));
    setTasks(tasks.filter((t) => t.id !== id));
    setEditor(null);
  }

  function updateEvent(id, patch) {
    setEvents(events.map((e) => e.id === id ? { ...e, ...patch } : e));
  }

  function toggleTask(id) {
    setTasks(tasks.map((t) => {
      if (t.id !== id) return t;
      const nowDone = !t.done;
      const next = { ...t, done: nowDone, doneDate: nowDone ? ymd(new Date()) : null };
      // recurrence handled separately
      return next;
    }));
    // Regenerate next instance if marked done + has recurrence
    const cur = tasks.find((t) => t.id === id);
    if (cur && !cur.done && cur.recurrence) {
      const next = nextRecurrenceDate(cur.date, cur.recurrence);
      if (next) {
        const newId = window.CAL.makeId();
        setTimeout(() => {
          setTasks((prev) => [...prev, { ...cur, id: newId, date: next, done: false, doneDate: null }]);
        }, 0);
      }
    }
  }

  function nextRecurrenceDate(dateStr, rec) {
    const d = window.CAL.parseYmd(dateStr);
    if (rec === "daily") d.setDate(d.getDate() + 1);
    else if (rec === "weekly") d.setDate(d.getDate() + 7);
    else if (rec === "biweekly") d.setDate(d.getDate() + 14);
    else if (rec === "monthly") d.setMonth(d.getMonth() + 1);
    else return null;
    return ymd(d);
  }

  function pickDay(d) {
    setSelectedDate(d); setViewDate(d); setView("week");
    setMobileDayIndex(d.getDay());
  }

  // Keyboard shortcuts: T, arrows
  useEffectA(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "t" || e.key === "T") goToday();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "n" || e.key === "N") openNew();
      else if (e.key === "m" || e.key === "M") setView(view === "week" ? "month" : "week");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const isSearching = query.trim().length > 0;

  return (
    <div className="app">
      {railOpen && <div className="scrim-rail" onClick={() => setRailOpen(false)} />}
      <div className={"rail-wrap " + (railOpen ? "open" : "")} style={{ display: "contents" }}>
        <div className={"rail " + (railOpen ? "open" : "")}>
          <Sidebar
            today={today}
            viewDate={viewDate}
            setViewDate={(d) => { setViewDate(d); }}
            selectedDate={selectedDate}
            setSelectedDate={(d) => { setSelectedDate(d); setViewDate(d); setMobileDayIndex(d.getDay()); setRailOpen(false); }}
            query={query}
            setQuery={setQuery}
            categories={categories}
            hiddenCats={hiddenCats}
            toggleCat={toggleCat}
            onAddClick={openNew}
            onManageCats={() => setShowCatMgr(true)}
            events={events}
            tasks={tasks}
            weekStart={weekStartDay}
            onCloseMobile={() => setRailOpen(false)}
          />
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <button className="menu-btn" onClick={() => setRailOpen(true)} aria-label="Menu"><span className="lines" /></button>
            <div className="nav-arrows">
              <button onClick={goPrev} aria-label="Previous">‹</button>
              <button onClick={goNext} aria-label="Next">›</button>
            </div>
            <button className="btn-today" onClick={goToday}>Today</button>
            <div className="range-block">
              <div className="range-title">{rangeTitle}</div>
              <div className="range-sub">{rangeSub}</div>
            </div>
          </div>
          <div className="topbar-right">
            <span className="now-pill">{today.toLocaleString("en-US", { weekday: "long" })} · {today.toLocaleString("en-US", { month: "short", day: "numeric" })}</span>
            <div className="view-toggle">
              <button className={view === "week" ? "active" : ""} onClick={() => setView("week")}>Week</button>
              <button className={view === "month" ? "active" : ""} onClick={() => setView("month")}>Month</button>
            </div>
          </div>
        </div>

        {isSearching ? (
          <SearchView
            query={query}
            events={events}
            tasks={tasks}
            categoriesById={categoriesById}
            visibleCats={visibleCats}
            time24={false}
            onEditEvent={(e) => setEditor({ initial: e, mode: "event" })}
            onEditTask={(t) => setEditor({ initial: t, mode: t.type })}
            onClear={() => setQuery("")}
          />
        ) : view === "week" ? (
          <WeekView
            weekStartDate={weekStartDate}
            today={today}
            time24={false}
            density={"comfortable"}
            events={events}
            tasks={tasks}
            categoriesById={categoriesById}
            visibleCats={visibleCats}
            onCreateAt={createAt}
            onEditEvent={(e) => setEditor({ initial: e, mode: "event" })}
            onEditTask={(t) => setEditor({ initial: t, mode: t.type })}
            onUpdateEvent={updateEvent}
            onToggleTask={toggleTask}
            mobileDayIndex={typeof window !== "undefined" && window.innerWidth <= 820 ? mobileDayIndex : null}
          />
        ) : (
          <MonthView
            viewDate={viewDate}
            today={today}
            weekStart={weekStartDay}
            events={events}
            tasks={tasks}
            categoriesById={categoriesById}
            visibleCats={visibleCats}
            onPickDay={pickDay}
            onEditEvent={(e) => setEditor({ initial: e, mode: "event" })}
            onEditTask={(t) => setEditor({ initial: t, mode: t.type })}
            onToggleTask={toggleTask}
          />
        )}

        {/* Mobile day tabs */}
        <div className="mobile-tab">
          {wkDays.map((d, i) => (
            <button
              key={i}
              className={mobileDayIndex === i ? "active" : ""}
              onClick={() => setMobileDayIndex(i)}
            >
              <div>{d.toLocaleString("en-US", { weekday: "narrow" })}</div>
              <div style={{ fontSize: 11, marginTop: 2 }}>{d.getDate()}</div>
            </button>
          ))}
        </div>
      </div>

      {editor && (
        <EditorDialog
          initial={editor.initial}
          mode={editor.mode}
          categories={categories}
          time24={false}
          onSave={saveItem}
          onDelete={deleteItem}
          onClose={() => setEditor(null)}
        />
      )}
      {showCatMgr && (
        <CategoryManagerDialog
          categories={categories}
          onSave={(list) => { setCategories(list); setShowCatMgr(false); }}
          onClose={() => setShowCatMgr(false)}
        />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme" />
        <TweakRadio
          label="Mode"
          value={tweaks.mode}
          options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
          onChange={(v) => setTweak("mode", v)}
        />
        <TweakSelect
          label="Color theme"
          value={tweaks.theme}
          options={[
            { value: "neutral", label: "Neutral" },
            { value: "slate", label: "Slate" },
            { value: "forest", label: "Forest" },
            { value: "plum", label: "Plum" },
          ]}
          onChange={(v) => setTweak("theme", v)}
        />
        <TweakSection label="Typography" />
        <TweakSelect
          label="Font pairing"
          value={tweaks.fontPair}
          options={Object.entries(FONT_PAIRS).map(([k, v]) => ({ value: k, label: v.label }))}
          onChange={(v) => setTweak("fontPair", v)}
        />
      </TweaksPanel>

      <div className="theme-flash" />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
