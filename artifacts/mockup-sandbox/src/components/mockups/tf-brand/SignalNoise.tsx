import './_group.css';

const STATES = [
  { code: 'DRAFT',      label: 'Draft',               color: '#6b7280', dot: '#374151' },
  { code: 'SUBMITTED',  label: 'Awaiting Review',      color: '#c46a2c', dot: '#c46a2c' },
  { code: 'IN_REVIEW',  label: 'Under Review',         color: '#e6a03c', dot: '#e6a03c' },
  { code: 'RETURNED',   label: 'Returned with Notes',  color: '#9ca3af', dot: '#9ca3af' },
  { code: 'ACCEPTED',   label: 'Accepted into Canon',  color: '#1c3a34', dot: '#34d399' },
  { code: 'PUBLISHED',  label: 'Published Alt. Path',  color: '#5b3a27', dot: '#818cf8' },
];

const submissions = [
  { ref: 'TF-2026-0041', title: 'The Cartographer Who Forgot North', author: 'riv_thread', world: 'UNMAPPED_INTERIOR', state: 'ACCEPTED',  ts: '2026-08-17T09:12Z' },
  { ref: 'TF-2026-0042', title: 'A Letter Written in Three Languages', author: 'solenne_m', world: 'UNMAPPED_INTERIOR', state: 'IN_REVIEW', ts: '2026-08-17T11:47Z' },
  { ref: 'TF-2026-0043', title: 'What the Lighthouse Keeper Heard', author: 'vex_palimps', world: 'SIGNAL_REEF',        state: 'RETURNED',  ts: '2026-08-18T00:03Z' },
  { ref: 'TF-2026-0044', title: 'Seventeen Names for Silence', author: 'mar_k_ellum', world: 'SIGNAL_REEF',             state: 'SUBMITTED', ts: '2026-08-18T01:31Z' },
];

const StateChip = ({ code }: { code: string }) => {
  const s = STATES.find(s => s.code === code) ?? STATES[0];
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '0.58rem',
      letterSpacing: '0.08em',
      color: s.dot,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      background: `${s.dot}14`,
      border: `1px solid ${s.dot}44`,
      padding: '2px 8px',
      borderRadius: '2px',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, display: 'inline-block', flexShrink: 0 }} />
      {s.code}
    </span>
  );
};

const Corner = ({ pos }: { pos: 'tl'|'tr'|'bl'|'br' }) => {
  const top    = pos.startsWith('t') ? 0 : undefined;
  const bottom = pos.startsWith('b') ? 0 : undefined;
  const left   = pos.endsWith('l') ? 0 : undefined;
  const right  = pos.endsWith('r') ? 0 : undefined;
  return (
    <div style={{
      position: 'absolute',
      top, bottom, left, right,
      width: 10, height: 10,
      borderTop:    (pos.startsWith('t')) ? '1px solid #c46a2c66' : undefined,
      borderBottom: (pos.startsWith('b')) ? '1px solid #c46a2c66' : undefined,
      borderLeft:   (pos.endsWith('l'))   ? '1px solid #c46a2c66' : undefined,
      borderRight:  (pos.endsWith('r'))   ? '1px solid #c46a2c66' : undefined,
    }} />
  );
};

