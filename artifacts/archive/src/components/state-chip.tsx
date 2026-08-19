export function StateChip({ state }: { state: string }) {
  const normalizedState = state.toUpperCase();
  
  let tint = '#91a19f'; // default muted
  if (normalizedState === 'CANON' || normalizedState === 'OPEN' || normalizedState === 'PUBLISHED-CANON' || normalizedState === 'PUBLISHED CANON') {
    tint = '#b85c38'; // coral
  } else if (normalizedState === 'IN REVIEW' || normalizedState === 'PROPOSED') {
    tint = '#3d6b73'; // teal
  } else if (normalizedState === 'RETURNED') {
    tint = '#8b8178'; // stone
  } else if (normalizedState === 'PUBLISHED ALTERNATE' || normalizedState === 'PUBLISHED-ALTERNATE') {
    tint = '#6b4fa0'; // purple
  }
  
  const displayState = normalizedState === 'PUBLISHED-ALTERNATE'
    ? 'PUBLISHED ALTERNATE'
    : normalizedState === 'PUBLISHED-CANON'
      ? 'CANON'
      : normalizedState;

  return (
    <span
      className="font-mono text-[.58rem] tracking-[.08em] whitespace-nowrap px-[.55rem] py-[.35rem]"
      style={{
        color: tint,
        border: `1px solid ${tint}66`,
      }}
    >
      {displayState}
    </span>
  );
}
