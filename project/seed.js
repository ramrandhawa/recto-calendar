/* Demo seed data for May 2026.
   Exports SEED via window.CAL.SEED */
(function () {
  const { ymd, addDays, makeId } = window.CAL;

  const TODAY = new Date(2026, 4, 10); // May 10, 2026 — Sunday
  // Categories: id, name, color (theme var or hex)
  const categories = [
    { id: "c-work", name: "Work", color: "var(--cat-4)" },        // blue
    { id: "c-personal", name: "Personal", color: "var(--cat-3)" },// green
    { id: "c-health", name: "Health", color: "var(--cat-1)" },    // red
    { id: "c-family", name: "Family", color: "var(--cat-2)" },    // amber
    { id: "c-focus", name: "Focus time", color: "var(--cat-5)" }, // violet
    { id: "c-misc",  name: "Misc",      color: "var(--cat-6)" },  // slate
  ];

  function at(date, h, m) {
    const d = new Date(date);
    d.setHours(h, m || 0, 0, 0);
    return d.toISOString();
  }

  // Build events relative to TODAY
  const events = [
    // Sunday (today)
    { id: makeId(), type: "event", title: "Morning run", categoryId: "c-health", start: at(TODAY, 7, 0), end: at(TODAY, 7, 45), location: "Stanley Park loop" },
    { id: makeId(), type: "event", title: "Brunch w/ Mira", categoryId: "c-personal", start: at(TODAY, 10, 30), end: at(TODAY, 12, 0), location: "Nelson the Seagull" },
    { id: makeId(), type: "event", title: "Long read: Q2 strategy", categoryId: "c-focus", start: at(TODAY, 15, 0), end: at(TODAY, 17, 0), notes: "Print and annotate" },
    // Monday
    { id: makeId(), type: "event", title: "Standup", categoryId: "c-work", start: at(addDays(TODAY, 1), 9, 0), end: at(addDays(TODAY, 1), 9, 15) },
    { id: makeId(), type: "event", title: "Design review — Calendar", categoryId: "c-work", start: at(addDays(TODAY, 1), 10, 0), end: at(addDays(TODAY, 1), 11, 30), location: "Studio · Zoom" },
    { id: makeId(), type: "event", title: "Lunch", categoryId: "c-personal", start: at(addDays(TODAY, 1), 12, 30), end: at(addDays(TODAY, 1), 13, 30) },
    { id: makeId(), type: "event", title: "1:1 with Priya", categoryId: "c-work", start: at(addDays(TODAY, 1), 14, 0), end: at(addDays(TODAY, 1), 14, 30) },
    { id: makeId(), type: "event", title: "Deep work — week plan", categoryId: "c-focus", start: at(addDays(TODAY, 1), 15, 0), end: at(addDays(TODAY, 1), 17, 0) },
    // Tuesday
    { id: makeId(), type: "event", title: "Dentist", categoryId: "c-health", start: at(addDays(TODAY, 2), 8, 30), end: at(addDays(TODAY, 2), 9, 30), location: "Dr. Chen" },
    { id: makeId(), type: "event", title: "Standup", categoryId: "c-work", start: at(addDays(TODAY, 2), 10, 0), end: at(addDays(TODAY, 2), 10, 15) },
    { id: makeId(), type: "event", title: "Customer interview — Sora Labs", categoryId: "c-work", start: at(addDays(TODAY, 2), 11, 0), end: at(addDays(TODAY, 2), 12, 0) },
    { id: makeId(), type: "event", title: "Strategy offsite prep", categoryId: "c-focus", start: at(addDays(TODAY, 2), 14, 0), end: at(addDays(TODAY, 2), 16, 0) },
    { id: makeId(), type: "event", title: "Pickup kids", categoryId: "c-family", start: at(addDays(TODAY, 2), 16, 30), end: at(addDays(TODAY, 2), 17, 30) },
    // Wednesday
    { id: makeId(), type: "event", title: "Standup", categoryId: "c-work", start: at(addDays(TODAY, 3), 9, 0), end: at(addDays(TODAY, 3), 9, 15) },
    { id: makeId(), type: "event", title: "Roadmap sync", categoryId: "c-work", start: at(addDays(TODAY, 3), 9, 30), end: at(addDays(TODAY, 3), 10, 30) },
    { id: makeId(), type: "event", title: "Lunch w/ Theo", categoryId: "c-personal", start: at(addDays(TODAY, 3), 12, 0), end: at(addDays(TODAY, 3), 13, 0), location: "Phnom Penh" },
    { id: makeId(), type: "event", title: "Calendar review — visual pass", categoryId: "c-work", start: at(addDays(TODAY, 3), 14, 0), end: at(addDays(TODAY, 3), 15, 30) },
    { id: makeId(), type: "event", title: "Yoga", categoryId: "c-health", start: at(addDays(TODAY, 3), 18, 30), end: at(addDays(TODAY, 3), 19, 30) },
    // Thursday
    { id: makeId(), type: "event", title: "Standup", categoryId: "c-work", start: at(addDays(TODAY, 4), 9, 0), end: at(addDays(TODAY, 4), 9, 15) },
    { id: makeId(), type: "event", title: "Quarterly review", categoryId: "c-work", start: at(addDays(TODAY, 4), 10, 0), end: at(addDays(TODAY, 4), 12, 0) },
    { id: makeId(), type: "event", title: "Coffee with Sam", categoryId: "c-personal", start: at(addDays(TODAY, 4), 14, 30), end: at(addDays(TODAY, 4), 15, 30) },
    // Friday
    { id: makeId(), type: "event", title: "Standup", categoryId: "c-work", start: at(addDays(TODAY, 5), 9, 0), end: at(addDays(TODAY, 5), 9, 15) },
    { id: makeId(), type: "event", title: "Deep work block", categoryId: "c-focus", start: at(addDays(TODAY, 5), 9, 30), end: at(addDays(TODAY, 5), 12, 0) },
    { id: makeId(), type: "event", title: "Demo Friday", categoryId: "c-work", start: at(addDays(TODAY, 5), 15, 0), end: at(addDays(TODAY, 5), 16, 0) },
    // Saturday
    { id: makeId(), type: "event", title: "Farmer's market", categoryId: "c-family", start: at(addDays(TODAY, 6), 9, 30), end: at(addDays(TODAY, 6), 11, 0) },
    { id: makeId(), type: "event", title: "Dinner — Anna & Lior", categoryId: "c-personal", start: at(addDays(TODAY, 6), 19, 0), end: at(addDays(TODAY, 6), 22, 0), location: "Their place" },
    // All-day
    { id: makeId(), type: "event", title: "Vancouver Design Week", categoryId: "c-work", start: ymd(addDays(TODAY, 2)), end: ymd(addDays(TODAY, 4)), allDay: true },
    { id: makeId(), type: "event", title: "Theo's birthday", categoryId: "c-family", start: ymd(addDays(TODAY, 3)), end: ymd(addDays(TODAY, 3)), allDay: true },
    // Last week (for search demo)
    { id: makeId(), type: "event", title: "Calendar kickoff", categoryId: "c-work", start: at(addDays(TODAY, -5), 14, 0), end: at(addDays(TODAY, -5), 15, 30) },
    // Next week
    { id: makeId(), type: "event", title: "Calendar v2 review", categoryId: "c-work", start: at(addDays(TODAY, 9), 11, 0), end: at(addDays(TODAY, 9), 12, 0) },
  ];

  const tasks = [
    // Simple tasks
    { id: makeId(), type: "task", title: "Submit expense report", categoryId: "c-work", date: ymd(TODAY), done: false },
    { id: makeId(), type: "task", title: "Pick up dry cleaning", categoryId: "c-personal", date: ymd(TODAY), done: false },
    { id: makeId(), type: "task", title: "Read Calendar v2 brief", categoryId: "c-work", date: ymd(addDays(TODAY, 1)), done: false },
    { id: makeId(), type: "task", title: "Call mom", categoryId: "c-family", date: ymd(addDays(TODAY, 2)), done: false },
    { id: makeId(), type: "task", title: "Water plants", categoryId: "c-personal", date: ymd(addDays(TODAY, 3)), done: false, recurrence: "weekly" },
    { id: makeId(), type: "task", title: "Prep talk slides", categoryId: "c-work", date: ymd(addDays(TODAY, 4)), done: false },
    // Floating tasks (started earlier, not done — should bubble forward)
    { id: makeId(), type: "float", title: "Finalize budget review", categoryId: "c-work", date: ymd(addDays(TODAY, -3)), done: false },
    { id: makeId(), type: "float", title: "Reply to landlord", categoryId: "c-personal", date: ymd(addDays(TODAY, -2)), done: false },
    { id: makeId(), type: "float", title: "Renew passport", categoryId: "c-misc", date: ymd(addDays(TODAY, -10)), done: false },
    // Completed already
    { id: makeId(), type: "task", title: "Order groceries", categoryId: "c-personal", date: ymd(addDays(TODAY, -1)), done: true, doneDate: ymd(addDays(TODAY, -1)) },
  ];

  window.CAL.SEED = { categories, events, tasks, today: TODAY };
})();
