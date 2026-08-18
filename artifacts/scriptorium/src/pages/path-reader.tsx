import { Link, useParams } from 'wouter';
import { useGetStoryworld, useListStoryPaths, useListContributions, getGetStoryworldQueryKey, getListStoryPathsQueryKey, getListContributionsQueryKey } from '@workspace/api-client-react';
import { ArrowLeft } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useMemo } from 'react';

export default function PathReader() {
  const params = useParams();
  const worldId = Number(params.worldId);
  const pathId = Number(params.pathId);

  const { data: world, isLoading: isWorldLoading } = useGetStoryworld(worldId, { query: { enabled: !!worldId, queryKey: getGetStoryworldQueryKey(worldId) } });
  const { data: paths, isLoading: isPathsLoading } = useListStoryPaths(worldId, { query: { enabled: !!worldId, queryKey: getListStoryPathsQueryKey(worldId) } });
  const { data: contributions, isLoading: isContributionsLoading } = useListContributions(worldId, pathId, { query: { enabled: !!(worldId && pathId), queryKey: getListContributionsQueryKey(worldId, pathId) } });

  const path = paths?.find(p => p.id === pathId);
  const branches = paths?.filter(p => p.originPathId === pathId) || [];

  if (isWorldLoading || isPathsLoading || isContributionsLoading) return <div className="p-10 font-mono text-muted-foreground w-full max-w-[900px] mx-auto">Loading path...</div>;
  if (!world || !path) return <div className="p-10 font-mono text-muted-foreground w-full max-w-[900px] mx-auto">Path not found.</div>;

  return (
    <div className="w-full">
      <header className="pt-10 px-6 md:px-10 pb-6 border-b border-primary/10 max-w-[900px] mx-auto">
        <Link href={`/worlds/${worldId}`} className="inline-flex items-center gap-2 font-mono text-[0.65rem] text-primary tracking-[0.1em] uppercase opacity-70 hover:opacity-100 mb-6 transition-opacity">
          <ArrowLeft className="w-3 h-3" /> Back to {world.title}
        </Link>
        <div className="font-mono text-[0.65rem] text-primary tracking-[0.14em] mb-2 uppercase opacity-70">
           {path.state === 'open' ? 'Canon Path' : path.state === 'published-alternate' ? 'Alternate Path' : 'In Development'}
        </div>
        <h1 className="font-serif text-3xl md:text-5xl text-[#f6f2ee]">{path.title}</h1>
      </header>

      <div className="px-6 md:px-10 py-12 md:py-20 max-w-[750px] mx-auto w-full flex flex-col gap-24">
        {contributions?.length === 0 ? (
           <div className="text-primary/60 font-mono text-xs tracking-wider border border-primary/10 bg-card/40 p-12 rounded text-center">No scenes written in this path yet.</div>
        ) : (
          contributions?.map((c, i) => <Scene key={c.id} contribution={c} index={i} />)
        )}
      </div>

      {branches.length > 0 && (
        <div className="px-6 md:px-10 pb-20">
          <div className="max-w-[750px] mx-auto border-t border-primary/20 pt-10">
             <div className="font-mono text-[0.65rem] text-primary tracking-[0.14em] mb-6 uppercase opacity-70 flex items-center gap-4">
               <span>Alternate branches diverge from here</span>
               <div className="h-px bg-primary/20 flex-1 max-w-[50px]" />
             </div>
             <div className="flex flex-col gap-3">
               {branches.map(b => (
                 <Link key={b.id} href={`/worlds/${worldId}/paths/${b.id}`} className="block group">
                   <div className="bg-card/40 border border-primary/10 border-l-[3px] border-l-[#c46a2c] rounded px-5 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-colors hover:bg-card/80 hover:border-primary/40">
                      <div>
                        <div className="font-serif text-[0.95rem] text-[#f6f2ee] mb-1">{b.title}</div>
                        <div className="font-sans text-[0.72rem] text-muted-foreground">Alternate Path</div>
                      </div>
                      <span className="font-mono text-[0.6rem] text-muted-foreground group-hover:text-primary transition-colors uppercase self-start sm:self-center">Read Branch →</span>
                   </div>
                 </Link>
               ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Scene({ contribution: c, index }: { contribution: any, index: number }) {
  const html = useMemo(() => {
    if (!c.summary) return "";
    return DOMPurify.sanitize(marked.parse(c.summary) as string);
  }, [c.summary]);

  return (
    <article className="scene-container">
      <div className="font-mono text-[0.6rem] tracking-[0.12em] text-primary uppercase mb-4 opacity-60 text-center">§ {String(index + 1).padStart(3, '0')}</div>
      <h2 className="font-serif text-2xl md:text-3xl text-[#f6f2ee] text-center mb-10 leading-tight">{c.title}</h2>
      
      <div 
        className="prose prose-invert prose-p:font-sans prose-p:text-[1.05rem] prose-p:leading-[1.9] prose-p:text-muted-foreground/90 max-w-none mb-12 prose-headings:font-serif prose-headings:text-[#f6f2ee] prose-a:text-primary" 
        dangerouslySetInnerHTML={{ __html: html }} 
      />
      
      <div className="flex flex-wrap items-center justify-center gap-4 text-[0.75rem] font-sans text-muted-foreground/70 border-t border-border/30 pt-6">
        <span>Forged by <span className="text-muted-foreground font-medium">{c.contributorDisplayName || "Anonymous"}</span></span>
        {c.agentAssisted && (
          <span className="font-mono text-[0.6rem] px-2 py-0.5 border border-[#1c3a34] bg-[#1c3a34]/30 text-teal-400/80 rounded-sm">AGENT-ASSISTED</span>
        )}
      </div>
    </article>
  );
}
