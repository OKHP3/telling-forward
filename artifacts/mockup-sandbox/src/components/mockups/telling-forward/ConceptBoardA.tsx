import { GrammarField, NucleusCard, StatusPill } from "./_shared";

export function ConceptBoardA() {
  return <main className="tf-frame tf-grid relative min-h-[520px] p-7"><GrammarField />
    <header className="relative z-10 flex items-end justify-between"><div><div className="tf-mono mb-2 text-[9px] uppercase tracking-[.18em] text-[#5B3A27]">the long return / concept board</div><h1 className="tf-display text-[25px] text-[#1C3A34]">Gathering field</h1></div><div className="flex gap-2"><button className="tf-button rounded-full bg-[#1C3A34] px-3 py-2 text-[10px] text-[#F6F2EE]">+ Capsule</button><button className="tf-button rounded-full border border-[#1C3A34]/30 px-3 py-2 text-[10px] text-[#1C3A34]">Mature</button></div></header>
    <div className="relative z-10 mt-8 grid grid-cols-3 gap-4"><NucleusCard title="Departure" detail="The train leaves before the goodbye is finished." tone="#1C3A34" /><div className="mt-7"><NucleusCard title="Window light" detail="Every apartment keeps a different hour." tone="#E6A03C" /></div><div className="mt-14"><NucleusCard title="Return signal" detail="A yellow coat appears where it should not." tone="#C46A2C" /></div></div>
    <div className="relative z-10 mt-7 flex items-center gap-3"><StatusPill tone="amber">3 capsules linked</StatusPill><span className="text-[10px] text-[#2A2320]/55">Bonds show relationship, not sequence.</span></div>
  </main>;
}