'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [cd, setCd]     = useState('');

  useEffect(() => {
    if (localStorage.getItem('tp_user')) router.push('/dashboard');

    function tick() {
      const diff = new Date('2026-10-16T06:00:00').getTime() - Date.now();
      if (diff < 0) { setCd('🪷 Durga Puja is here!'); return; }
      const d = Math.floor(diff / 864e5);
      const h = Math.floor((diff % 864e5) / 36e5);
      setCd(`🪷 Durga Puja 2026 in ${d} days · ${h} hrs`);
    }
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, []);

  function enter() {
    const v = name.trim();
    if (!v) return;
    localStorage.setItem('tp_user', v);
    router.push('/dashboard');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'linear-gradient(150deg, #5C1148 0%, #3D0B30 100%)' }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '2.5rem 2rem', width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
        <img src="/logo-color.png" alt="Tridharaa" style={{ width: '140px', marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '1.2rem', color: '#5C1148', fontWeight: 800, marginBottom: '0.2rem' }}>Planning Hub</h1>
        <p style={{ fontSize: '0.85rem', color: '#777', marginBottom: '1.75rem' }}>Durga Puja 2026 · Oct 16–21</p>
        <input
          type="text"
          placeholder="Enter your name…"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && enter()}
          autoComplete="off"
          autoCapitalize="words"
          maxLength={50}
          style={{ width: '100%', padding: '0.8rem 1rem', border: '2px solid rgba(0,0,0,0.09)', borderRadius: '10px', fontSize: '1rem', outline: 'none', marginBottom: '0.85rem' }}
        />
        <button
          onClick={enter}
          style={{ width: '100%', padding: '0.85rem', background: '#D4840A', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.02em' }}
        >
          Enter Planning Hub →
        </button>
        {cd && (
          <div style={{ marginTop: '1.25rem', display: 'inline-block', padding: '0.45rem 1.1rem', background: '#F0F5D8', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700, color: '#5C1148' }}>
            {cd}
          </div>
        )}
      </div>
    </div>
  );
}
