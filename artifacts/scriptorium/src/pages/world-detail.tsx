import { Link, useParams } from 'wouter';
import { useGetStoryworld, useListStoryPaths, getGetStoryworldQueryKey, getListStoryPathsQueryKey } from '@workspace/api-client-react';
import { ArrowLeft } from 'lucide-react';

export default function WorldDetail() {
  const params = useParams();
  const id = Number(params.worldId);
  const { data: world, isLoading: isWorldLoading } = useGetStoryworld(id, { query: { enabled: !!id, queryKey: getGetStoryworldQueryKey(id) } });
  const { data: paths, isLoading: isPathsLoading } = useListStoryPaths(id, { query: { enabled: !!id, queryKey: getListStoryPathsQueryKey(id) } });

  if (isWorldLoading || isPathsLoading) return <div className="p-10 font-mono text-muted-foreground max-w-[900px] mx-auto w-full">Loading § {String(id).padStart(3, '0')}...</div>;
  if (!world) return <div className="p-10 font-mono text-muted-foreground max-w-[900px] mx-auto w-full">World not found.</div>;

  const canonPaths = paths?.filter(p => p.state === 'open') || [];
  const altPaths = paths?.filter(p => p.state === 'published-alternate') || [];
  const devPaths = paths?.filter(p => p.state === 'personal' || p.state === 'proposed') || [];

  const PathCard = ({ p, type }: { p: any, type: 'canon' | 'alternate' | 'dev' }) => {
    let stateStyle = "";
    let borderStyle = "";
    
    if (type === 'canon') {
       stateStyle = "text-primary bg-[#1c3a34] border-[#e6a03c55]";
       borderStyle = "border-l-primary";
    } else if (type === 'alternate') {
       stateStyle = "text-[#c46a2c] bg-[#2a2320] border-[#c46a2c55]";
       borderStyle = "border-l-[#c46a2c]";
    } else {
       stateStyle = "text-muted-foreground bg-[#1a1215] border-muted-foreground/30";
       borderStyle = "border-l-muted-foreground/30";
    }

    return (
      <Link href={`/worlds/${world.id}/paths/${p.id}`} className="block group">
        <div className={`bg-card/80 border border-primary/10 border-l-[3px] ${borderStyle} rounded px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 transition-colors duration-150 hover:border-primary/40`}>
          <span className="font-mono text-[0.65rem] text-primary/50 min-w-[3.5rem] tracking-wider">§ {String(p.id).padStart(3, '0')}</span>
          <div className="flex-1 min-w-0">
            <div className="font-serif text-[0.95rem] text-[#f6f2ee] mb-1 tracking-[0.01em] truncate">{p.title}</div>
            <div className="font-sans text-[0.72rem] text-muted-foreground/80 truncate">Ref: {p.branchRef}</div>
          </div>
          <span className={`font-mono text-[0.6rem] tracking-[0.08em] border px-2.5 py-[3px] rounded-sm uppercase whitespace-nowrap self-start sm:self-center ${stateStyle}`}>
            {type === 'canon' ? 'CANON' : type === 'alternate' ? 'ALTERNATE' : 'IN DEV'}
          </span>
        </div>
      </Link>
    );
  };

  return (
    <div className="max-w-[900px] w-full mx-auto">
      <header className="pt-10 px-6 md:px-10 pb-6">
        <Link href="/" className="inline-flex items-center gap-2 font-mono text-[0.65rem] text-primary tracking-[0.1em] uppercase opacity-70 hover:opacity-100 mb-6 transition-opacity">
          <ArrowLeft className="w-3 h-3" /> Back to Library
        </Link>
        <h1 className="font-serif text-4xl md:text-5xl text-[#f6f2ee] mb-4">{world.title}</h1>
        {world.seed && <p className="font-sans text-[1.05rem] text-muted-foreground max-w-[520px] leading-[1.65] font-normal">{world.seed}</p>}
      </header>

      <div className="mx-6 md:mx-10 h-px bg-gradient-to-r from-primary/30 via-primary/10 to-transparent mb-8" />

      <section className="px-6 md:px-10 flex flex-col gap-10">
        <div>
          <div className="font-mono text-[0.6rem] tracking-[0.12em] text-primary uppercase mb-3 opacity-60 flex items-center gap-3">
            <span>§ Canon</span>
            <div className="h-px bg-primary/20 flex-1 max-w-[100px]" />
          </div>
          {canonPaths.length > 0 ? (
            <div className="flex flex-col gap-3">
              {canonPaths.map(p => <PathCard key={p.id} p={p} type="canon" />)}
            </div>
          ) : (
            <div className="text-primary/60 font-mono text-xs tracking-wider border border-primary/10 bg-card/40 p-6 rounded text-center">No established canon yet.</div>
          )}
        </div>

        <div>
          <div className="font-mono text-[0.6rem] tracking-[0.12em] text-primary uppercase mb-3 opacity-60 flex items-center gap-3">
            <span>§ Alternate Paths</span>
            <div className="h-px bg-primary/20 flex-1 max-w-[100px]" />
          </div>
          {altPaths.length > 0 ? (
            <div className="flex flex-col gap-3">
              {altPaths.map(p => <PathCard key={p.id} p={p} type="alternate" />)}
            </div>
          ) : (
            <div className="text-primary/60 font-mono text-xs tracking-wider border border-primary/10 bg-card/40 p-6 rounded text-center">No alternate paths forged.</div>
          )}
        </div>

        {devPaths.length > 0 && (
          <div>
            <div className="font-mono text-[0.6rem] tracking-[0.12em] text-primary uppercase mb-3 opacity-60 flex items-center gap-3">
              <span>§ In Development</span>
              <div className="h-px bg-primary/20 flex-1 max-w-[100px]" />
            </div>
            <div className="flex flex-col gap-3">
              {devPaths.map(p => <PathCard key={p.id} p={p} type="dev" />)}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
