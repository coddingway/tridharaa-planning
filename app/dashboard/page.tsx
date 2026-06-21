'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

type ModalState =
  | { type: 'confirm';  msg: string; okLabel?: string; onOk: () => void }
  | { type: 'prompt';   msg: string; okLabel?: string; onOk: (val: string) => void }
  | { type: 'textarea'; msg: string; okLabel?: string; hint?: string; onOk: (val: string) => void }
  | null;

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
  const [filter,  setFilter]  = useState('All');
  const [cat,       setCat]       = useState('');
  const [text,      setText]      = useState('');
  const [tag,       setTag]       = useState('');
  const [filterTag, setFilterTag] = useState('All');
  const [imgFile,   setImgFile]   = useState<File | null>(null);
  const [imgPreview,setImgPreview]= useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [posting,    setPosting]    = useState(false);
  const [toast,      setToast]      = useState('');
  const [modal,      setModal]      = useState<ModalState>(null);
  const [filterName, setFilterName] = useState('All');
  const [sortBy,     setSortBy]     = useState<'date-desc'|'date-asc'|'name-asc'|'name-desc'>('date-desc');
  const promptRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    const ir = await fetch('/api/ideas').then(r => r.json());
    if (Array.isArray(ir)) setIdeas(ir);
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

    let image_url: string | null = null;
    if (imgFile) {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', imgFile);
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await r.json();
      image_url = j.url ?? null;
      setUploading(false);
    }

    await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_name: me, idea_text: text.trim(), category: cat, tag: tag.trim() || null, image_url }),
    });
    setCat(''); setText(''); setTag(''); setImgFile(null); setImgPreview('');
    if (fileRef.current) fileRef.current.value = '';
    setPosting(false);
    showToast('Idea posted! 🎉');
    load();
  }

  function approve(id: string) {
    setModal({ type: 'textarea', msg: 'Approve idea', hint: 'Write an action plan (optional)…', okLabel: 'Approve', onOk: async (plan) => {
      await fetch(`/api/ideas/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', action_plan: plan.trim() || null }),
      });
      showToast('Approved ✓');
      load();
    }});
  }

  function deleteIdea(id: string) {
    setModal({ type: 'confirm', msg: 'Delete this idea?', onOk: async () => {
      await fetch(`/api/ideas/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requester: me }) });
      showToast('Idea deleted');
      load();
    }});
  }

  const isAdmin = me === 'Amrit';
  const names = ['All', ...Array.from(new Set(ideas.map(i => i.member_name))).sort()];

  // tags only from ideas in the selected category
  const tagsInCategory = filter === 'All' ? [] :
    ['All', ...Array.from(new Set(ideas.filter(i => i.category === filter && i.tag).map(i => i.tag as string))).sort()];

  const shown = ideas
    .filter(i => filter === 'All' || i.category === filter)
    .filter(i => filterName === 'All' || i.member_name === filterName)
    .filter(i => filter === 'All' || filterTag === 'All' || i.tag === filterTag)
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
        <img src="/logo-white.png" alt="Tridharaa" style={{ height: '30px' }} />
        <div style={s.navTabs}>
          <span style={{ ...s.navTab, ...s.navTabActive }}>💡 Ideas</span>
          <span style={s.navTab} onClick={() => router.push('/responsibilities')}>✅ Responsibilities</span>
        </div>
        <button style={s.userPill} onClick={() => setModal({ type: 'confirm', msg: 'Log out?', okLabel: 'Log out', onOk: () => { localStorage.removeItem('tp_user'); router.push('/'); } })}>
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
          <input
            type="text"
            value={tag}
            onChange={e => setTag(e.target.value)}
            placeholder="Tag / subcategory (optional) e.g. Dhak, Lighting, Prasad…"
            maxLength={40}
            style={{ ...s.select, marginBottom: '0.6rem' }}
          />
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Describe your idea clearly…"
            rows={3}
            style={s.textarea}
          />
          {/* Image upload */}
          <div style={s.imgUploadRow}>
            <label style={s.imgUploadBtn}>
              📎 {imgFile ? imgFile.name : 'Attach image (optional)'}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0] ?? null;
                  setImgFile(f);
                  setImgPreview(f ? URL.createObjectURL(f) : '');
                }}
              />
            </label>
            {imgPreview && (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={imgPreview} alt="preview" style={s.imgPreview} />
                <button style={s.imgRemove} onClick={() => { setImgFile(null); setImgPreview(''); if (fileRef.current) fileRef.current.value = ''; }}>×</button>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <button onClick={post} disabled={posting || uploading} style={s.btnPost}>
              {uploading ? 'Uploading…' : posting ? 'Posting…' : 'Post Idea'}
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div style={s.tabs}>
          {['All', ...CATS].map(c => (
            <button
              key={c}
              onClick={() => { setFilter(c); setFilterTag('All'); }}
              style={{ ...s.tab, ...(filter === c ? s.tabActive : {}) }}
            >
              {c === 'All' ? 'All' : c.split(' ').slice(1).join(' ')}
            </button>
          ))}
        </div>

        {/* Tag filter — only shown when category selected and tags exist */}
        {filter !== 'All' && tagsInCategory.length > 1 && (
          <div style={s.tagFilterRow}>
            <span style={s.tagFilterLabel}>Filter by tag:</span>
            {tagsInCategory.map(t => (
              <button
                key={t}
                onClick={() => setFilterTag(t)}
                style={{ ...s.tagChip, ...(filterTag === t ? s.tagChipActive : {}) }}
              >
                {t === 'All' ? 'All tags' : `# ${t}`}
              </button>
            ))}
          </div>
        )}

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
                {idea.tag && <span style={s.tagPill}># {idea.tag}</span>}
                <span style={s.when}>{dt(idea.created_at)}</span>
              </div>
              <div style={s.ideaBody}>{idea.idea_text}</div>
              {idea.image_url && (
                <img src={idea.image_url} alt="idea visual" style={s.ideaImg} onClick={() => window.open(idea.image_url!, '_blank')} />
              )}
              {idea.action_plan && (
                <div style={s.actionPlan}>
                  <span style={s.actionPlanLabel}>📋 Action Plan</span>
                  {idea.action_plan}
                </div>
              )}
              <div style={s.ideaFoot}>
                <span style={{ ...s.statusPill, ...(idea.status === 'approved' ? s.pillApproved : idea.status === 'task' ? s.pillTask : s.pillOpen) }}>
                  {S_LABEL[idea.status]}
                </span>
                {isAdmin && idea.status === 'open' && <button style={{ ...s.btnSm, ...s.btnApprove }} onClick={() => approve(idea.id)}>✓ Approve</button>}
                {(isAdmin || me === idea.member_name) && <button style={{ ...s.btnSm, ...s.btnDelete }} onClick={() => deleteIdea(idea.id)}>🗑</button>}
              </div>
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
                ref={promptRef as React.RefObject<HTMLInputElement>}
                autoFocus
                style={s.modalInput}
                placeholder="Member name…"
                onKeyDown={e => { if (e.key === 'Enter') { const v = promptRef.current?.value || ''; setModal(null); modal.onOk(v); } }}
              />
            )}
            {modal.type === 'textarea' && (
              <textarea
                ref={promptRef as unknown as React.RefObject<HTMLTextAreaElement>}
                autoFocus
                rows={4}
                style={{ ...s.modalInput, resize: 'none' as const, fontFamily: 'inherit' }}
                placeholder={modal.hint ?? ''}
              />
            )}
            <div style={s.modalBtns}>
              <button style={s.modalCancel} onClick={() => setModal(null)}>Cancel</button>
              <button style={s.modalOk} onClick={() => {
                const val = modal.type === 'prompt' ? (promptRef.current?.value || '') : '';
                setModal(null);
                modal.onOk(val);
              }}>
                {modal.okLabel ?? (modal.type === 'confirm' ? 'Delete' : 'Assign')}
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
  topbar:      { background: '#5C1148', color: '#fff', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.25)', gap: '0.5rem' },
  navTabs:     { display: 'flex', gap: '0.3rem', background: 'rgba(0,0,0,0.2)', borderRadius: '100px', padding: '0.2rem' },
  navTab:      { padding: '0.3rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', whiteSpace: 'nowrap' as const },
  navTabActive:{ background: '#fff', color: '#5C1148' },
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
  tagPill:     { fontSize: '0.66rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '100px', background: '#F0E8F5', color: '#7B3FA0' },
  tagFilterRow:{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' as const, marginBottom: '0.75rem', padding: '0.55rem 0.75rem', background: '#F9F4FC', borderRadius: '10px', border: '1px solid #E8D8F5' },
  tagFilterLabel:{ fontSize: '0.7rem', fontWeight: 800, color: '#7B3FA0', marginRight: '0.2rem' },
  tagChip:     { padding: '0.25rem 0.7rem', border: '1.5px solid #C9A8E0', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700, background: '#fff', color: '#7B3FA0', cursor: 'pointer' },
  tagChipActive:{ background: '#7B3FA0', borderColor: '#7B3FA0', color: '#fff' },
  when:        { fontSize: '0.68rem', color: '#777', marginLeft: 'auto' },
  ideaBody:    { fontSize: '0.9rem', lineHeight: 1.55, color: '#2C2C2C' },
  actionPlan:    { marginTop: '0.5rem', padding: '0.55rem 0.75rem', background: '#FFF8EC', borderLeft: '3px solid #D4840A', borderRadius: '0 6px 6px 0', fontSize: '0.82rem', lineHeight: 1.5, color: '#5C3A00' },
  actionPlanLabel: { display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#D4840A', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '0.25rem' },
  ideaImg:       { width: '100%', maxHeight: '220px', objectFit: 'cover' as const, borderRadius: '8px', marginTop: '0.5rem', cursor: 'pointer' },
  imgUploadRow:  { marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' as const },
  imgUploadBtn:  { display: 'inline-block', padding: '0.45rem 0.85rem', border: '1.5px dashed rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.8rem', color: '#777', cursor: 'pointer', fontWeight: 600 },
  imgPreview:    { height: '56px', width: '56px', objectFit: 'cover' as const, borderRadius: '6px', border: '1.5px solid rgba(0,0,0,0.1)' },
  imgRemove:     { position: 'absolute' as const, top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', background: '#cc3333', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', lineHeight: '18px', textAlign: 'center' as const, padding: 0 },
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
