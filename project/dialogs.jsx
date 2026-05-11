/* Dialogs: appointment/task editor + category manager */
const { useState: useStateD, useEffect: useEffectD, useRef: useRefD } = React;

function Dialog(props) {
  const { onClose, children } = props;
  useEffectD(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true">{children}</div>
    </div>
  );
}

function Switch({ on, onChange }) {
  return <div className={"switch" + (on ? " on" : "")} onClick={() => onChange(!on)} role="switch" aria-checked={on} />;
}

function EditorDialog(props) {
  const {
    initial, mode, categories, onSave, onDelete, onClose, time24,
  } = props;

  // mode: "event" | "task" | "float"
  const [tab, setTab] = useStateD(mode || (initial && initial.type) || "event");
  const isTask = tab === "task" || tab === "float";

  const init = initial || {};
  const [title, setTitle] = useStateD(init.title || "");
  const [categoryId, setCategoryId] = useStateD(init.categoryId || categories[0].id);
  const [notes, setNotes] = useStateD(init.notes || "");

  // event-specific
  const defaultStart = init.start && !init.allDay ? new Date(init.start) : new Date();
  const defaultEnd = init.end && !init.allDay ? new Date(init.end) : new Date(defaultStart.getTime() + 60 * 60 * 1000);
  const [allDay, setAllDay] = useStateD(!!init.allDay);
  const [date, setDate] = useStateD(window.CAL.ymd(defaultStart));
  const [endDate, setEndDate] = useStateD(window.CAL.ymd(init.allDay && init.end ? window.CAL.parseYmd(init.end) : defaultEnd));
  const [startTime, setStartTime] = useStateD(window.CAL.PAD(defaultStart.getHours()) + ":" + window.CAL.PAD(defaultStart.getMinutes()));
  const [endTime, setEndTime] = useStateD(window.CAL.PAD(defaultEnd.getHours()) + ":" + window.CAL.PAD(defaultEnd.getMinutes()));
  const [location, setLocation] = useStateD(init.location || "");
  // task-specific
  const [taskDate, setTaskDate] = useStateD(init.date || window.CAL.ymd(new Date()));
  const [recurrence, setRecurrence] = useStateD(init.recurrence || "");

  const titleRef = useRefD(null);
  useEffectD(() => { titleRef.current && titleRef.current.focus(); }, []);

  function save() {
    if (!title.trim()) { titleRef.current && titleRef.current.focus(); return; }
    if (tab === "event") {
      if (allDay) {
        onSave({
          id: init.id, type: "event", title: title.trim(), categoryId, notes,
          allDay: true, start: date, end: endDate || date, location,
        });
      } else {
        const s = new Date(date + "T" + startTime);
        const e = new Date(date + "T" + endTime);
        onSave({
          id: init.id, type: "event", title: title.trim(), categoryId, notes,
          allDay: false, start: s.toISOString(), end: e.toISOString(), location,
        });
      }
    } else {
      onSave({
        id: init.id, type: tab, title: title.trim(), categoryId, notes,
        date: taskDate, done: !!init.done, recurrence: recurrence || null,
      });
    }
  }

  return (
    <Dialog onClose={onClose}>
      <div className="dialog-head">
        <h2>{init.id ? "Edit" : "New"} {tab === "event" ? "appointment" : tab === "float" ? "floating task" : "task"}</h2>
        <button className="close" onClick={onClose}>×</button>
      </div>
      {!init.id && (
        <div className="dialog-tabs">
          <button className={tab === "event" ? "active" : ""} onClick={() => setTab("event")}>Appointment</button>
          <button className={tab === "task" ? "active" : ""} onClick={() => setTab("task")}>Task</button>
          <button className={tab === "float" ? "active" : ""} onClick={() => setTab("float")}>Floating task</button>
        </div>
      )}
      <div className="dialog-body">
        <div className="field">
          <input
            ref={titleRef}
            className="title-input"
            placeholder={tab === "event" ? "Title" : "What needs doing?"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(); }}
          />
        </div>

        {tab === "event" ? (
          <>
            <div className="toggle-row" style={{ borderTop: 0, paddingTop: 0 }}>
              <span className="label">All-day</span>
              <Switch on={allDay} onChange={setAllDay} />
            </div>
            {allDay ? (
              <div className="row">
                <div className="field">
                  <label>From</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>To</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            ) : (
              <>
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="row">
                  <div className="field">
                    <label>Start</label>
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} step={1800} />
                  </div>
                  <div className="field">
                    <label>End</label>
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} step={1800} />
                  </div>
                </div>
              </>
            )}
            <div className="field">
              <label>Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>{tab === "float" ? "Starting date (bubbles forward if not done)" : "Date"}</label>
              <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Repeat when completed</label>
              <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                <option value="">Don't repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </>
        )}

        <div className="field">
          <label>Category</label>
          <div className="cat-picker">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={"cat-pick" + (categoryId === c.id ? " active" : "")}
                style={{ "--c": c.color }}
                onClick={() => setCategoryId(c.id)}
              >
                <span className="dot" />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <div className="dialog-foot">
        {init.id ? <button className="danger" onClick={() => onDelete(init.id)}>Delete</button> : <div />}
        <div className="grow" />
        <div className="actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>{init.id ? "Save" : "Create"}</button>
        </div>
      </div>
    </Dialog>
  );
}

