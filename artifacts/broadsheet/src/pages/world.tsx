import { useParams, Link } from 'wouter';
import { useGetStoryworld, useListStoryPaths, getGetStoryworldQueryKey, getListStoryPathsQueryKey } from '@workspace/api-client-react';
import { Masthead } from '@/components/masthead';
import { BsFooter } from '@/components/bs-footer';
import { LoadingState, ErrorState } from '@/components/states';

export default function WorldPage() {
  const { worldId } = useParams();
  const id = Number(worldId);

  const { data: world, isLoading: worldLoading, isError: worldError } = useGetStoryworld(id, {
    query: {
      enabled: !!id,
      queryKey: getGetStoryworldQueryKey(id)
    }
  });

  const { data: paths, isLoading: pathsLoading, isError: pathsError } = useListStoryPaths(id, {
    query: {
      enabled: !!id,
      queryKey: getListStoryPathsQueryKey(id)
    }
  });

  if (worldLoading || pathsLoading) return <LoadingState />;
  if (worldError || pathsError) return <ErrorState />;

  const canonPaths = paths?.filter(p => p.state === 'open') || [];
  const altPaths = paths?.filter(p => p.state === 'published-alternate') || [];
  const devPaths = paths?.filter(p => p.state === 'personal' || p.state === 'proposed') || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Masthead />
      
      <div className="mb-12">
        <div className="font-mono text-[#c46a2c] text-[0.55rem] tracking-[0.14em] uppercase border-l-2 border-[#c46a2c] pl-2 mb-4">
          ISSUE {id}
        </div>
        <h1 className="font-display text-[2.2rem] leading-tight mb-4 text-[#2a2320]">
          {world?.title}
        </h1>
        <p className="font-body text-[#2a2320] text-[0.88rem] leading-[1.7] max-w-2xl">
          {world?.seed || "A storyworld shaped by many hands."}
        </p>
      </div>

      <WorldSection title="CANON PATHS" paths={canonPaths} worldId={id} />
      <div className="border-t border-[rgba(42,35,32,0.13)] my-8 w-full" />
      
      <WorldSection title="ALTERNATE PATHS" paths={altPaths} worldId={id} />
      <div className="border-t border-[rgba(42,35,32,0.13)] my-8 w-full" />
      
      <WorldSection title="IN DEVELOPMENT" paths={devPaths} worldId={id} />
      
      <BsFooter />
    </div>
  );
}

function WorldSection({ title, paths, worldId }: { title: string, paths: any[], worldId: number }) {
  return (
    <div>
      <h3 className="font-mono text-[#c46a2c] text-[0.55rem] tracking-[0.14em] uppercase border-b border-[#c46a2c] pb-2 mb-6">
        {title}
      </h3>
      {paths.length === 0 ? (
        <div className="font-mono italic text-[#6b7280] text-sm">No stories yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {paths.map((p) => (
            <Link key={p.id} href={`/worlds/${worldId}/paths/${p.id}`} className="block group">
              <h4 className="font-display text-[1rem] text-[#2a2320] group-hover:text-[#c46a2c] mb-2">
                {p.title}
              </h4>
              <span className="font-mono text-[#c46a2c] text-[0.6rem] uppercase tracking-wider bg-[#ede8e2] px-2 py-1 rounded-[2px] border border-[#d4cfc9] inline-block">
                {p.state.replace('-', ' ')}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
