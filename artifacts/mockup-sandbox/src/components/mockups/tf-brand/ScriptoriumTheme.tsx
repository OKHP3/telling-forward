import './_group.css';

const stories = [
  { id: '§ 001', title: 'The Cartographer Who Forgot North', author: 'riv_thread', state: 'Accepted into Canon', stateCode: 'CANON', world: 'The Unmapped Interior' },
  { id: '§ 002', title: 'A Letter Written in Three Languages', author: 'solenne_m', state: 'Under Review', stateCode: 'REVIEW', world: 'The Unmapped Interior' },
  { id: '§ 003', title: 'What the Lighthouse Keeper Heard', author: 'vex_palimps', state: 'Returned with Notes', stateCode: 'RETURNED', world: 'Signal Reef' },
];

const stateStyle = (code: string) => {
  if (code === 'CANON')    return { bg: '#1c3a34', color: '#e6a03c', border: '#e6a03c55' };
  if (code === 'REVIEW')   return { bg: '#2a2320', color: '#c46a2c', border: '#c46a2c55' };
  if (code === 'RETURNED') return { bg: '#1a1215', color: '#9ca3af', border: '#9ca3af33' };
  return { bg: '#111827', color: '#9ca3af', border: 'transparent' };
};

export default function ScriptoriumTheme() {
  return (
    <div style={{
      fontFamily: 'var(--font-body)',
      background: 'linear-gradient(165deg, #0d1117 0%, #111827 55%, #0e1a14 100%)',
      color: 'var(--tf-fg)',
      minHeight: '100vh',
      width: '100%',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Background texture — faint teal vignette */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 59px, #e6a03c 59px, #e6a03c 60px)`,
        pointerEvents: 'none'
      }} />

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 2.5rem',
        borderBottom: '1px solid rgba(230,160,60,0.12)',
        position: 'relative', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.2rem',
            color: '#e6a03c',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}>Telling Forward</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            color: '#1c3a34',
            background: '#e6a03c22',
            border: '1px solid #e6a03c44',
            padding: '2px 6px',
            borderRadius: '2px',
            letterSpacing: '0.08em',
          }}>SCRIPTORIUM EDITION</span>
        </div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          {['Worlds', 'Submissions', 'Archive'].map(nav => (
            <span key={nav} style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: '#9ca3af',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}>{nav}</span>
          ))}
        </div>
      </nav>

      {/* Hero */}
      <header style={{ padding: '3.5rem 2.5rem 2.5rem', maxWidth: '900px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          color: '#e6a03c',
          letterSpacing: '0.14em',
          marginBottom: '1rem',
          textTransform: 'uppercase',
          opacity: 0.7,
        }}>Vol. II · A Collaborative Fiction Engine</div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.8rem, 5vw, 4.5rem)',
          lineHeight: 1.05,
          color: '#f6f2ee',
          marginBottom: '1.25rem',
          letterSpacing: '-0.01em',
        }}>
          Every voice<br />
          <span style={{ color: '#e6a03c' }}>forges</span> the canon.
        </h1>

        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '1.05rem',
          color: '#9ca3af',
          maxWidth: '520px',
          lineHeight: 1.65,
          fontWeight: 400,
        }}>
          A storyworld is never finished. Contributors submit scenes. Stewards review them. The strongest become canon. The rest become alternate paths. All of it is literature.
        </p>
      </header>

      {/* Amber rule */}
      <div style={{
        margin: '0 2.5rem',
        height: '1px',
        background: 'linear-gradient(90deg, #e6a03c55, #e6a03c22, transparent)',
        marginBottom: '2rem',
      }} />

      {/* Story cards */}
      <section style={{ padding: '0 2.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6rem',
          letterSpacing: '0.12em',
          color: '#e6a03c',
          textTransform: 'uppercase',
          marginBottom: '0.5rem',
          opacity: 0.6,
        }}>§ Active Submissions — The Unmapped Interior</div>

        {stories.map(s => {
          const ss = stateStyle(s.stateCode);
          return (
            <div key={s.id} style={{
              background: 'rgba(24,31,38,0.8)',
              border: '1px solid rgba(230,160,60,0.1)',
              borderLeft: `3px solid ${s.stateCode === 'CANON' ? '#e6a03c' : s.stateCode === 'REVIEW' ? '#c46a2c' : '#5b3a2755'}`,
              borderRadius: '4px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              transition: 'border-color 150ms ease',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: '#e6a03c55',
                minWidth: '3.5rem',
                letterSpacing: '0.06em',
              }}>{s.id}</span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.95rem',
                  color: '#f6f2ee',
                  marginBottom: '0.2rem',
                  letterSpacing: '0.01em',
                }}>{s.title}</div>
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.72rem',
                  color: '#6b7280',
                }}>by {s.author} · {s.world}</div>
              </div>

              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                letterSpacing: '0.08em',
                color: ss.color,
                background: ss.bg,
                border: `1px solid ${ss.border}`,
                padding: '3px 10px',
                borderRadius: '2px',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>{s.state}</span>
            </div>
          );
        })}
      </section>

      {/* Footer folio */}
      <footer style={{
        position: 'absolute',
        bottom: '1.5rem',
        left: '2.5rem',
        right: '2.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid rgba(230,160,60,0.08)',
        paddingTop: '1rem',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6rem',
          color: '#6b7280',
          letterSpacing: '0.08em',
        }}>Built by&nbsp;<span style={{ color: '#e6a03c' }}>OverKill&nbsp;Hill&nbsp;P³</span></span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6rem',
          color: '#6b7280',
          letterSpacing: '0.08em',
        }}>© 2026 · overkillhill.com</span>
      </footer>
    </div>
  );
}
