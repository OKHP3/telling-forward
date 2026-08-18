import { useListProposals, useListStoryworlds, useGetStoryworld, getGetStoryworldQueryKey } from '@workspace/api-client-react';
import { ProposalRow } from '@/components/proposal-row';
import { SnFooter } from '@/components/sn-footer';
import { useMemo } from 'react';
import { useParams } from 'wouter';

export default function WorldPage() {
  const params = useParams();
  const worldId = Number(params.worldId);

  const { 
    data: proposals, 
    isLoading: loadingProposals, 
    error: errorProposals 
  } = useListProposals();
  
  const { 
    data: worlds, 
    isLoading: loadingWorlds, 
    error: errorWorlds 
  } = useListStoryworlds();
  
  const {
    data: world,
    isLoading: loadingWorld,
    error: errorWorld
  } = useGetStoryworld(worldId, { 
    query: { 
      enabled: !isNaN(worldId), 
      queryKey: getGetStoryworldQueryKey(worldId) 
    } 
  });

  const filteredProposals = useMemo(() => {
    if (!proposals) return [];
    return proposals
      .filter(p => p.storyworldId === worldId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [proposals, worldId]);

  const worldsMap = useMemo(() => {
    const map = new Map<number, string>();
    if (worlds) {
      worlds.forEach(w => map.set(w.id, w.title));
    }
    return map;
  }, [worlds]);

  if (loadingProposals || loadingWorlds || loadingWorld) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="italic text-primary">{'// FETCHING_SIGNAL...'}</span>
      </div>
    );
  }

  if (errorProposals || errorWorlds || errorWorld) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <span className="text-accent text-lg">{'// SIGNAL_LOST'}</span>
        <span className="text-muted-foreground text-sm">Failed to connect to world stream.</span>
      </div>
    );
  }

  const worldTitle = world?.title || 'UNKNOWN';

  return (
    <div className="flex h-full flex-col p-6 md:p-8 overflow-y-auto">
      <div className="mb-8 flex flex-col gap-1">
        <span className="text-[0.65rem] text-primary">{`// WORLD → ${worldTitle.toUpperCase().replace(/\s+/g, '_')}`}</span>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl text-foreground pt-1">
            {worldTitle}
          </h1>
          <span className="flex h-5 items-center justify-center rounded-sm bg-card border border-card-border px-2 text-[0.6rem] text-muted-foreground">
            {filteredProposals.length}
          </span>
        </div>
      </div>

      <div className="flex flex-col flex-1">
        {filteredProposals.length === 0 ? (
          <div className="flex h-32 w-full items-center justify-center border border-dashed border-border/50">
            <span className="text-[0.7rem] text-[#374151]">{'// NO_ACTIVE_SUBMISSIONS'}</span>
          </div>
        ) : (
          <div className="flex flex-col pb-8">
            {filteredProposals.map(proposal => (
              <ProposalRow 
                key={proposal.id} 
                proposal={proposal} 
                worldName={worldsMap.get(proposal.storyworldId) || 'UNKNOWN_WORLD'} 
              />
            ))}
          </div>
        )}
      </div>

      <SnFooter />
    </div>
  );
}