const PALETTE = [
  "oklch(0.62 0.16 28)", "oklch(0.66 0.14 70)", "oklch(0.62 0.13 150)",
  "oklch(0.60 0.11 235)", "oklch(0.58 0.14 300)", "oklch(0.55 0.02 260)",
  "oklch(0.55 0.18 350)", "oklch(0.60 0.13 200)", "oklch(0.55 0.14 110)",
  "oklch(0.50 0.10 35)", "oklch(0.65 0.13 50)", "oklch(0.50 0.10 270)",
];

function CategoryManagerDialog(props) {
  const { categories, onSave, onClose } = props;
  const [list, setList] = useStateD(() => categories.map((c) => ({ ...c })));
  const [openPick, setOpenPick] = useStateD(null);

  function update(idx, patch) {
    setList(list.map((c, i) => i === idx ? { ...c, ...patch } : c));
  }
  function add() {
    setList([...list, { id: "c-" + Math.random().toString(36).slice(2, 7), name: "New category", color: PALETTE[list.length % PALETTE.length] }]);
  }
  function remove(idx) {
    setList(list.filter((_, i) => i !== idx));
  }

  return (
    <Dialog onClose={onClose}>
      <div className="dialog-head">
        <h2>Categories</h2>
        <button className="close" onClick={onClose}>×</button>
      </div>
      <div className="dialog-body">
        <div className="cat-mgr">
          {list.map((c, i) => (
            <div className="cat-mgr-row" key={c.id}>
              <div className="cat-mgr-swatch" style={{ background: c.color }} onClick={() => setOpenPick(openPick === i ? null : i)}>
                {openPick === i && (
                  <div className="color-pop" onMouseLeave={() => setOpenPick(null)}>
                    {PALETTE.map((p, pi) => (
                      <button key={pi} style={{ background: p }} onClick={() => { update(i, { color: p }); setOpenPick(null); }} />
                    ))}
                  </div>
                )}
              </div>
              <input type="text" value={c.name} onChange={(e) => update(i, { name: e.target.value })} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.06em" }}>{c.id}</span>
              <button className="del" onClick={() => remove(i)}>Delete</button>
            </div>
          ))}
        </div>
        <button className="btn" onClick={add} style={{ alignSelf: "flex-start" }}>+ Add category</button>
      </div>
      <div className="dialog-foot">
        <div className="grow" />
        <div className="actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSave(list)}>Save</button>
        </div>
      </div>
    </Dialog>
  );
}

window.EditorDialog = EditorDialog;
window.CategoryManagerDialog = CategoryManagerDialog;
