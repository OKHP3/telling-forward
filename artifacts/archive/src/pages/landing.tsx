import { Link } from 'wouter';
import { Nav } from '@/components/nav';
import { StateChip } from '@/components/state-chip';
import {
  useListStoryworlds,
  useListStoryPaths,
  getListStoryPathsQueryKey,
  useListContributions,
  getListContributionsQueryKey,
} from '@workspace/api-client-react';

export function Landing() {
  const { data: storyworlds, isLoading: worldsLoading } = useListStoryworlds();
  
  // Get featured world (the first one)
  const featuredWorld = storyworlds?.[0];
  
  // We only fetch paths for the featured world per requirements
  const featuredWorldId = featuredWorld?.id ?? 0;
  const { data: paths, isLoading: pathsLoading } = useListStoryPaths(featuredWorldId, {
    query: { enabled: !!featuredWorld, queryKey: getListStoryPathsQueryKey(featuredWorldId) }
  });
  
  // Find first open path
  const featuredPath = paths?.find(p => p.state === 'open') || paths?.[0];
  const featuredPathId = featuredPath?.id ?? 0;
  
  const { data: contributions, isLoading: contributionsLoading } = useListContributions(
    featuredWorldId,
    featuredPathId,
    { query: { enabled: !!featuredWorld && !!featuredPath, queryKey: getListContributionsQueryKey(featuredWorldId, featuredPathId) } }
  );

  const stats = [
    ['Active storyworlds', storyworlds?.length?.toString().padStart(2, '0') ?? '00'],
    ['Paths in play', paths?.length?.toString().padStart(2, '0') ?? '00'],
    ['Open paths', paths?.filter(p => p.state === 'open').length.toString().padStart(2, '0') ?? '00'],
    ['Alternate paths', paths?.filter(p => p.state === 'published-alternate').length.toString().padStart(2, '0') ?? '00']
  ];

  return (
    <div className="min-h-[100dvh] bg-paper text-ink font-sans flex flex-col">
      <Nav />
      
      <main className="flex-1 px-5 sm:px-10 overflow-hidden">
        {/* Hero Section */}
        <section className="grid grid-cols-1 md:grid-cols-[1.2fr_.8fr] gap-8 md:gap-16 py-12 md:py-16 border-b border-line">
          <div>
            <div className="font-mono text-coral text-[.63rem] tracking-[.16em] uppercase mb-5">
              A living archive · volume 02
            </div>
            <h1 className="font-serif font-normal text-[clamp(2.6rem,6vw,5rem)] leading-[1.02] tracking-[-.035em] max-w-[690px] mb-6">
              The story is<br /><span className="text-coral">still moving.</span>
            </h1>
            <p className="text-base leading-[1.7] text-[#596b6f] max-w-[500px]">
              Telling Forward is a public record of worlds built by many hands. Read the canon, follow the margins, and leave a door open for the next voice.
            </p>
          </div>
          
          <aside className="self-end bg-mist border border-line p-5 md:p-[1.35rem_1.5rem]">
            <div className="font-mono text-coral text-[.6rem] tracking-[.14em] uppercase mb-4">
              Current record
            </div>
            {stats.map(([label, value], i) => (
              <div 
                key={label} 
                className={`flex justify-between items-baseline py-2.5 ${i !== stats.length - 1 ? 'border-b border-line' : ''}`}
              >
                <span className="text-[.78rem] text-[#68797b] font-sans">{label}</span>
                <strong className="font-serif text-[1.25rem] font-normal">{value}</strong>
              </div>
            ))}
          </aside>
        </section>

        {/* Latest Dispatches */}
        <section className="pt-8">
          <div className="flex justify-between items-baseline mb-4">
            <div className="font-mono text-coral text-[.62rem] tracking-[.14em] uppercase">
              Latest dispatches {featuredWorld ? `/ ${featuredWorld.title}` : ''}
            </div>
            {featuredWorld && (
              <Link 
                href={`/worlds/${featuredWorld.id}`}
                className="border-b border-coral text-coral text-[.7rem] pb-1 hover:opacity-80 transition-opacity"
              >
                View all →
              </Link>
            )}
          </div>
          
          <div className="border-t-[2px] border-ink">
            {contributionsLoading ? (
              <div className="p-5 font-mono text-sm text-[#91a19f]">Loading dispatches...</div>
            ) : contributions?.length === 0 ? (
              <div className="p-5 font-mono text-sm text-[#91a19f]">// NO_DISPATCHES_FOUND</div>
            ) : (
              contributions?.map((entry, i) => (
                <Link 
                  key={entry.id}
                  href={featuredWorld && featuredPath ? `/worlds/${featuredWorld.id}/paths/${featuredPath.id}` : '#'}
                  className="w-full grid grid-cols-[3.5rem_1fr_auto] gap-4 items-center text-left border-b border-line bg-transparent p-[1.25rem_.2rem] hover:bg-mist/50 transition-colors"
                >
                  <span className="font-mono text-[#91a19f] text-[.68rem]">
                    {(i + 1).toString().padStart(2, '0')} /
                  </span>
                  <div>
                    <span className="block font-serif font-normal text-base text-ink mb-1">
                      {entry.title}
                    </span>
                    <span className="text-[.72rem] text-[#718183] font-sans">
                      by {entry.contributorDisplayName || 'Unknown'} · {featuredWorld?.title || 'Unknown World'}
                    </span>
                  </div>
                  <StateChip state="CANON" />
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="flex justify-between py-8 md:py-[2.2rem_0_1.2rem] text-[#879594] font-mono text-[.58rem] tracking-[.06em]">
          <span><span className="text-coral">TF/02</span> · A collaborative fiction engine</span>
          <span>OverKill Hill P³ · 2026</span>
        </footer>
      </main>
    </div>
  );
}
