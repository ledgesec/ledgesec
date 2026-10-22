const RADAR = "@keyframes radar{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}";

export function SectionLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading page">
      <style>{RADAR}</style>
      <div className="relative h-14 w-14">
        <span className="absolute inset-0 rounded-full border border-cyber-cyan/20" />
        <span className="absolute inset-2 rounded-full border-t-2 border-cyber-cyan" style={{ animation: "radar 4s linear infinite" }} />
        <span className="absolute inset-[1.35rem] rounded-full bg-cyber-cyan shadow-[0_0_18px_rgba(0,240,255,0.7)]" />
      </div>
    </div>
  );
}
