import { Proposal } from '@workspace/api-client-react';

const stateMap: Record<string, { display: string, color: string }> = {
  'draft': { display: 'DRAFT', color: '#374151' },
  'submitted': { display: 'SUBMITTED', color: '#c46a2c' },
  'under-review': { display: 'IN_REVIEW', color: '#e6a03c' },
  'returned-with-notes': { display: 'RETURNED', color: '#9ca3af' },
  'accepted-into-canon': { display: 'ACCEPTED', color: '#34d399' },
  'published-canon': { display: 'CANON', color: '#34d399' },
  'published-alternate': { display: 'ALTERNATE', color: '#818cf8' },
};

export function StateChip({ state }: { state: Proposal['state'] }) {
  const config = stateMap[state] || { display: state.toUpperCase(), color: '#9ca3af' };
  
  return (
    <div 
      className="inline-flex items-center gap-2 rounded-sm border shrink-0 px-2 py-0.5"
      style={{
        backgroundColor: `${config.color}14`,
        borderColor: `${config.color}44`,
      }}
    >
      <div 
        className="h-[5px] w-[5px] shrink-0 rounded-full" 
        style={{ 
          backgroundColor: config.color,
          boxShadow: `0 0 4px ${config.color}`
        }}
      />
      <span 
        className="text-[0.58rem] tracking-[0.08em] pb-[1px]"
        style={{ color: config.color }}
      >
        {config.display}
      </span>
    </div>
  );
}
