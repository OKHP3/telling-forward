import { Link } from 'wouter';
import { useListStoryworlds, getListStoryworldsQueryKey } from '@workspace/api-client-react';

export default function Discovery() {
  const { data: worlds, isLoading } = useListStoryworlds({ query: { queryKey: getListStoryworldsQueryKey() } });

  return (
    <div className="max-w-[900px] w-full mx-auto">
      <header className="pt-14 px-6 md:px-10 pb-10">
        <div className="font-mono text-[0.65rem] text-primary tracking-[0.14em] mb-4 uppercase opacity-70">Vol. II · A Collaborative Fiction Engine</div>
        <h1 className="font-serif text-[clamp(2.8rem,5vw,4.5rem)] leading-[1.05] text-[#f6f2ee] mb-5 tracking-[-0.01em]">
          Every voice<br />
          <span className="text-primary">forges</span> the canon.
        </h1>
        <p className="font-sans text-[1.05rem] text-muted-foreground max-w-[520px] leading-[1.65] font-normal">
          A storyworld is never finished. Contributors submit scenes. Stewards review them. The strongest become canon. The rest become alternate paths. All of it is literature.
        </p>
      </header>

      <div className="mx-6 md:mx-10 h-px bg-gradient-to-r from-primary/30 via-primary/10 to-transparent mb-8" />

      <section className="px-6 md:px-10 flex flex-col gap-3">
        <div className="font-mono text-[0.6rem] tracking-[0.12em] text-primary uppercase mb-2 opacity-60">§ Active Storyworlds</div>
        
        {isLoading ? (
           <div className="text-muted-foreground font-mono text-xs">Loading volumes...</div>
        ) : worlds?.length === 0 ? (
           <div className="text-primary/60 font-mono text-xs tracking-wider border border-primary/10 bg-card/40 p-8 rounded text-center">No active storyworlds found.</div>
        ) : (
          worlds?.map(w => (
            <Link key={w.id} href={`/worlds/${w.id}`} className="block group">
              <div className="bg-card/80 border border-primary/10 border-l-[3px] border-l-muted-foreground/30 rounded px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 transition-colors duration-150 hover:border-primary/40">
                <span className="font-mono text-[0.65rem] text-primary/50 min-w-[3.5rem] tracking-wider">§ {String(w.id).padStart(3, '0')}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-[0.95rem] text-[#f6f2ee] mb-1 tracking-[0.01em] truncate">{w.title}</div>
                  <div className="font-sans text-[0.72rem] text-muted-foreground/80 truncate">{w.seed || "A collaborative storyworld"}</div>
                </div>
                <span className="font-mono text-[0.6rem] tracking-widest text-muted-foreground uppercase whitespace-nowrap group-hover:text-primary transition-colors sm:self-center self-start">Read →</span>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
