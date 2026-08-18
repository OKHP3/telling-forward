import { useListProposals, useListStoryworlds } from '@workspace/api-client-react';
import { ProposalRow } from '@/components/proposal-row';
import { SnFooter } from '@/components/sn-footer';
import { useMemo } from 'react';

export default function QueuePage() {
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

  const sortedProposals = useMemo(() => {
    if (!proposals) return [];
    return [...proposals].sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }, [proposals]);

  const worldsMap = useMemo(() => {
    const map = new Map<number, string>();
    if (worlds) {
      worlds.forEach(w => map.set(w.id, w.title));
    }
    return map;
  }, [worlds]);

  if (loadingProposals || loadingWorlds) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="italic text-primary">{'// FETCHING_SIGNAL...'}</span>
      </div>
    );
  }

  if (errorProposals || errorWorlds) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <span className="text-accent text-lg">{'// SIGNAL_LOST'}</span>
        <span className="text-muted-foreground text-sm">Failed to connect to data stream.</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6 md:p-8 overflow-y-auto">
      <div className="mb-8 flex flex-col gap-1">
        <span className="text-[0.65rem] text-primary">{'// SUBMISSION_QUEUE → ACTIVE'}</span>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl text-foreground pt-1">
            Global Queue
          </h1>
          <span className="flex h-5 items-center justify-center rounded-sm bg-card border border-card-border px-2 text-[0.6rem] text-muted-foreground">
            {sortedProposals.length}
          </span>
        </div>
      </div>

      <div className="flex flex-col flex-1">
        {sortedProposals.length === 0 ? (
          <div className="flex h-32 w-full items-center justify-center border border-dashed border-border/50">
            <span className="text-[0.7rem] text-[#374151]">{'// NO_ACTIVE_SUBMISSIONS'}</span>
          </div>
        ) : (
          <div className="flex flex-col pb-8">
            {sortedProposals.map(proposal => (
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
