'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Status   = 'open' | 'approved' | 'task';
type Progress = 'todo' | 'in-progress' | 'done';

interface Idea {
  id: string; member_name: string; idea_text: string;
  category: string; tag: string | null; image_url: string | null;
  action_plan: string | null; status: Status; created_at: string;
}
interface Task {
  id: string; idea_id: string | null; title: string;
  assigned_to: string; progress: Progress; created_at: string;
}

type ModalState =
  | { type: 'confirm';  msg: string; okLabel?: string; onOk: () => void }
  | { type: 'prompt';   msg: string; okLabel?: string; onOk: (val: string) => void }
  | null;

const CATS = [
  '🪔 Puja & Rituals', '🎭 Cultural Programme', '📍 Venue & Setup',
  '🍛 Food & Bhog', '💰 Finance', '🤝 Volunteers', '💬 General',
];

const NEXT_P: Record<Progress, Progress> = { todo: 'in-progress', 'in-progress': 'done', done: 'todo' };
const P_LABEL: Record<Progress, string>  = { todo: 'To Do', 'in-progress': 'In Progress', done: 'Done ✓' };

export default function Responsibilities() {
  const router  = useRouter();
  const [me,    setMe]    = useState('');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterName, setFilterName] = useState('All');
  const [sortBy,     setSortBy]     = useState<'date-desc'|'date-asc'|'name-asc'|'name-desc'>('date-desc');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const promptRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [ir, tr] = await Promise.all([
      fetch('/api/ideas').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
    ]);
    if (Array.isArray(ir)) setIdeas(ir.filter((i: Idea) => i.status === 'approved' || i.status === 'task'));
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

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800); }

  const isAdmin = me === 'Amrit';
  const names   = ['All', ...Array.from(new Set(ideas.map(i => i.member_name))).sort()];

  function filteredIdeasForCat(cat: string) {
    return ideas
      .filter(i => i.category === cat)
      .filter(i => filterName === 'All' || i.member_name === filterName)
      .sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === 'date-asc')  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortBy === 'name-asc')  return a.member_name.localeCompare(b.member_name);
        return b.member_name.localeCompare(a.member_name);
      });
  }

  function makeTask(idea: Idea) {
    setModal({ type: 'prompt', msg: 'Assign task to:', okLabel: 'Assign', onOk: async (who) => {
      if (!who.trim()) return;
      await Promise.all([
        fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea_id: idea.id, title: idea.idea_text, assigned_to: who.trim() }) }),
        fetch(`/api/ideas/${idea.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'task' }) }),
      ]);
      showToast('Task created!');
      load();
    }});
  }

  function cycleProgress(task: Task) {
    fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress: NEXT_P[task.progress] }) })
      .then(() => load());
  }

  function deleteTask(id: string) {
    setModal({ type: 'confirm', msg: 'Delete this task?', onOk: async () => {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requester: me }) });
      showToast('Task deleted');
      load();
    }});
  }

  function dt(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  const s = styles;
  const activeCats = CATS.filter(c => filteredIdeasForCat(c).length > 0);

  return (
    <div>
      {/* Topbar */}
      <div style={s.topbar}>
        <img src="/logo-white.png" alt="Tridharaa" style={{ height: '30px' }} />
        <div style={s.navTabs}>
          <span style={s.navTab} onClick={() => router.push('/dashboard')}>💡 Ideas</span>
          <span style={{ ...s.navTab, ...s.navTabActive }}>✅ Responsibilities</span>
        </div>
        <button style={s.userPill} onClick={() => setModal({ type: 'confirm', msg: 'Log out?', okLabel: 'Log out', onOk: () => { localStorage.removeItem('tp_user'); router.push('/'); } })}>
          👤 {me}
        </button>
      </div>

      <div style={s.wrap}>
        {/* Filter row */}
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

        {activeCats.length === 0 && (
          <div style={s.empty}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
            No approved ideas yet. Approve ideas in the Planning Hub to see them here.
          </div>
        )}

        {/* Category sections */}
        {activeCats.map(cat => {
          const catIdeas = filteredIdeasForCat(cat);
          return (
            <div key={cat} style={s.catSection}>
              <div style={s.catHeader}>{cat}</div>

              {catIdeas.map(idea => {
                const linkedTask = tasks.find(t => t.idea_id === idea.id);
                return (
                  <div key={idea.id} style={{ ...s.ideaCard, ...(idea.status === 'task' ? s.ideaTask : s.ideaApproved) }}>
                    {/* Idea */}
                    <div style={s.ideaHead}>
                      <span style={s.who}>{idea.member_name}</span>
                      {idea.tag && <span style={s.tagPill}># {idea.tag}</span>}
                      <span style={s.when}>{dt(idea.created_at)}</span>
                    </div>
                    <div style={s.ideaBody}>{idea.idea_text}</div>
                    {idea.image_url && (
                      <img src={idea.image_url} alt="" style={s.ideaImg} onClick={() => window.open(idea.image_url!, '_blank')} />
                    )}
                    {idea.action_plan && (
                      <div style={s.actionPlan}>
                        <span style={s.actionPlanLabel}>📋 Action Plan</span>
                        {idea.action_plan}
                      </div>
                    )}

                    {/* Task block */}
                    {idea.status === 'approved' && isAdmin && (
                      <div style={s.taskRow}>
                        <button style={s.btnMakeTask} onClick={() => makeTask(idea)}>→ Make Task</button>
                      </div>
                    )}

                    {linkedTask && (
                      <div style={s.taskBlock}>
                        <div style={s.taskBlockHead}>
                          <div style={{ ...s.taskDot, background: linkedTask.progress === 'done' ? '#2A7A2A' : linkedTask.progress === 'in-progress' ? '#D4840A' : '#ccc' }} />
                          <span style={s.taskAssigned}>Assigned to <strong>{linkedTask.assigned_to || 'Unassigned'}</strong></span>
                          {isAdmin ? (
                            <button
                              style={{ ...s.btnProgress, ...(linkedTask.progress === 'done' ? s.progDone : linkedTask.progress === 'in-progress' ? s.progWip : s.progTodo) }}
                              onClick={() => cycleProgress(linkedTask)}
                            >
                              {P_LABEL[linkedTask.progress]}
                            </button>
                          ) : (
                            <span style={{ ...s.btnProgress, ...(linkedTask.progress === 'done' ? s.progDone : linkedTask.progress === 'in-progress' ? s.progWip : s.progTodo) }}>
                              {P_LABEL[linkedTask.progress]}
                            </span>
                          )}
                          {isAdmin && <button style={s.btnDelete} onClick={() => deleteTask(linkedTask.id)}>🗑</button>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modal && (
        <div style={s.overlay} onClick={() => setModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalMsg}>{modal.msg}</div>
            {modal.type === 'prompt' && (
              <input ref={promptRef} autoFocus style={s.modalInput} placeholder="Member name…"
                onKeyDown={e => { if (e.key === 'Enter') { const v = promptRef.current?.value || ''; setModal(null); modal.onOk(v); } }}
              />
            )}
            <div style={s.modalBtns}>
              <button style={s.modalCancel} onClick={() => setModal(null)}>Cancel</button>
              <button style={s.modalOk} onClick={() => { const v = modal.type === 'prompt' ? (promptRef.current?.value || '') : ''; setModal(null); modal.onOk(v as never); }}>
                {modal.okLabel ?? (modal.type === 'confirm' ? 'Delete' : 'Assign')}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );
}

const styles = {
  topbar:       { background: '#5C1148', color: '#fff', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.25)', gap: '0.5rem' },
  navTabs:      { display: 'flex', gap: '0.3rem', background: 'rgba(0,0,0,0.2)', borderRadius: '100px', padding: '0.2rem' },
  navTab:       { padding: '0.3rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', whiteSpace: 'nowrap' as const },
  navTabActive: { background: '#fff', color: '#5C1148' },
  userPill:     { background: 'rgba(255,255,255,0.15)', padding: '0.3rem 0.85rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 600, color: '#fff', border: 'none', cursor: 'pointer' },
  wrap:         { maxWidth: '680px', margin: '0 auto', padding: '1.25rem 1rem 5rem' },
  filterRow:    { display: 'flex', gap: '0.6rem', marginBottom: '1.25rem' },
  filterSelect: { flex: 1, padding: '0.45rem 0.75rem', border: '1.5px solid rgba(0,0,0,0.09)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, outline: 'none', background: '#fff', cursor: 'pointer' },
  catSection:   { marginBottom: '1.75rem' },
  catHeader:    { fontSize: '0.8rem', fontWeight: 800, color: '#5C1148', textTransform: 'uppercase' as const, letterSpacing: '0.08em', padding: '0.4rem 0.75rem', background: '#F0F5D8', borderRadius: '8px', marginBottom: '0.65rem', borderLeft: '4px solid #5C1148' },
  ideaCard:     { background: '#fff', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.09)', padding: '0.95rem 1.1rem', marginBottom: '0.65rem' },
  ideaApproved: { borderLeft: '3px solid #D4840A' },
  ideaTask:     { borderLeft: '3px solid #2A7A2A', background: '#FAFFF9' },
  ideaHead:     { display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.45rem', flexWrap: 'wrap' as const },
  who:          { fontSize: '0.78rem', fontWeight: 800, color: '#5C1148' },
  tagPill:      { fontSize: '0.66rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '100px', background: '#F0E8F5', color: '#7B3FA0' },
  when:         { fontSize: '0.68rem', color: '#777', marginLeft: 'auto' },
  ideaBody:     { fontSize: '0.9rem', lineHeight: 1.55, color: '#2C2C2C' },
  ideaImg:      { width: '100%', maxHeight: '200px', objectFit: 'cover' as const, borderRadius: '8px', marginTop: '0.5rem', cursor: 'pointer' },
  actionPlan:   { marginTop: '0.5rem', padding: '0.55rem 0.75rem', background: '#FFF8EC', borderLeft: '3px solid #D4840A', borderRadius: '0 6px 6px 0', fontSize: '0.82rem', lineHeight: 1.5, color: '#5C3A00' },
  actionPlanLabel: { display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#D4840A', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '0.25rem' },
  taskRow:      { marginTop: '0.65rem' },
  btnMakeTask:  { padding: '0.35rem 0.9rem', border: '1.5px solid #2A7A2A', color: '#2A7A2A', background: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' },
  taskBlock:    { marginTop: '0.65rem', background: '#F4FBF4', borderRadius: '8px', padding: '0.6rem 0.85rem' },
  taskBlockHead:{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' as const },
  taskDot:      { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
  taskAssigned: { fontSize: '0.8rem', color: '#444', flex: 1 },
  btnProgress:  { flexShrink: 0, padding: '0.28rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, border: 'none', borderRadius: '6px', cursor: 'pointer' },
  progTodo:     { background: '#f0f0f0', color: '#666' },
  progWip:      { background: '#FFF3DC', color: '#D4840A' },
  progDone:     { background: '#EAFAEA', color: '#2A7A2A' },
  btnDelete:    { padding: '0.28rem 0.6rem', border: '1.5px solid #cc3333', color: '#cc3333', background: 'none', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer' },
  empty:        { textAlign: 'center' as const, padding: '3rem 1rem', color: '#777', fontSize: '0.9rem', lineHeight: 1.6 },
  toast:        { position: 'fixed' as const, bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: '#5C1148', color: '#fff', padding: '0.65rem 1.4rem', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 700, zIndex: 999, whiteSpace: 'nowrap' as const, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' },
  overlay:      { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modal:        { background: '#fff', borderRadius: '16px', padding: '1.5rem 1.4rem', width: '100%', maxWidth: '340px', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' },
  modalMsg:     { fontSize: '0.95rem', fontWeight: 700, color: '#2C2C2C', marginBottom: '1rem' },
  modalInput:   { width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' as const },
  modalBtns:    { display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' },
  modalCancel:  { padding: '0.5rem 1.1rem', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: '8px', background: '#fff', color: '#555', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' },
  modalOk:      { padding: '0.5rem 1.1rem', border: 'none', borderRadius: '8px', background: '#5C1148', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' },
};
