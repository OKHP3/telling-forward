import { useListStoryworlds, useListStoryPaths } from '@workspace/api-client-react';
import { getListStoryPathsQueryKey } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Masthead } from '@/components/masthead';
import { BsFooter } from '@/components/bs-footer';
import { LoadingState, ErrorState } from '@/components/states';

export default function DiscoveryPage() {
  const { data: storyworlds, isLoading: worldsLoading, isError: worldsError } = useListStoryworlds();
  
  const featuredWorld = storyworlds?.[0];
  
  const { data: paths, isLoading: pathsLoading, isError: pathsError } = useListStoryPaths(featuredWorld?.id ?? 0, {
    query: {
      enabled: !!featuredWorld?.id,
      queryKey: getListStoryPathsQueryKey(featuredWorld?.id ?? 0)
    }
  });

  if (worldsLoading || pathsLoading) return <LoadingState />;
  if (worldsError || pathsError) return <ErrorState />;

  const canonPaths = paths?.filter(p => p.state === 'open') || [];
  const altPaths = paths?.filter(p => p.state === 'published-alternate') || [];
  const devPaths = paths?.filter(p => p.state === 'personal' || p.state === 'proposed') || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Masthead />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
        <div className="md:col-span-2">
          <div className="font-mono text-[#c46a2c] text-[0.55rem] tracking-[0.14em] uppercase border-l-2 border-[#c46a2c] pl-2 mb-4">
            FEATURED STORYWORLD — Issue 01
          </div>
          {featuredWorld ? (
            <Link href={`/worlds/${featuredWorld.id}`}>
              <h2 className="font-display text-3xl sm:text-[1.9rem] leading-tight mb-4 text-[#2a2320] hover:text-[#c46a2c] cursor-pointer inline-block">
                {featuredWorld.title}
              </h2>
            </Link>
          ) : (
            <h2 className="font-display text-3xl sm:text-[1.9rem] leading-tight mb-4 text-[#2a2320]">
              No featured storyworld yet.
            </h2>
          )}
          <p className="font-body text-[#2a2320] text-[0.88rem] leading-[1.7]">
            {featuredWorld?.seed ?? "A storyworld shaped by many hands."}
          </p>
        </div>
        
        <div className="md:col-span-1">
          <div className="font-mono text-[#c46a2c] text-[0.55rem] tracking-[0.14em] uppercase border-l-2 border-[#c46a2c] pl-2 mb-4">
            EDITORIAL RECORD
          </div>
          <div className="bg-[#ede8e2] border border-[#d4cfc9] rounded-[2px] p-4 flex flex-col">
            <StatRow label="Active Paths" value={paths?.length || 0} />
            <StatRow label="Canon Stories" value={canonPaths.length} />
            <StatRow label="Alternate Paths" value={altPaths.length} />
            <StatRow label="Contributors" value={0} isLast />
          </div>
        </div>
      </div>
      
      <div className="border-t border-[rgba(42,35,32,0.13)] pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <PathColumn title="Canon Paths" paths={canonPaths} worldId={featuredWorld?.id} />
          <PathColumn title="Alternate Paths" paths={altPaths} worldId={featuredWorld?.id} />
          <PathColumn title="In Development" paths={devPaths} worldId={featuredWorld?.id} />
        </div>
      </div>
      
      <BsFooter />
    </div>
  );
}

function StatRow({ label, value, isLast = false }: { label: string, value: number, isLast?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2 ${!isLast ? 'border-b border-[#d4cfc9]' : ''}`}>
      <span className="font-body text-[#4b4035] text-[0.85rem]">{label}</span>
      <span className="font-display text-[#2a2320] text-lg">{value}</span>
    </div>
  );
}

function PathColumn({ title, paths, worldId }: { title: string, paths: any[], worldId?: number }) {
  return (
    <div className="md:border-r border-[#d4cfc9] last:border-r-0 md:pr-8 last:pr-0">
      <div className="font-mono text-[#c46a2c] text-[0.55rem] tracking-[0.14em] uppercase border-b border-[rgba(198,106,44,0.27)] pb-2 mb-4">
        {title}
      </div>
      {paths.length === 0 ? (
        <div className="font-mono italic text-[#6b7280] text-sm">No stories yet.</div>
      ) : (
        <div className="flex flex-col">
          {paths.map((p) => (
            worldId ? (
              <Link key={p.id} href={`/worlds/${worldId}/paths/${p.id}`} className="font-body text-[#2a2320] text-[0.8rem] py-[0.35rem] border-b border-dotted border-[#d4cfc9] last:border-b-0 hover:text-[#c46a2c]">
                {p.title}
              </Link>
            ) : (
              <div key={p.id} className="font-body text-[#2a2320] text-[0.8rem] py-[0.35rem] border-b border-dotted border-[#d4cfc9] last:border-b-0">
                {p.title}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
