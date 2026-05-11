from flask import Flask, request, jsonify, render_template, send_from_directory
import sqlite3
import os
import uuid

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), 'recto.db')

DEFAULT_CATEGORIES = [
    ('c-work',     'Work',       'var(--cat-4)', 0),
    ('c-personal', 'Personal',   'var(--cat-3)', 1),
    ('c-health',   'Health',     'var(--cat-1)', 2),
    ('c-family',   'Family',     'var(--cat-2)', 3),
    ('c-focus',    'Focus time', 'var(--cat-5)', 4),
    ('c-misc',     'Misc',       'var(--cat-6)', 5),
]


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    return conn


def init_db():
    with get_db() as conn:
        conn.executescript('''
            CREATE TABLE IF NOT EXISTS categories (
                id         TEXT PRIMARY KEY,
                name       TEXT NOT NULL,
                color      TEXT NOT NULL,
                sort_order INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS events (
                id          TEXT PRIMARY KEY,
                type        TEXT    DEFAULT 'event',
                title       TEXT    NOT NULL,
                category_id TEXT,
                start       TEXT    NOT NULL,
                end         TEXT,
                all_day     INTEGER DEFAULT 0,
                location    TEXT,
                notes       TEXT
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id          TEXT PRIMARY KEY,
                type        TEXT NOT NULL DEFAULT 'task',
                title       TEXT NOT NULL,
                category_id TEXT,
                date        TEXT NOT NULL,
                done        INTEGER DEFAULT 0,
                done_date   TEXT,
                recurrence  TEXT,
                notes       TEXT
            );
        ''')
        count = conn.execute('SELECT COUNT(*) FROM categories').fetchone()[0]
        if count == 0:
            conn.executemany(
                'INSERT INTO categories (id, name, color, sort_order) VALUES (?,?,?,?)',
                DEFAULT_CATEGORIES,
            )


def make_id():
    return uuid.uuid4().hex[:8]


# ── serializers ──────────────────────────────────────────────────────────────

def row_to_event(row):
    return {
        'id':         row['id'],
        'type':       row['type'] or 'event',
        'title':      row['title'],
        'categoryId': row['category_id'],
        'start':      row['start'],
        'end':        row['end'],
        'allDay':     bool(row['all_day']),
        'location':   row['location'],
        'notes':      row['notes'],
    }


def row_to_task(row):
    return {
        'id':         row['id'],
        'type':       row['type'],
        'title':      row['title'],
        'categoryId': row['category_id'],
        'date':       row['date'],
        'done':       bool(row['done']),
        'doneDate':   row['done_date'],
        'recurrence': row['recurrence'],
        'notes':      row['notes'],
    }


def row_to_category(row):
    return {
        'id':    row['id'],
        'name':  row['name'],
        'color': row['color'],
    }


# ── categories ───────────────────────────────────────────────────────────────

@app.route('/api/categories', methods=['GET'])
def get_categories():
    with get_db() as conn:
        rows = conn.execute(
            'SELECT * FROM categories ORDER BY sort_order, name'
        ).fetchall()
        return jsonify([row_to_category(r) for r in rows])


@app.route('/api/categories', methods=['PUT'])
def put_categories():
    data = request.get_json()
    with get_db() as conn:
        conn.execute('DELETE FROM categories')
        conn.executemany(
            'INSERT INTO categories (id, name, color, sort_order) VALUES (?,?,?,?)',
            [(c['id'], c['name'], c['color'], i) for i, c in enumerate(data)],
        )
        rows = conn.execute(
            'SELECT * FROM categories ORDER BY sort_order'
        ).fetchall()
        return jsonify([row_to_category(r) for r in rows])


# ── events ───────────────────────────────────────────────────────────────────

@app.route('/api/events', methods=['GET'])
def get_events():
    with get_db() as conn:
        rows = conn.execute('SELECT * FROM events ORDER BY start').fetchall()
        return jsonify([row_to_event(r) for r in rows])


@app.route('/api/events', methods=['POST'])
def create_event():
    d = request.get_json()
    eid = d.get('id') or make_id()
    with get_db() as conn:
        conn.execute(
            '''INSERT INTO events
               (id, type, title, category_id, start, end, all_day, location, notes)
               VALUES (?,?,?,?,?,?,?,?,?)''',
            (eid, d.get('type', 'event'), d['title'], d.get('categoryId'),
             d['start'], d.get('end'), 1 if d.get('allDay') else 0,
             d.get('location'), d.get('notes')),
        )
        row = conn.execute('SELECT * FROM events WHERE id=?', (eid,)).fetchone()
        return jsonify(row_to_event(row)), 201


@app.route('/api/events/<eid>', methods=['PUT'])
def update_event(eid):
    d = request.get_json()
    with get_db() as conn:
        conn.execute(
            '''UPDATE events SET type=?, title=?, category_id=?, start=?, end=?,
               all_day=?, location=?, notes=? WHERE id=?''',
            (d.get('type', 'event'), d['title'], d.get('categoryId'),
             d['start'], d.get('end'), 1 if d.get('allDay') else 0,
             d.get('location'), d.get('notes'), eid),
        )
        row = conn.execute('SELECT * FROM events WHERE id=?', (eid,)).fetchone()
        if row is None:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(row_to_event(row))


@app.route('/api/events/<eid>', methods=['DELETE'])
def delete_event(eid):
    with get_db() as conn:
        conn.execute('DELETE FROM events WHERE id=?', (eid,))
    return '', 204


# ── tasks ────────────────────────────────────────────────────────────────────

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    with get_db() as conn:
        rows = conn.execute('SELECT * FROM tasks ORDER BY date, type').fetchall()
        return jsonify([row_to_task(r) for r in rows])


@app.route('/api/tasks', methods=['POST'])
def create_task():
    d = request.get_json()
    tid = d.get('id') or make_id()
    with get_db() as conn:
        conn.execute(
            '''INSERT INTO tasks
               (id, type, title, category_id, date, done, done_date, recurrence, notes)
               VALUES (?,?,?,?,?,?,?,?,?)''',
            (tid, d.get('type', 'task'), d['title'], d.get('categoryId'),
             d['date'], 1 if d.get('done') else 0, d.get('doneDate'),
             d.get('recurrence'), d.get('notes')),
        )
        row = conn.execute('SELECT * FROM tasks WHERE id=?', (tid,)).fetchone()
        return jsonify(row_to_task(row)), 201


@app.route('/api/tasks/<tid>', methods=['PUT'])
def update_task(tid):
    d = request.get_json()
    with get_db() as conn:
        conn.execute(
            '''UPDATE tasks SET type=?, title=?, category_id=?, date=?, done=?,
               done_date=?, recurrence=?, notes=? WHERE id=?''',
            (d.get('type', 'task'), d['title'], d.get('categoryId'),
             d['date'], 1 if d.get('done') else 0, d.get('doneDate'),
             d.get('recurrence'), d.get('notes'), tid),
        )
        row = conn.execute('SELECT * FROM tasks WHERE id=?', (tid,)).fetchone()
        if row is None:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(row_to_task(row))


@app.route('/api/tasks/<tid>', methods=['DELETE'])
def delete_task(tid):
    with get_db() as conn:
        conn.execute('DELETE FROM tasks WHERE id=?', (tid,))
    return '', 204


# ── PWA / static ─────────────────────────────────────────────────────────────

@app.route('/sw.js')
def service_worker():
    return send_from_directory(app.static_folder, 'sw.js',
                               mimetype='application/javascript')


@app.route('/')
def index():
    return render_template('index.html')


# ── bootstrap ────────────────────────────────────────────────────────────────

with app.app_context():
    init_db()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
