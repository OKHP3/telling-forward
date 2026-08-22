import { BrandMark, GrammarField, NucleusCard, StatusPill } from "./_shared";

export function AuthorHomeA() {
  return <main className="tf-frame relative flex min-h-[520px]">
    <aside className="relative z-10 flex w-[150px] shrink-0 flex-col justify-between bg-[#1C3A34] p-5 text-[#F6F2EE]">
      <div><div className="mb-10 flex items-center gap-2"><BrandMark /><span className="tf-display text-[14px]">telling<br />forward</span></div>
        <nav className="space-y-2 text-[11px]"><div className="rounded-lg bg-[#C46A2C] px-3 py-2 font-bold">Storyworlds</div><div className="px-3 py-2 opacity-70">Write</div><div className="px-3 py-2 opacity-70">Concept Board</div><div className="px-3 py-2 opacity-70">Story Graph</div></nav>
      </div><div className="tf-mono text-[8px] uppercase tracking-[.12em] opacity-55">private pilot<br />steward space</div>
    </aside>
    <section className="relative flex-1 overflow-hidden p-7"><GrammarField />
      <div className="relative z-10 flex items-start justify-between"><div><div className="tf-mono mb-2 text-[9px] uppercase tracking-[.18em] text-[#5B3A27]">author workspace / 01</div><h1 className="tf-display text-[26px] leading-tight text-[#1C3A34]">Your story<br />worlds</h1><p className="mt-2 max-w-[280px] text-[11px] text-[#2A2320]/65">A quiet field for ideas becoming more than they were.</p></div><button className="tf-button rounded-full bg-[#C46A2C] px-3 py-2 text-[10px] font-bold text-[#F6F2EE]">+ New world</button></div>
      <div className="relative z-10 mt-8 grid grid-cols-2 gap-3"><NucleusCard title="The Long Return" detail="A city remembers the people who leave it." tone="#C46A2C" /><NucleusCard title="Small Weather" detail="A child learns to read the future in windows." tone="#E6A03C" /></div>
      <div className="relative z-10 mt-5 flex items-center justify-between border-t border-[#1C3A34]/15 pt-4"><StatusPill tone="amber">2 active paths</StatusPill><span className="text-[10px] text-[#2A2320]/55">last gathered today · 09:42</span></div>
    </section>
  </main>;
}