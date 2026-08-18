import { Proposal } from '@workspace/api-client-react';
import { CornerBrackets } from './corner';
import { StateChip } from './state-chip';

interface ProposalRowProps {
  proposal: Proposal;
  worldName: string;
}

export function ProposalRow({ proposal, worldName }: ProposalRowProps) {
  const refCode = `TF-${new Date(proposal.submittedAt).getFullYear()}-${proposal.prNumber.toString().padStart(4, '0')}`;
  
  return (
    <div className="group relative flex w-full items-center grid grid-cols-[6rem_1fr_auto] gap-4 bg-card p-4 transition-colors hover:border-[#374151] border border-card-border overflow-visible rounded-sm mb-3">
      <CornerBrackets />
      
      <div className="text-[0.6rem] text-[#374151]">
        {refCode}
      </div>
      
      <div className="flex flex-col gap-1 min-w-0 pr-4">
        <h3 className="font-display text-[0.9rem] text-foreground truncate">
          Submission #{proposal.prNumber}
        </h3>
        <div className="text-[0.6rem] text-[#6b7280] truncate">
          {worldName} · PATH #{proposal.pathId} · {new Date(proposal.submittedAt).toISOString()}
        </div>
      </div>
      
      <div className="flex items-center justify-end">
        <StateChip state={proposal.state} />
      </div>
    </div>
  );
}
