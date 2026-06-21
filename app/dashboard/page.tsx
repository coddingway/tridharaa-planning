'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

type ModalState =
  | { type: 'confirm'; msg: string; onOk: () => void }
  | { type: 'prompt';  msg: string; onOk: (val: string) => void }
  | null;

type Status   = 'open' | 'approved' | 'task';
type Progress = 'todo' | 'in-progress' | 'done';

interface Idea {
  id: string; member_name: string; idea_text: string;
  category: string; status: Status; created_at: string;
}
interface Task {
  id: string; idea_id: string | null; title: string;
  assigned_to: string; progress: Progress; created_at: string;
}

const CATS = [
  '🪔 Puja & Rituals', '🎭 Cultural Programme', '📍 Venue & Setup',
  '🍛 Food & Bhog', '💰 Finance', '🤝 Volunteers', '💬 General',
];

const NEXT_P: Record<Progress, Progress> = { todo: 'in-progress', 'in-progress': 'done', done: 'todo' };
const P_LABEL: Record<Progress, string>  = { todo: 'To Do', 'in-progress': 'In Progress', done: 'Done ✓' };
const S_LABEL: Record<Status, string>    = { open: '💬 Open', approved: '✓ Approved', task: '→ Task' };

export default function Dashboard() {
  const router = useRouter();
  const [me,      setMe]      = useState('');
  const [ideas,   setIdeas]   = useState<Idea[]>([]);
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [filter,  setFilter]  = useState('All');
  const [cat,     setCat]     = useState('');
  const [text,    setText]    = useState('');
  const [posting,    setPosting]    = useState(false);
  const [toast,      setToast]      = useState('');
  const [modal,      setModal]      = useState<ModalState>(null);
  const [filterName, setFilterName] = useState('All');
  const [sortBy,     setSortBy]     = useState<'date-desc'|'date-asc'|'name-asc'|'name-desc'>('date-desc');
  const promptRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [ir, tr] = await Promise.all([
      fetch('/api/ideas').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
    ]);
    if (Array.isArray(ir)) setIdeas(ir);
    if (Array.isArray(tr)) setTasks(tr);
  }, []);

  useEffect(() => {
    const name = localStorage.getItem('tp_user');
    if (!name) { router.push('/'); return; }
    setMe(name);
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load, router]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  async function post() {
    if (!cat || !text.trim()) { showToast('Pick a category and write your idea.'); return; }
    setPosting(true);
    await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_name: me, idea_text: text.trim(), category: cat }),
    });
    setCat(''); setText('');
    setPosting(false);
    showToast('Idea posted! 🎉');
    load();
  }

  async function approve(id: string) {
    await fetch(`/api/ideas/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) });
    showToast('Approved ✓');
    load();
  }

  async function makeTask(idea: Idea) {
    setModal({ type: 'prompt', msg: 'Assign this task to:', onOk: async (who) => {
      if (!who.trim()) return;
    await Promise.all([
      fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea_id: idea.id, title: idea.idea_text, assigned_to: who.trim() }) }),
      fetch(`/api/ideas/${idea.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'task' }) }),
      ]);
      showToast('Task created!');
      load();
    }});
  }

  async function cycleProgress(task: Task) {
    await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress: NEXT_P[task.progress] }) });
    load();
  }

  function deleteIdea(id: string) {
    setModal({ type: 'confirm', msg: 'Delete this idea?', onOk: async () => {
      await fetch(`/api/ideas/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requester: me }) });
      showToast('Idea deleted');
      load();
    }});
  }

  function deleteTask(id: string) {
    setModal({ type: 'confirm', msg: 'Delete this task?', onOk: async () => {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requester: me }) });
      showToast('Task deleted');
      load();
    }});
  }

  const isAdmin = me === 'Amrit';
  const names = ['All', ...Array.from(new Set(ideas.map(i => i.member_name))).sort()];
  const shown = ideas
    .filter(i => filter === 'All' || i.category === filter)
    .filter(i => filterName === 'All' || i.member_name === filterName)
    .sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'date-asc')  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'name-asc')  return a.member_name.localeCompare(b.member_name);
      return b.member_name.localeCompare(a.member_name);
    });

  function dt(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  const s = styles;

  return (
    <div>
      {/* Top bar */}
      <div style={s.topbar}>
        <span style={s.brand}>🪷 <span style={{ color: '#F0A832' }}>Tridharaa</span> Planning Hub</span>
        <button style={s.userPill} onClick={() => setModal({ type: 'confirm', msg: 'Change your name?', onOk: () => { localStorage.removeItem('tp_user'); router.push('/'); } })}>
          👤 {me}
        </button>
      </div>

      <div style={s.wrap}>
        {/* Post form */}
        <div style={s.card}>
          <div style={s.boxLabel}>💡 Post an Idea</div>
          <select value={cat} onChange={e => setCat(e.target.value)} style={s.select}>
            <option value="">Select category…</option>
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Describe your idea clearly…"
            rows={3}
            style={s.textarea}
          />
          <div style={{ textAlign: 'right' }}>
            <button onClick={post} disabled={posting} style={s.btnPost}>
              {posting ? 'Posting…' : 'Post Idea'}
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div style={s.tabs}>
          {['All', ...CATS].map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              style={{ ...s.tab, ...(filter === c ? s.tabActive : {}) }}
            >
              {c === 'All' ? 'All' : c.split(' ').slice(1).join(' ')}
            </button>
          ))}
        </div>

        {/* Name filter + sort row */}
        <div style={s.filterRow}>
          <select value={filterName} onChange={e => setFilterName(e.target.value)} style={s.filterSelect}>
            {names.map(n => <option key={n} value={n}>{n === 'All' ? '👤 All Members' : n}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={s.filterSelect}>
            <option value="date-desc">↓ Newest first</option>
            <option value="date-asc">↑ Oldest first</option>
            <option value="name-asc">A→Z by name</option>
            <option value="name-desc">Z→A by name</option>
          </select>
        </div>

        {/* Ideas */}
        <div style={s.secLabel}>Ideas Board · {shown.length} idea{shown.length !== 1 ? 's' : ''}</div>
        <div style={s.list}>
          {shown.length === 0 ? (
            <div style={s.empty}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💡</div>No ideas yet — post the first one!</div>
          ) : shown.map(idea => (
            <div key={idea.id} style={{ ...s.ideaCard, ...(idea.status === 'approved' ? s.ideaApproved : idea.status === 'task' ? s.ideaTask : {}) }}>
              <div style={s.ideaHead}>
                <span style={s.who}>{idea.member_name}</span>
                <span style={s.catTag}>{idea.category}</span>
                <span style={s.when}>{dt(idea.created_at)}</span>
              </div>
              <div style={s.ideaBody}>{idea.idea_text}</div>
              <div style={s.ideaFoot}>
                <span style={{ ...s.statusPill, ...(idea.status === 'approved' ? s.pillApproved : idea.status === 'task' ? s.pillTask : s.pillOpen) }}>
                  {S_LABEL[idea.status]}
                </span>
                {isAdmin && idea.status === 'open'     && <button style={{ ...s.btnSm, ...s.btnApprove }} onClick={() => approve(idea.id)}>✓ Approve</button>}
                {isAdmin && idea.status === 'approved' && <button style={{ ...s.btnSm, ...s.btnTask }}    onClick={() => makeTask(idea)}>→ Make Task</button>}
                {(isAdmin || me === idea.member_name)  && <button style={{ ...s.btnSm, ...s.btnDelete }}  onClick={() => deleteIdea(idea.id)}>🗑</button>}
              </div>
            </div>
          ))}
        </div>

        <hr style={s.divider} />

        {/* Tasks */}
        <div style={s.secLabel}>Weekly Task List · {tasks.length} task{tasks.length !== 1 ? 's' : ''}</div>
        <div style={s.list}>
          {tasks.length === 0 ? (
            <div style={s.empty}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>No tasks yet. Approve ideas to create tasks.</div>
          ) : tasks.map(task => (
            <div key={task.id} style={s.taskCard}>
              <div style={{ ...s.taskDot, background: task.progress === 'done' ? '#2A7A2A' : task.progress === 'in-progress' ? '#D4840A' : '#ccc' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.taskTitle}>{task.title}</div>
                <div style={s.taskMeta}>Assigned to <strong>{task.assigned_to || 'Unassigned'}</strong></div>
              </div>
              {isAdmin && (
                <button
                  style={{ ...s.btnProgress, ...(task.progress === 'done' ? s.progDone : task.progress === 'in-progress' ? s.progWip : s.progTodo) }}
                  onClick={() => cycleProgress(task)}
                >
                  {P_LABEL[task.progress]}
                </button>
              )}
              {!isAdmin && (
                <span style={{ ...s.btnProgress, ...(task.progress === 'done' ? s.progDone : task.progress === 'in-progress' ? s.progWip : s.progTodo) }}>
                  {P_LABEL[task.progress]}
                </span>
              )}
              {isAdmin && <button style={{ ...s.btnSm, ...s.btnDelete }} onClick={() => deleteTask(task.id)}>🗑</button>}
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div style={s.overlay} onClick={() => setModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalMsg}>{modal.msg}</div>
            {modal.type === 'prompt' && (
              <input
                ref={promptRef}
                autoFocus
                style={s.modalInput}
                placeholder="Member name…"
                onKeyDown={e => { if (e.key === 'Enter') { const v = promptRef.current?.value || ''; setModal(null); modal.onOk(v); } }}
              />
            )}
            <div style={s.modalBtns}>
              <button style={s.modalCancel} onClick={() => setModal(null)}>Cancel</button>
              <button style={s.modalOk} onClick={() => {
                const val = modal.type === 'prompt' ? (promptRef.current?.value || '') : '';
                setModal(null);
                modal.onOk(val);
              }}>
                {modal.type === 'confirm' ? 'Delete' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={s.toast}>{toast}</div>
      )}
    </div>
  );
}

const styles = {
  topbar:      { background: '#5C1148', color: '#fff', padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.25)' },
  brand:       { fontSize: '0.95rem', fontWeight: 800 },
  userPill:    { background: 'rgba(255,255,255,0.15)', padding: '0.3rem 0.85rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 600, color: '#fff', border: 'none', cursor: 'pointer' },
  wrap:        { maxWidth: '680px', margin: '0 auto', padding: '1.25rem 1rem 5rem' },
  card:        { background: '#fff', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.09)', padding: '1.1rem 1.2rem', marginBottom: '1.25rem', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' },
  boxLabel:    { fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: '#D4840A', fontWeight: 800, marginBottom: '0.7rem' },
  select:      { width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid rgba(0,0,0,0.09)', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', marginBottom: '0.6rem', appearance: 'none' as const },
  textarea:    { width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid rgba(0,0,0,0.09)', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', resize: 'none' as const, marginBottom: '0.75rem' },
  btnPost:     { padding: '0.6rem 1.4rem', background: '#5C1148', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' },
  tabs:        { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' as const, marginBottom: '0.65rem' },
  filterRow:   { display: 'flex', gap: '0.6rem', marginBottom: '1rem' },
  filterSelect:{ flex: 1, padding: '0.45rem 0.75rem', border: '1.5px solid rgba(0,0,0,0.09)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, outline: 'none', background: '#fff', cursor: 'pointer' },
  tab:         { padding: '0.35rem 0.85rem', border: '1.5px solid rgba(0,0,0,0.09)', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 700, background: '#fff', color: '#777', cursor: 'pointer' },
  tabActive:   { background: '#5C1148', borderColor: '#5C1148', color: '#fff' },
  secLabel:    { fontSize: '0.7rem', textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: '#777', fontWeight: 800, marginBottom: '0.65rem' },
  list:        { display: 'flex', flexDirection: 'column' as const, gap: '0.65rem' },
  ideaCard:    { background: '#fff', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.09)', padding: '0.95rem 1.1rem' },
  ideaApproved:{ borderLeft: '3px solid #D4840A' },
  ideaTask:    { borderLeft: '3px solid #2A7A2A', background: '#FAFFF9' },
  ideaHead:    { display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.45rem', flexWrap: 'wrap' as const },
  who:         { fontSize: '0.78rem', fontWeight: 800, color: '#5C1148' },
  catTag:      { fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '100px', background: '#E8EDCB', color: '#2C2C2C' },
  when:        { fontSize: '0.68rem', color: '#777', marginLeft: 'auto' },
  ideaBody:    { fontSize: '0.9rem', lineHeight: 1.55, color: '#2C2C2C' },
  ideaFoot:    { display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem' },
  statusPill:  { fontSize: '0.68rem', fontWeight: 700, padding: '0.18rem 0.55rem', borderRadius: '100px' },
  pillOpen:    { background: '#F0F5D8', color: '#5C1148' },
  pillApproved:{ background: '#FFF3DC', color: '#D4840A' },
  pillTask:    { background: '#EAFAEA', color: '#2A7A2A' },
  btnSm:       { marginLeft: 'auto', padding: '0.28rem 0.75rem', fontSize: '0.73rem', fontWeight: 700, borderRadius: '6px', cursor: 'pointer' },
  btnApprove:  { border: '1.5px solid #D4840A', color: '#D4840A', background: 'none' },
  btnTask:     { border: '1.5px solid #2A7A2A', color: '#2A7A2A', background: 'none' },
  btnDelete:   { border: '1.5px solid #cc3333', color: '#cc3333', background: 'none', marginLeft: 'auto' },
  divider:     { border: 'none', borderTop: '1px solid rgba(0,0,0,0.09)', margin: '1.75rem 0' },
  taskCard:    { background: '#fff', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.09)', padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' },
  taskDot:     { width: '11px', height: '11px', borderRadius: '50%', flexShrink: 0 },
  taskTitle:   { fontSize: '0.875rem', fontWeight: 700, color: '#2C2C2C', marginBottom: '0.18rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  taskMeta:    { fontSize: '0.72rem', color: '#777' },
  btnProgress: { flexShrink: 0, padding: '0.28rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, border: 'none', borderRadius: '6px', cursor: 'pointer' },
  progTodo:    { background: '#f0f0f0', color: '#666' },
  progWip:     { background: '#FFF3DC', color: '#D4840A' },
  progDone:    { background: '#EAFAEA', color: '#2A7A2A' },
  empty:       { textAlign: 'center' as const, padding: '2.5rem 1rem', color: '#777', fontSize: '0.875rem' },
  toast:       { position: 'fixed' as const, bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: '#5C1148', color: '#fff', padding: '0.65rem 1.4rem', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 700, zIndex: 999, whiteSpace: 'nowrap' as const, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' },
  overlay:     { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modal:       { background: '#fff', borderRadius: '16px', padding: '1.5rem 1.4rem', width: '100%', maxWidth: '340px', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' },
  modalMsg:    { fontSize: '0.95rem', fontWeight: 700, color: '#2C2C2C', marginBottom: '1rem' },
  modalInput:  { width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' as const },
  modalBtns:   { display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' },
  modalCancel: { padding: '0.5rem 1.1rem', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: '8px', background: '#fff', color: '#555', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' },
  modalOk:     { padding: '0.5rem 1.1rem', border: 'none', borderRadius: '8px', background: '#5C1148', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' },
};
