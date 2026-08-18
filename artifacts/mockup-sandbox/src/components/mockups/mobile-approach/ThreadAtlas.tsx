import { useState, type CSSProperties } from 'react';

type Thread = {
  id: string;
  title: string;
  world: string;
  excerpt: string;
  color: string;
  progress?: number;
  listeners: string;
};

const threads: Thread[] = [
  {
    id: 'north',
    title: 'The Cartographer Who Forgot North',
    world: 'THE UNMAPPED INTERIOR',
    excerpt: 'At the edge of the map, a compass begins to remember a different country.',
    color: '#de704f',
    progress: 62,
    listeners: '8 voices',
  },
  {
    id: 'lighthouse',
    title: 'What the Lighthouse Keeper Heard',
    world: 'SIGNAL REEF',
    excerpt: 'The fog has lifted. Something is still speaking from beneath the tide.',
    color: '#9db9a5',
    listeners: '14 voices',
  },
  {
    id: 'letter',
    title: 'A Letter Written in Three Languages',
    world: 'THE UNMAPPED INTERIOR',
    excerpt: 'Read the same goodbye three ways, and decide which one sounds true.',
    color: '#d2a45d',
    listeners: '5 voices',
  },
];

export default function ThreadAtlas() {
  const [active, setActive] = useState('north');
  const [tab, setTab] = useState<'home' | 'library' | 'voice'>('home');
  const [saved, setSaved] = useState<string[]>(['north']);
  const [recording, setRecording] = useState(false);
  const current = threads.find((thread) => thread.id === active) ?? threads[0];

  const toggleSaved = (id: string) => {
    setSaved((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  };

  return (
    <main style={styles.shell}>
      <div style={styles.grain} />
      <header style={styles.header}>
        <div style={styles.brandMark}>TF</div>
        <div style={{ flex: 1 }}>
          <div style={styles.eyebrow}>TELLING FORWARD</div>
          <div style={styles.headerTitle}>Your story atlas</div>
        </div>
        <button style={styles.profile} aria-label="Open profile">RN</button>
      </header>

      <section style={styles.intro}>
        <div style={styles.kicker}>THURSDAY, AUGUST 22</div>
        <h1 style={styles.hero}>Follow a<br /><em>living thread.</em></h1>
        <p style={styles.heroCopy}>Stories grow where readers leave a little of themselves behind.</p>
      </section>

      {tab === 'home' && (
        <>
          <section style={styles.continueCard}>
            <div style={styles.cardLabel}>CONTINUE READING <span>02 / 06</span></div>
            <div style={styles.continueLine}>
              <div style={{ ...styles.orb, background: current.color }} />
              <div style={{ flex: 1 }}>
                <div style={styles.world}>{current.world}</div>
                <div style={styles.cardTitle}>{current.title}</div>
              </div>
              <button style={styles.roundButton} onClick={() => setActive(current.id)} aria-label="Continue reading">→</button>
            </div>
            <div style={styles.progressTrack}><div style={{ ...styles.progressBar, width: `${current.progress ?? 18}%`, background: current.color }} /></div>
            <div style={styles.progressMeta}><span>{current.progress ? `${current.progress}% explored` : 'Begin a new path'}</span><span>{current.listeners}</span></div>
          </section>

          <div style={styles.sectionHead}>
            <div><div style={styles.kicker}>THE LIBRARY</div><h2 style={styles.sectionTitle}>Choose your next<br /><em>way in.</em></h2></div>
            <button style={styles.textButton} onClick={() => setTab('library')}>See all <span>↗</span></button>
          </div>

          <section style={styles.threadList}>
            {threads.map((thread, index) => (
              <div
                key={thread.id}
                onClick={() => setActive(thread.id)}
                role="button"
                tabIndex={0}
                style={{ ...styles.thread, borderColor: active === thread.id ? `${thread.color}88` : '#293538' }}
              >
                <div style={{ ...styles.threadNumber, color: thread.color }}>0{index + 1}</div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={styles.world}>{thread.world}</div>
                  <div style={styles.threadTitle}>{thread.title}</div>
                  <div style={styles.excerpt}>{thread.excerpt}</div>
                </div>
                <button
                  onClick={(event) => { event.stopPropagation(); toggleSaved(thread.id); }}
                  style={{ ...styles.save, color: saved.includes(thread.id) ? thread.color : '#7c8a87' }}
                  aria-label="Save story"
                >
                  {saved.includes(thread.id) ? '●' : '＋'}
                </button>
              </div>
            ))}
          </section>
        </>
      )}

      {tab === 'library' && (
        <section style={styles.libraryPanel}>
          <div style={styles.kicker}>YOUR MARKS</div>
          <h2 style={styles.sectionTitle}>Saved <em>threads.</em></h2>
          <p style={styles.heroCopy}>A quiet shelf for the stories you are not ready to leave.</p>
          {threads.filter((thread) => saved.includes(thread.id)).map((thread) => (
            <button key={thread.id} style={styles.savedRow} onClick={() => { setActive(thread.id); setTab('home'); }}>
              <div style={{ ...styles.orbSmall, background: thread.color }} />
              <span style={styles.threadTitle}>{thread.title}</span><span style={styles.arrow}>→</span>
            </button>
          ))}
        </section>
      )}

      {tab === 'voice' && (
        <section style={styles.voicePanel}>
          <div style={styles.kicker}>LEAVE A TRACE</div>
          <h2 style={styles.sectionTitle}>Add your<br /><em>voice.</em></h2>
          <p style={styles.heroCopy}>Choose a thread, then answer the question it leaves open.</p>
          <div style={styles.prompt}><span style={styles.world}>PROMPT FROM {current.world}</span><strong>What changes when the character looks back?</strong></div>
          <button onClick={() => setRecording(!recording)} style={{ ...styles.recordButton, borderColor: recording ? '#de704f' : '#718b7b' }}>
            <span style={{ ...styles.recordDot, background: recording ? '#de704f' : '#9db9a5' }} />{recording ? 'Recording your scene' : 'Hold to narrate'}
          </button>
        </section>
      )}

      <nav style={styles.nav}>
        {[
          ['home', 'Atlas', '⌂'],
          ['library', 'Saved', '◫'],
          ['voice', 'Narrate', '◉'],
        ].map(([key, label, glyph]) => (
          <button key={key} onClick={() => setTab(key as typeof tab)} style={{ ...styles.navItem, color: tab === key ? '#e6c486' : '#71807b' }}>
            <span style={styles.navGlyph}>{glyph}</span><span>{label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: { minHeight: '100vh', background: '#172526', color: '#e9e3d5', fontFamily: 'Georgia, serif', position: 'relative', overflow: 'hidden', paddingBottom: 84 },
  grain: { position: 'absolute', inset: 0, opacity: .08, pointerEvents: 'none', backgroundImage: 'radial-gradient(#d8c9a4 0.7px, transparent 0.7px)', backgroundSize: '8px 8px' },
  header: { display: 'flex', alignItems: 'center', gap: 13, padding: '23px 22px 12px', borderBottom: '1px solid #304244', position: 'relative' },
  brandMark: { width: 31, height: 31, border: '1px solid #c99e5e', borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#e6c486', fontSize: 11, fontWeight: 700, letterSpacing: 1 },
  eyebrow: { fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 8, letterSpacing: 2.1, color: '#9eb3a7', marginBottom: 4 },
  headerTitle: { fontSize: 16, letterSpacing: -.2 },
  profile: { border: '1px solid #53665c', background: 'transparent', color: '#d8c9a4', width: 31, height: 31, borderRadius: '50%', fontSize: 9 },
  intro: { padding: '30px 22px 25px', position: 'relative' },
  kicker: { fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 8, letterSpacing: 1.9, color: '#9eb3a7' },
  hero: { fontSize: 38, lineHeight: .98, fontWeight: 400, letterSpacing: -1.3, margin: '14px 0 13px' },
  heroCopy: { color: '#aab5a9', lineHeight: 1.55, fontSize: 13, margin: 0, maxWidth: 290 },
  continueCard: { margin: '0 16px 28px', background: '#223536', border: '1px solid #4a5b52', borderRadius: 4, padding: 16, boxShadow: '0 9px 0 #122021' },
  cardLabel: { fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 8, letterSpacing: 1.5, color: '#d6b271', marginBottom: 15 },
  continueLine: { display: 'flex', alignItems: 'center', gap: 11 },
  orb: { width: 33, height: 33, borderRadius: '50%', boxShadow: 'inset -5px -4px 0 rgba(16,33,33,.3)' },
  world: { fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 8, letterSpacing: 1.15, color: '#9eb3a7', marginBottom: 5 },
  cardTitle: { fontSize: 16, lineHeight: 1.15, color: '#f2eadb' },
  roundButton: { background: '#d3a865', border: 0, color: '#1b2929', width: 35, height: 35, borderRadius: '50%', fontSize: 20 },
  progressTrack: { height: 3, background: '#38504d', margin: '18px 0 7px' },
  progressBar: { height: '100%' },
  progressMeta: { display: 'flex', justifyContent: 'space-between', color: '#85978d', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 8 },
  sectionHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'end', padding: '0 22px 13px' },
  sectionTitle: { fontWeight: 400, fontSize: 28, lineHeight: 1, margin: '9px 0 0', letterSpacing: -.7 },
  textButton: { background: 'transparent', border: 0, color: '#dfbd7e', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 10, paddingBottom: 4 },
  threadList: { padding: '0 16px', display: 'grid', gap: 8 },
  thread: { display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left', background: '#1b2c2d', border: '1px solid', borderRadius: 3, padding: '13px 11px', color: '#eee6d8', cursor: 'pointer' },
  threadNumber: { fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 10, paddingTop: 2 },
  threadTitle: { fontSize: 14, lineHeight: 1.2, color: '#eee6d8' },
  excerpt: { color: '#879890', fontSize: 11, lineHeight: 1.4, marginTop: 6 },
  save: { background: 'transparent', border: 0, fontSize: 15, padding: 0 },
  libraryPanel: { padding: '20px 22px' },
  savedRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 0, borderBottom: '1px solid #304244', color: '#e9e3d5', padding: '17px 0', textAlign: 'left' },
  orbSmall: { width: 17, height: 17, borderRadius: '50%' },
  arrow: { marginLeft: 'auto', color: '#d3a865' },
  voicePanel: { padding: '20px 22px' },
  prompt: { marginTop: 26, padding: 16, borderLeft: '2px solid #d3a865', background: '#203132', display: 'grid', gap: 9 },
  recordButton: { marginTop: 25, borderWidth: 1, borderStyle: 'solid', background: 'transparent', color: '#e9e3d5', padding: '15px 17px', width: '100%', textAlign: 'left', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 10, letterSpacing: 1 },
  recordDot: { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', marginRight: 10 },
  nav: { position: 'fixed', bottom: 0, left: 0, right: 0, height: 70, background: '#152324ee', borderTop: '1px solid #3a4c49', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 5 },
  navItem: { border: 0, background: 'transparent', display: 'grid', gap: 4, justifyItems: 'center', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 9 },
  navGlyph: { fontSize: 19, lineHeight: 1 },
};