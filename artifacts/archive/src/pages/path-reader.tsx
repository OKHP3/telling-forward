import { useParams } from 'wouter';
import { Nav } from '@/components/nav';
import { useGetStoryworld, useListStoryPaths, useListContributions } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export function PathReader() {
  const { worldId, pathId } = useParams();
  const wId = parseInt(worldId || '0', 10);
  const pId = parseInt(pathId || '0', 10);
  
  const { data: world, isLoading: worldLoading } = useGetStoryworld(wId);
  const { data: paths, isLoading: pathsLoading } = useListStoryPaths(wId);
  const path = paths?.find(p => p.id === pId);
  
  const { data: contributions, isLoading: contributionsLoading } = useListContributions(wId, pId);

  const renderMarkdown = (text: string) => {
    return { __html: DOMPurify.sanitize(marked.parse(text) as string) };
  };

  return (
    <div className="min-h-[100dvh] bg-paper text-ink font-sans flex flex-col">
      <Nav />
      
      <main className="flex-1 px-5 sm:px-10 overflow-hidden pb-16">
        {(worldLoading || pathsLoading) ? (
          <div className="py-16 font-mono text-sm text-[#91a19f]">Loading path...</div>
        ) : (!world || !path) ? (
          <div className="py-16 font-mono text-sm text-coral">Path not found.</div>
        ) : (
          <>
            {/* Header */}
            <header className="py-12 md:py-16 border-b border-line">
              <div className="font-mono text-coral text-[.63rem] tracking-[.16em] uppercase mb-5">
                {world.title}
              </div>
              <h1 className="font-serif font-normal text-[clamp(2.4rem,5vw,4.5rem)] leading-[1.05] tracking-[-.02em] max-w-[800px]">
                {path.title}
              </h1>
            </header>

            {/* Contributions List */}
            <div className="max-w-[720px] mx-auto mt-16 pb-12">
              {contributionsLoading ? (
                <div className="py-8 font-mono text-sm text-[#91a19f]">Loading contributions...</div>
              ) : contributions?.length === 0 ? (
                <div className="py-8 font-mono text-sm text-[#91a19f]">// NO_CONTRIBUTIONS_YET</div>
              ) : (
                <div className="flex flex-col gap-12">
                  {contributions?.map((contribution, i) => (
                    <article key={contribution.id} className="border-b border-line pb-12 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="font-mono text-[#91a19f] text-[.68rem]">
                          {(i + 1).toString().padStart(2, '0')} /
                        </div>
                        <h2 className="font-serif font-normal text-[1.5rem] tracking-[-.01em]">
                          {contribution.title}
                        </h2>
                      </div>
                      
                      {contribution.summary && (
                        <div 
                          className="prose prose-sm prose-slate max-w-none mb-6 font-sans text-[1.05rem] leading-[1.7] text-ink"
                          dangerouslySetInnerHTML={renderMarkdown(contribution.summary)}
                        />
                      )}
                      
                      <div className="flex items-center justify-between mt-8 border-t border-line/50 pt-4">
                        <div className="font-mono text-[.68rem] text-[#718183] uppercase tracking-[.05em]">
                          by <span className="text-ink">{contribution.contributorDisplayName || 'Unknown'}</span> · {format(new Date(contribution.createdAt), 'MMM d, yyyy')}
                        </div>
                        {contribution.agentAssisted && (
                          <div className="font-mono text-coral text-[.55rem] tracking-[.1em] border border-coral/30 px-2 py-1">
                            AI ASSISTED
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
