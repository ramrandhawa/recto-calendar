/* Main app — API-backed, persistent via Flask + SQLite */
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA, useRef: useRefA } = React;

const TWEAK_DEFAULTS = {
  theme:    "neutral",
  mode:     "light",
  fontPair: "hanken",
};

const FONT_PAIRS = {
  hanken:  { sans: '"Hanken Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif', mono: '"JetBrains Mono", "SF Mono", Menlo, monospace',  label: "Hanken · JetBrains" },
  space:   { sans: '"Space Grotesk", "Helvetica Neue", Helvetica, sans-serif',         mono: '"IBM Plex Mono", "SF Mono", Menlo, monospace',    label: "Space · IBM Plex"  },
  geist:   { sans: '"Geist", "Helvetica Neue", Helvetica, sans-serif',                 mono: '"Geist Mono", "SF Mono", Menlo, monospace',       label: "Geist · Geist Mono"},
  archivo: { sans: '"Archivo", "Helvetica Neue", Helvetica, sans-serif',               mono: '"JetBrains Mono", "SF Mono", Menlo, monospace',   label: "Archivo · JetBrains"},
};

/* localStorage-backed tweaks — persists theme/mode/font across reloads */
function useTweaks(defaults) {
  const [values, setValues] = React.useState(() => {
    try {
      const saved = localStorage.getItem('recto-tweaks');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch (e) {
      return defaults;
    }
  });
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    setValues((prev) => {
      const next = { ...prev, ...edits };
      try { localStorage.setItem('recto-tweaks', JSON.stringify(next)); } catch (_) {}
      return next;
    });
  }, []);
  return [values, setTweak];
}

