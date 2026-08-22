import "./_shared.css";

export function BrandMark({ warm = false }: { warm?: boolean }) {
  return (
    <div className="relative h-9 w-9" aria-label="Telling Forward mark">
      <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: warm ? "#E6A03C" : "#C46A2C" }} />
      <span className="absolute left-1/2 top-0 h-5 w-px origin-bottom rotate-[-32deg]" style={{ background: "#1C3A34" }} />
      <span className="absolute bottom-0 left-1/2 h-5 w-px origin-top rotate-[32deg]" style={{ background: "#1C3A34" }} />
      <span className="absolute left-0 top-1/2 h-px w-5 origin-left rotate-[-18deg]" style={{ background: "#1C3A34" }} />
    </div>
  );
}

export function GrammarField({ expressive = false }: { expressive?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden="true">
      <span className="tf-bond" style={{ left: "8%", top: "24%", width: "33%", transform: "rotate(18deg)" }} />
      <span className="tf-bond" style={{ left: "49%", top: "38%", width: "30%", transform: "rotate(-22deg)" }} />
      <span className="tf-strand" style={{ left: "4%", top: "70%", width: "90%", transform: "rotate(-7deg)" }} />
      <i className="tf-nucleus absolute left-[10%] top-[20%] h-3 w-3" style={{ background: "#1C3A34" }} />
      <i className={`tf-nucleus absolute left-[47%] top-[34%] h-4 w-4 ${expressive ? "tf-pulse" : ""}`} style={{ background: "#E6A03C" }} />
      <i className="tf-fragment absolute right-[13%] top-[22%] h-3 w-3" style={{ background: "#C46A2C" }} />
      <i className="tf-fragment absolute bottom-[22%] left-[20%] h-2 w-2" style={{ background: "#5B3A27" }} />
    </div>
  );
}

export function StatusPill({ children, tone = "teal" }: { children: React.ReactNode; tone?: "teal" | "orange" | "amber" }) {
  const colors = { teal: ["#1C3A34", "#F6F2EE"], orange: ["#C46A2C", "#F6F2EE"], amber: ["#E6A03C", "#2A2320"] };
  const [bg, fg] = colors[tone];
  return <span className="tf-mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.14em]" style={{ background: bg, color: fg }}>{children}</span>;
}

export function NucleusCard({ title, detail, tone = "#1C3A34" }: { title: string; detail: string; tone?: string }) {
  return <div className="relative rounded-2xl border border-[#1C3A34]/15 bg-[#F6F2EE]/90 p-4 shadow-[0_8px_20px_rgba(42,35,32,.08)]">
    <div className="mb-3 flex items-center gap-2"><span className="tf-nucleus h-3 w-3 shrink-0" style={{ background: tone }} /><span className="text-[11px] font-bold uppercase tracking-[.12em]">{title}</span></div>
    <p className="text-[12px] leading-relaxed text-[#2A2320]/75">{detail}</p>
    <span className="tf-mono mt-3 block text-[8px] uppercase tracking-[.12em] text-[#5B3A27]/65">recoverable fragment</span>
  </div>;
}