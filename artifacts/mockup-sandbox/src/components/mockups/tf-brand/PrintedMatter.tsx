import './_group.css';

const featuredWorld = {
  title: 'The Unmapped Interior',
  issue: 'Issue 07',
  stories: 41,
  contributors: 12,
  excerpt: 'A continent that rewrites itself each generation. Cartographers are mythologized. Maps are contraband. Three voices are reshaping its interior this season.',
};

const columns = [
  { heading: 'New Submissions', items: ['The Cartographer Who Forgot North', 'A Letter Written in Three Languages', 'What the Lighthouse Keeper Heard'] },
  { heading: 'Accepted into Canon', items: ['The Weight of Unnamed Rivers', 'First Light Over the Stillfields', 'A Record of Teeth and Promises'] },
  { heading: 'Alternate Paths', items: ['The Door That Opened Inward', 'Seventeen Names for Silence', 'Borderland Arithmetic'] },
];

export default function PrintedMatter() {
  return (
    <div style={{
      fontFamily: 'var(--font-body)',
      background: '#f6f2ee',
      color: '#2a2320',
      minHeight: '100vh',
      width: '100%',
      overflow: 'hidden',
    }}>
      {/* Masthead */}
      <header style={{
        borderBottom: '3px solid #2a2320',
        padding: '0.9rem 2.5rem 0.8rem',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.55rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#c46a2c',
            marginBottom: '0.2rem',
          }}>A Collaborative Fiction Engine · OverKill Hill P³</div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.6rem',
            lineHeight: 1,
            color: '#2a2320',
            letterSpacing: '-0.01em',
          }}>Telling Forward</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            color: '#6b7280',
            letterSpacing: '0.08em',
          }}>Vol. II · No. 7</div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            color: '#6b7280',
            letterSpacing: '0.08em',
          }}>August 2026</div>
        </div>
      </header>

      {/* Orange rule */}
      <div style={{ height: '3px', background: '#c46a2c', margin: '0' }} />
      <div style={{ height: '1px', background: '#2a232022', margin: '0 0 0 0' }} />

      {/* Feature story */}
      <section style={{
        padding: '1.75rem 2.5rem 1.5rem',
        borderBottom: '1px solid #2a232022',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2.5rem',
        alignItems: 'start',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.58rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#c46a2c',
            marginBottom: '0.6rem',
            borderLeft: '2px solid #c46a2c',
            paddingLeft: '0.6rem',
          }}>Featured Storyworld — {featuredWorld.issue}</div>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.9rem',
            lineHeight: 1.1,
            color: '#2a2320',
            marginBottom: '0.9rem',
            letterSpacing: '-0.005em',
          }}>{featuredWorld.title}</h2>

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.88rem',
            lineHeight: 1.7,
            color: '#4b4035',
          }}>{featuredWorld.excerpt}</p>
        </div>

        {/* Stats block */}
        <div style={{
          background: '#ede8e2',
          border: '1px solid #d4cfc9',
          padding: '1.25rem',
          borderRadius: '2px',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.55rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#c46a2c',
            marginBottom: '1rem',
          }}>Editorial Record</div>

          {[
            ['Active Submissions', featuredWorld.stories],
            ['Contributors', featuredWorld.contributors],
            ['Canon Stories', 18],
            ['Alternate Paths', 23],
          ].map(([label, val]) => (
            <div key={String(label)} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderBottom: '1px solid #d4cfc9',
              padding: '0.4rem 0',
            }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#6b7280' }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: '#2a2320' }}>{val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Three-column index */}
      <section style={{
        padding: '1.5rem 2.5rem',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '0',
        borderBottom: '1px solid #2a232022',
      }}>
        {columns.map((col, i) => (
          <div key={col.heading} style={{
            paddingRight: i < 2 ? '2rem' : 0,
            borderRight: i < 2 ? '1px solid #d4cfc9' : 'none',
            paddingLeft: i > 0 ? '2rem' : 0,
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.55rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#c46a2c',
              marginBottom: '0.75rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid #c46a2c44',
            }}>{col.heading}</div>
            {col.items.map(item => (
              <div key={item} style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.8rem',
                color: '#2a2320',
                padding: '0.35rem 0',
                borderBottom: '1px dotted #d4cfc9',
                lineHeight: 1.35,
              }}>{item}</div>
            ))}
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer style={{
        padding: '0.8rem 2.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#9ca3af', letterSpacing: '0.08em' }}>
          Built by <span style={{ color: '#c46a2c' }}>OverKill&nbsp;Hill&nbsp;P³</span> · overkillhill.com
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#9ca3af', letterSpacing: '0.08em' }}>
          Telling Forward © 2026
        </span>
      </footer>
    </div>
  );
}
