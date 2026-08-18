import './_group.css';

const entries = [
  { id: '01', title: 'The Cartographer Who Forgot North', author: 'riv_thread', state: 'CANON', tint: '#b85c38' },
  { id: '02', title: 'A Letter Written in Three Languages', author: 'solenne_m', state: 'IN REVIEW', tint: '#3d6b73' },
  { id: '03', title: 'What the Lighthouse Keeper Heard', author: 'vex_palimps', state: 'RETURNED', tint: '#8b8178' },
];

const nav = ['Storyworlds', 'Submissions', 'Archive'];

export default function CivicArchive() {
  const ink = '#223038';
  const mist = '#eef2f0';
  const paper = '#f7f8f4';
  const line = '#d5dfdb';
  const coral = '#b85c38';

  return (
    <main style={{ minHeight: '100vh', background: paper, color: ink, fontFamily: 'DM Sans, sans-serif', padding: '0 2.5rem', overflow: 'hidden' }}>
      <nav style={{ height: '4.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '2.3rem', height: '2.3rem', border: `1px solid ${ink}`, display: 'grid', placeItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '.68rem', letterSpacing: '-.08em' }}>TF/</div>
          <span style={{ fontFamily: 'Alfa Slab One, serif', fontSize: '1.15rem', letterSpacing: '.01em' }}>Telling Forward</span>
        </div>
        <div style={{ display: 'flex', gap: '1.7rem', alignItems: 'center' }}>
          {nav.map((item, i) => (
            <button key={item} type="button" onClick={() => window.alert(`${item} index`)} style={{ border: 0, background: 'transparent', color: i === 0 ? coral : '#66767a', fontSize: '.68rem', letterSpacing: '.11em', textTransform: 'uppercase', cursor: 'pointer', padding: '.45rem 0' }}>
              {item}
            </button>
          ))}
          <button type="button" onClick={() => window.alert('Sign in')} style={{ background: ink, color: paper, border: 0, padding: '.65rem .9rem', fontSize: '.68rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Sign in</button>
        </div>
      </nav>

      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: '4rem', padding: '4rem 0 3rem', borderBottom: `1px solid ${line}` }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', color: coral, fontSize: '.63rem', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: '1.35rem' }}>A living archive · volume 02</div>
          <h1 style={{ fontFamily: 'Alfa Slab One, serif', fontWeight: 400, fontSize: 'clamp(2.6rem, 6vw, 5rem)', lineHeight: 1.02, letterSpacing: '-.035em', maxWidth: '690px', marginBottom: '1.5rem' }}>
            The story is<br /><span style={{ color: coral }}>still moving.</span>
          </h1>
          <p style={{ fontSize: '1rem', lineHeight: 1.7, color: '#596b6f', maxWidth: '500px' }}>
            Telling Forward is a public record of worlds built by many hands. Read the canon, follow the margins, and leave a door open for the next voice.
          </p>
        </div>
        <aside style={{ alignSelf: 'end', background: mist, border: `1px solid ${line}`, padding: '1.35rem 1.5rem' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', color: coral, fontSize: '.6rem', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: '1rem' }}>Current record</div>
          {[['Active storyworlds', '08'], ['Contributors this month', '47'], ['Canon scenes', '118'], ['Alternate paths', '263']].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '.65rem 0', borderBottom: `1px solid ${line}` }}>
              <span style={{ fontSize: '.78rem', color: '#68797b' }}>{label}</span>
              <strong style={{ fontFamily: 'Alfa Slab One, serif', fontSize: '1.25rem', fontWeight: 400 }}>{value}</strong>
            </div>
          ))}
        </aside>
      </section>

      <section style={{ padding: '2rem 0 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', color: coral, fontSize: '.62rem', letterSpacing: '.14em', textTransform: 'uppercase' }}>Latest dispatches / The Unmapped Interior</div>
          <button type="button" onClick={() => window.alert('Opening all dispatches')} style={{ border: 0, borderBottom: `1px solid ${coral}`, background: 'transparent', color: coral, fontSize: '.7rem', padding: '0 0 .2rem', cursor: 'pointer' }}>View all →</button>
        </div>
        <div style={{ borderTop: `2px solid ${ink}` }}>
          {entries.map((entry) => (
            <button key={entry.id} type="button" onClick={() => window.alert(`Opening ${entry.title}`)} style={{ width: '100%', display: 'grid', gridTemplateColumns: '3.5rem 1fr auto', gap: '1rem', alignItems: 'center', textAlign: 'left', border: 0, borderBottom: `1px solid ${line}`, background: 'transparent', padding: '1.25rem .2rem', cursor: 'pointer' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#91a19f', fontSize: '.68rem' }}>{entry.id} /</span>
              <span>
                <span style={{ display: 'block', fontFamily: 'Alfa Slab One, serif', fontWeight: 400, fontSize: '1rem', color: ink, marginBottom: '.25rem' }}>{entry.title}</span>
                <span style={{ fontSize: '.72rem', color: '#718183' }}>by {entry.author} · The Unmapped Interior</span>
              </span>
              <span style={{ color: entry.tint, border: `1px solid ${entry.tint}66`, padding: '.35rem .55rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '.58rem', letterSpacing: '.08em', whiteSpace: 'nowrap' }}>{entry.state}</span>
            </button>
          ))}
        </div>
      </section>

      <footer style={{ display: 'flex', justifyContent: 'space-between', padding: '2.2rem 0 1.2rem', color: '#879594', fontFamily: 'JetBrains Mono, monospace', fontSize: '.58rem', letterSpacing: '.06em' }}>
        <span><span style={{ color: coral }}>TF/02</span> · A collaborative fiction engine</span>
        <span>OverKill Hill P³ · 2026</span>
      </footer>
      <style>{`@media(max-width:700px){main{padding:0 1.25rem!important}nav{height:auto!important;padding:1.2rem 0;align-items:flex-start!important;gap:1rem}nav>div:last-child{gap:.7rem!important;flex-wrap:wrap;justify-content:flex-end}nav button:nth-child(-n+2){display:none}section{grid-template-columns:1fr!important;gap:2rem!important;padding-top:2.5rem!important}aside{align-self:stretch!important}}`}</style>
    </main>
  );
}