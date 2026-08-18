import { Link } from 'wouter';

export function Masthead() {
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-end pb-4 border-b-[3px] border-[#2a2320]">
        <div>
          <div className="font-mono text-[#c46a2c] text-[0.65rem] uppercase tracking-wider mb-1">
            A Collaborative Fiction Engine · OverKill Hill P³
          </div>
          <Link href="/" className="font-display text-4xl sm:text-5xl md:text-6xl text-[#2a2320]">
            Telling Forward
          </Link>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm text-[#2a2320]">Vol. II · No. 7</div>
          <div className="font-mono text-sm text-[#2a2320]">{currentDate}</div>
        </div>
      </div>
      <div className="border-b-[3px] border-[#c46a2c] mt-1" />
      <div className="border-b-[1px] border-[rgba(42,35,32,0.13)] mt-1 mb-3" />
      <div className="flex justify-end gap-6 font-mono text-xs text-[#2a2320] uppercase tracking-widest mt-2 mb-6">
        <Link href="/" className="hover:text-[#c46a2c]">Worlds</Link>
        <Link href="/" className="hover:text-[#c46a2c]">Paths</Link>
        <Link href="/" className="hover:text-[#c46a2c]">Archive</Link>
      </div>
    </div>
  );
}
