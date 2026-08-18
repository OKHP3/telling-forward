export function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f2ee]">
      <div className="font-mono italic text-[#6b7280] text-center">
        Composing the edition…
      </div>
    </div>
  );
}

export function ErrorState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f2ee] px-4">
      <div className="text-center">
        <h1 className="font-display text-4xl text-[#2a2320] border-b-2 border-[#c46a2c] pb-2 mb-4 inline-block">
          The presses have stopped.
        </h1>
        <p className="font-body text-[#2a2320]">
          An error occurred while fetching the contents.
        </p>
      </div>
    </div>
  );
}