export default function SignalNoise() {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      background: '#0d1117',
      color: '#e5e7eb',
      minHeight: '100vh',
      width: '100%',
      overflow: 'hidden',
    }}>
      {/* System header bar */}
      <div style={{
        background: '#1c3a34',
        borderBottom: '1px solid #c46a2c55',
        padding: '0.6rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.95rem',
            color: '#e6a03c',
            letterSpacing: '0.03em',
          }}>TF</span>
          <span style={{ color: '#c46a2c44', fontSize: '0.7rem' }}>│</span>
          <span style={{ fontSize: '0.65rem', color: '#9ca3af', letterSpacing: '0.1em' }}>
            TELLING_FORWARD&nbsp;&nbsp;//&nbsp;&nbsp;v2.1.0
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', color: '#34d399', letterSpacing: '0.1em' }}>● ONLINE</span>
          <span style={{ fontSize: '0.6rem', color: '#6b7280', letterSpacing: '0.08em' }}>
            2026-08-18T01:57:43Z
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', height: 'calc(100vh - 40px)' }}>
        {/* Sidebar */}
        <aside style={{
          borderRight: '1px solid #c46a2c22',
          background: '#0d1117',
          padding: '1.25rem 0',
        }}>
          <div style={{ padding: '0 1.25rem 0.75rem', fontSize: '0.55rem', color: '#c46a2c', letterSpacing: '0.14em', textTransform: 'uppercase', borderBottom: '1px solid #c46a2c22', marginBottom: '0.5rem' }}>
            State Protocol
          </div>
          {STATES.map(s => (
            <div key={s.code} style={{
              padding: '0.5rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '0.65rem',
              color: '#9ca3af',
              borderLeft: '2px solid transparent',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0, boxShadow: `0 0 4px ${s.dot}` }} />
              <span style={{ color: s.dot, letterSpacing: '0.06em' }}>{s.code}</span>
            </div>
          ))}

          <div style={{ padding: '1rem 1.25rem 0.5rem', fontSize: '0.55rem', color: '#c46a2c', letterSpacing: '0.14em', textTransform: 'uppercase', borderTop: '1px solid #c46a2c22', marginTop: '0.75rem' }}>
            Systems
          </div>
          {['WORLDS', 'SUBMISSIONS', 'CANON_LOG', 'STEWARD_QUEUE'].map(item => (
            <div key={item} style={{
              padding: '0.4rem 1.25rem',
              fontSize: '0.62rem',
              color: '#6b7280',
              letterSpacing: '0.06em',
            }}>_ {item}</div>
          ))}
        </aside>

        {/* Main panel */}
        <main style={{ padding: '1.5rem 2rem', overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.55rem', color: '#c46a2c', letterSpacing: '0.14em', marginBottom: '0.4rem' }}>
              // SUBMISSION_QUEUE → ACTIVE
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.6rem',
                color: '#e5e7eb',
                letterSpacing: '0.01em',
              }}>Story&nbsp;Submissions</h1>
              <span style={{
                fontSize: '0.6rem',
                color: '#9ca3af',
                background: '#111827',
                border: '1px solid #374151',
                padding: '2px 8px',
                borderRadius: '2px',
              }}>{submissions.length} active</span>
            </div>
          </div>

          {/* Submission rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {submissions.map(sub => (
              <div key={sub.ref} style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '3px',
                padding: '0.9rem 1.1rem',
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: '6rem 1fr auto',
                gap: '1rem',
                alignItems: 'center',
              }}>
                <Corner pos="tl" />
                <Corner pos="br" />

                <span style={{ fontSize: '0.6rem', color: '#374151', letterSpacing: '0.06em' }}>{sub.ref}</span>

                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.9rem',
                    color: '#e5e7eb',
                    marginBottom: '0.2rem',
                  }}>{sub.title}</div>
                  <div style={{ fontSize: '0.6rem', color: '#6b7280', letterSpacing: '0.06em' }}>
                    @{sub.author}&nbsp;&nbsp;·&nbsp;&nbsp;{sub.world}&nbsp;&nbsp;·&nbsp;&nbsp;{sub.ts.replace('T', ' ')}
                  </div>
                </div>

                <StateChip code={sub.state} />
              </div>
            ))}
          </div>

          {/* OKH footer */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '1rem',
            borderTop: '1px solid #c46a2c22',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.58rem',
            color: '#374151',
            letterSpacing: '0.08em',
          }}>
            <span>// Built&nbsp;by&nbsp;<span style={{ color: '#c46a2c' }}>OverKill&nbsp;Hill&nbsp;P³</span>&nbsp;·&nbsp;overkillhill.com</span>
            <span>Telling&nbsp;Forward&nbsp;©&nbsp;2026</span>
          </div>
        </main>
      </div>
    </div>
  );
}