function App() {
  const { startOfWeek, weekDays, addDays, ymd, monthName, sameDay } = window.CAL;

  const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

  // ── tweaks ──────────────────────────────────────────────────────────────────
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  useEffectA(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
    document.documentElement.setAttribute("data-mode",  tweaks.mode);
    const fp = FONT_PAIRS[tweaks.fontPair] || FONT_PAIRS.hanken;
    document.documentElement.style.setProperty("--font-sans", fp.sans);
    document.documentElement.style.setProperty("--font-mono", fp.mono);
    const fl = document.querySelector(".theme-flash");
    if (fl) { fl.classList.remove("run"); void fl.offsetWidth; fl.classList.add("run"); }
  }, [tweaks.theme, tweaks.mode, tweaks.fontPair]);

  // ── view state ───────────────────────────────────────────────────────────────
  const weekStartDay = 0;
  const [view,         setView]         = useStateA("week");
  const [viewDate,     setViewDate]     = useStateA(today);
  const [selectedDate, setSelectedDate] = useStateA(today);
  const [query,        setQuery]        = useStateA("");
  const [loading,      setLoading]      = useStateA(true);

  // ── data state ───────────────────────────────────────────────────────────────
  const [categories, setCategories] = useStateA([]);
  const [events,     setEvents]     = useStateA([]);
  const [tasks,      setTasks]      = useStateA([]);
  const [hiddenCats, setHiddenCats] = useStateA(new Set());

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [editor,         setEditor]         = useStateA(null);
  const [showCatMgr,     setShowCatMgr]     = useStateA(false);
  const [railOpen,       setRailOpen]       = useStateA(false);
  const [mobileDayIndex, setMobileDayIndex] = useStateA(today.getDay());

  // ── initial data load ────────────────────────────────────────────────────────
  useEffectA(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/events').then((r) => r.json()),
      fetch('/api/tasks').then((r) => r.json()),
    ]).then(([cats, evts, tsks]) => {
      setCategories(cats);
      setEvents(evts);
      setTasks(tsks);
      setLoading(false);
    }).catch((err) => {
      console.error('Failed to load data:', err);
      setLoading(false);
    });
  }, []);

  // ── derived ──────────────────────────────────────────────────────────────────
  const categoriesById = useMemoA(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );
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
  const wkDays        = weekDays(weekStartDate);

  const rangeTitle = (() => {
    if (view === "month") return `${monthName(viewDate, true)} ${viewDate.getFullYear()}`;
    const last = wkDays[6];
    if (weekStartDate.getMonth() === last.getMonth()) {
      return `${monthName(weekStartDate, true)} ${weekStartDate.getDate()} — ${last.getDate()}, ${last.getFullYear()}`;
    }
    return `${monthName(weekStartDate)} ${weekStartDate.getDate()} — ${monthName(last)} ${last.getDate()}, ${last.getFullYear()}`;
  })();
  const rangeSub = view === "month"
    ? "MONTH VIEW"
    : `WEEK ${window.CAL.isoWeek(weekStartDate)} · ${weekStartDate.getFullYear()}`;

  // ── navigation ───────────────────────────────────────────────────────────────
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
  function pickDay(d) {
    setSelectedDate(d); setViewDate(d); setView("week");
    setMobileDayIndex(d.getDay());
  }

  // ── editor openers ────────────────────────────────────────────────────────────
  function openNew() { setEditor({ initial: null, mode: "event" }); }
  function createAt(start, end) {
    setEditor({
      initial: {
        title: "", categoryId: categories[0] ? categories[0].id : "",
        start: start.toISOString(), end: end.toISOString(), allDay: false,
      },
      mode: "event",
    });
  }

  // ── CRUD helpers ─────────────────────────────────────────────────────────────
  async function saveItem(item) {
    const isEvent = item.type === "event";
    const isNew   = !item.id || !(isEvent ? events : tasks).find((x) => x.id === item.id);
    const itemWithId = { ...item, id: item.id || window.CAL.makeId() };

    // Optimistic update
    if (isEvent) {
      setEvents((prev) =>
        isNew ? [...prev, itemWithId] : prev.map((e) => e.id === itemWithId.id ? itemWithId : e)
      );
    } else {
      setTasks((prev) =>
        isNew ? [...prev, itemWithId] : prev.map((t) => t.id === itemWithId.id ? itemWithId : t)
      );
    }

    try {
      const url    = isEvent ? '/api/events' : '/api/tasks';
      const method = isNew ? 'POST' : 'PUT';
      const res    = await fetch(isNew ? url : `${url}/${itemWithId.id}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemWithId),
      });
      const saved = await res.json();
      if (isEvent) setEvents((prev) => prev.map((e) => e.id === saved.id ? saved : e));
      else         setTasks((prev)  => prev.map((t) => t.id === saved.id ? saved : t));
    } catch (err) {
      console.error('Save failed:', err);
    }
    setEditor(null);
  }

  async function deleteItem(id) {
    const isEvent = !!events.find((e) => e.id === id);
    if (isEvent) setEvents((prev) => prev.filter((e) => e.id !== id));
    else         setTasks((prev)  => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/${isEvent ? 'events' : 'tasks'}/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setEditor(null);
  }

  async function updateEvent(id, patch) {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    const updated = { ...ev, ...patch };
    setEvents((prev) => prev.map((e) => e.id === id ? updated : e)); // optimistic
    try {
      await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error('Update event failed:', err);
    }
  }

  async function toggleTask(id) {
    const cur = tasks.find((t) => t.id === id);
    if (!cur) return;
    const nowDone = !cur.done;
    const next = { ...cur, done: nowDone, doneDate: nowDone ? ymd(new Date()) : null };
    setTasks((prev) => prev.map((t) => t.id === id ? next : t)); // optimistic

    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      // Spawn recurrence instance when marking done
      if (!cur.done && cur.recurrence) {
        const nextDate = nextRecurrenceDate(cur.date, cur.recurrence);
        if (nextDate) {
          const newTask = { ...cur, id: window.CAL.makeId(), date: nextDate, done: false, doneDate: null };
          const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTask),
          });
          const created = await res.json();
          setTasks((prev) => [...prev, created]);
        }
      }
    } catch (err) {
      console.error('Toggle task failed:', err);
    }
  }

  function nextRecurrenceDate(dateStr, rec) {
    const d = window.CAL.parseYmd(dateStr);
    if      (rec === "daily")    d.setDate(d.getDate() + 1);
    else if (rec === "weekly")   d.setDate(d.getDate() + 7);
    else if (rec === "biweekly") d.setDate(d.getDate() + 14);
    else if (rec === "monthly")  d.setMonth(d.getMonth() + 1);
    else return null;
    return ymd(d);
  }

  async function saveCategories(list) {
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list),
      });
      const updated = await res.json();
      setCategories(updated);
    } catch (err) {
      console.error('Save categories failed:', err);
    }
    setShowCatMgr(false);
  }

  // ── keyboard shortcuts ────────────────────────────────────────────────────────
  useEffectA(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if      (e.key === "t" || e.key === "T")     goToday();
      else if (e.key === "ArrowLeft")              goPrev();
      else if (e.key === "ArrowRight")             goNext();
      else if (e.key === "n" || e.key === "N")     openNew();
      else if (e.key === "m" || e.key === "M")     setView(view === "week" ? "month" : "week");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const isSearching = query.trim().length > 0;

  // ── loading screen ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", fontFamily: "var(--font-mono)", color: "var(--ink-3)",
        fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
      }}>
        Loading…
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {railOpen && <div className="scrim-rail" onClick={() => setRailOpen(false)} />}
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

      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <button className="menu-btn" onClick={() => setRailOpen(true)} aria-label="Menu">
              <span className="lines" />
            </button>
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
            <span className="now-pill">
              {today.toLocaleString("en-US", { weekday: "long" })} · {today.toLocaleString("en-US", { month: "short", day: "numeric" })}
            </span>
            <div className="view-toggle">
              <button className={view === "week"  ? "active" : ""} onClick={() => setView("week")}>Week</button>
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
            density="comfortable"
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
          onSave={saveCategories}
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
            { value: "slate",   label: "Slate"   },
            { value: "forest",  label: "Forest"  },
            { value: "plum",    label: "Plum"    },
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
