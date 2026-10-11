import type { parseRecapParams } from "@/lib/recap";

/** Share image for /api/og/recap (rendered by next/og, so inline styles only). */
export default function RecapImage({ p }: { p: ReturnType<typeof parseRecapParams> }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "linear-gradient(135deg, #141414 0%, #2a2410 100%)",
        color: "#fff",
        padding: 64,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 32, color: "#FFD200", fontWeight: 700 }}>TV Time Tracker</div>
        <div style={{ fontSize: 64, fontWeight: 800, marginTop: 16 }}>{`${p.name}'s ${p.year} in TV`}</div>
      </div>
      <div style={{ display: "flex", gap: 48 }}>
        {[
          [p.eps.toLocaleString(), "episodes"],
          [p.movies.toLocaleString(), "movies"],
          [p.hours.toLocaleString(), "hours"],
          [String(p.streak), "day streak"],
        ].map(([value, label]) => (
          <div key={label} style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 80, fontWeight: 800, color: "#FFD200" }}>{value}</div>
            <div style={{ fontSize: 28, color: "#9CA3AF" }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", fontSize: 28, color: "#D1D5DB" }}>
        {p.top.length ? `Top shows: ${p.top.join(" · ")}` : "Track your shows free at tvtime.online"}
      </div>
    </div>
  );
}
