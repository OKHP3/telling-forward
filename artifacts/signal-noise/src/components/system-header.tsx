import { useEffect, useState } from 'react';

export function SystemHeader() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const timeString = time.toISOString().replace('T', ' ').substring(0, 19) + 'Z';

  return (
    <header className="flex h-10 w-full items-center justify-between border-b border-primary/35 bg-[#1c3a34] px-4 shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-display text-[#e6a03c] text-lg leading-none tracking-wide pt-1">
          TF
        </span>
        <span className="text-muted-foreground/30 text-sm pb-[2px]">│</span>
        <span className="text-muted-foreground text-xs pb-[2px]">
          TELLING_FORWARD  //  v2.1.0
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#34d399] shadow-[0_0_4px_#34d399]" />
          <span className="text-[#34d399] pb-[2px]">ONLINE</span>
        </div>
        <span className="text-[#6b7280] pb-[2px]">{timeString}</span>
      </div>
    </header>
  );
}
