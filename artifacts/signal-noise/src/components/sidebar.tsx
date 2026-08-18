import { Link, useLocation } from 'wouter';
import { Storyworld } from '@workspace/api-client-react';

interface SidebarProps {
  worlds?: Storyworld[];
}

const protocolStates = [
  { label: 'DRAFT', color: '#374151' },
  { label: 'SUBMITTED', color: '#c46a2c' },
  { label: 'IN_REVIEW', color: '#e6a03c' },
  { label: 'RETURNED', color: '#9ca3af' },
  { label: 'ACCEPTED', color: '#34d399' },
  { label: 'PUBLISHED', color: '#818cf8' },
];

export function Sidebar({ worlds = [] }: SidebarProps) {
  const [location] = useLocation();

  return (
    <div className="flex w-[220px] shrink-0 flex-col border-r border-primary/20 bg-background h-full overflow-y-auto">
      <div className="flex flex-col py-4">
        <h2 className="px-4 pb-2 text-[0.55rem] uppercase text-primary border-b border-primary/20 mb-3 tracking-widest">
          State Protocol
        </h2>
        <div className="flex flex-col gap-2.5 px-4 mb-8">
          {protocolStates.map((state) => (
            <div key={state.label} className="flex items-center gap-3">
              <div 
                className="h-1.5 w-1.5 shrink-0 rounded-full" 
                style={{ backgroundColor: state.color, boxShadow: `0 0 4px ${state.color}` }}
              />
              <span 
                className="text-[0.6rem] tracking-wider"
                style={{ color: state.color }}
              >
                {state.label}
              </span>
            </div>
          ))}
        </div>

        <h2 className="px-4 py-2 text-[0.55rem] uppercase text-primary border-y border-primary/20 mb-3 tracking-widest">
          Systems
        </h2>
        <div className="flex flex-col">
          <Link 
            href="/"
            className={`px-4 py-2 text-xs transition-colors flex items-center ${
              location === '/' 
                ? 'border-l-2 border-primary text-foreground bg-primary/5' 
                : 'text-muted-foreground hover:text-foreground border-l-2 border-transparent'
            }`}
          >
            _ SUBMISSIONS
          </Link>
          {worlds.map((world) => {
            const path = `/worlds/${world.id}`;
            const isActive = location === path;
            return (
              <Link
                key={world.id}
                href={path}
                className={`px-4 py-2 text-[0.7rem] transition-colors flex items-center ${
                  isActive 
                    ? 'border-l-2 border-primary text-foreground bg-primary/5' 
                    : 'text-muted-foreground hover:text-foreground border-l-2 border-transparent'
                }`}
              >
                <span className="truncate">_ {world.title.toUpperCase().replace(/\s+/g, '_')}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
