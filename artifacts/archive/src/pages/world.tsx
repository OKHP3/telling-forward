import { Link, useParams } from 'wouter';
import { Nav } from '@/components/nav';
import { StateChip } from '@/components/state-chip';
import { useGetStoryworld, useListStoryPaths } from '@workspace/api-client-react';

export function WorldArchive() {
  const { worldId } = useParams();
  const id = parseInt(worldId || '0', 10);
  
  const { data: world, isLoading: worldLoading } = useGetStoryworld(id);
  const { data: paths, isLoading: pathsLoading } = useListStoryPaths(id);
  
  const totalPaths = paths?.length || 0;
  const openPaths = paths?.filter(p => p.state === 'open').length || 0;
  const alternatePaths = paths?.filter(p => p.state === 'published-alternate').length || 0;

  return (
    <div className="min-h-[100dvh] bg-paper text-ink font-sans flex flex-col">
      <Nav />
      
      <main className="flex-1 px-5 sm:px-10 overflow-hidden pb-12">
        {worldLoading ? (
          <div className="py-16 font-mono text-sm text-[#91a19f]">Loading world...</div>
        ) : world ? (
          <>
            {/* Header */}
            <header className="py-12 md:py-16 border-b border-line">
              <div className="font-mono text-coral text-[.63rem] tracking-[.16em] uppercase mb-5">
                World archive
              </div>
              <h1 className="font-serif font-normal text-[clamp(2.6rem,6vw,5rem)] leading-[1.02] tracking-[-.035em] max-w-[800px] mb-6">
                {world.title}
              </h1>
              <p className="text-base leading-[1.7] text-[#596b6f] max-w-[500px] mb-8">
                {world.seed || `${world.repoOwner}/${world.repoName}`}
              </p>
              
              <div className="flex flex-wrap gap-6 font-mono text-[.68rem] text-[#68797b] uppercase tracking-[.08em]">
                <div>Total Paths: <span className="text-ink">{totalPaths.toString().padStart(2, '0')}</span></div>
                <div>Open: <span className="text-ink">{openPaths.toString().padStart(2, '0')}</span></div>
                <div>Alternate: <span className="text-ink">{alternatePaths.toString().padStart(2, '0')}</span></div>
              </div>
            </header>

            {/* Paths Index */}
            <section className="pt-8">
              <div className="flex items-baseline gap-3 mb-4">
                <div className="font-mono text-coral text-[.62rem] tracking-[.14em] uppercase">
                  Story Paths
                </div>
                <div className="bg-mist text-ink px-2 py-0.5 font-mono text-[.6rem] border border-line">
                  {totalPaths.toString().padStart(2, '0')}
                </div>
              </div>
              
              <div className="border-t-[2px] border-ink">
                {pathsLoading ? (
                  <div className="p-5 font-mono text-sm text-[#91a19f]">Loading paths...</div>
                ) : paths?.length === 0 ? (
                  <div className="p-5 font-mono text-sm text-[#91a19f]">// NO_PATHS_FOUND</div>
                ) : (
                  paths?.map((path, i) => (
                    <Link 
                      key={path.id}
                      href={`/worlds/${world.id}/paths/${path.id}`}
                      className="w-full grid grid-cols-[3.5rem_1fr_auto] gap-4 items-center text-left border-b border-line bg-transparent p-[1.25rem_.2rem] hover:bg-mist/50 transition-colors"
                    >
                      <span className="font-mono text-[#91a19f] text-[.68rem]">
                        {(i + 1).toString().padStart(2, '0')} /
                      </span>
                      <span className="block font-serif font-normal text-base text-ink">
                        {path.title}
                      </span>
                      <StateChip state={path.state} />
                    </Link>
                  ))
                )}
              </div>
            </section>
          </>
        ) : (
          <div className="py-16 font-mono text-sm text-coral">World not found.</div>
        )}
      </main>
    </div>
  );
}
