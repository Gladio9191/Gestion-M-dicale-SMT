import { useState, useEffect } from "react";
import { Search, Bell, Settings, Calendar, LayoutGrid } from "lucide-react";

const DAYS_FR   = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const MONTHS_FR = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

function useLiveTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
const pad = (n: number) => String(n).padStart(2, "0");

/* ── Icon button ─────────────────────────────────────────────── */
function IconBtn({ icon: Icon, badge }: { icon: React.ElementType; badge?: boolean }) {
  return (
    <button className="relative w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:shadow-sm transition-all duration-200 hover-lift">
      <Icon className="w-[17px] h-[17px] text-slate-500" />
      {badge && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
      )}
    </button>
  );
}

/* ── TopBar ─────────────────────────────────────────────────── */
export default function TopBar() {
  const now   = useLiveTime();
  const h     = pad(now.getHours());
  const m     = pad(now.getMinutes());
  const s     = pad(now.getSeconds());
  const day   = DAYS_FR[now.getDay()];
  const date  = now.getDate();
  const month = MONTHS_FR[now.getMonth()];
  const year  = now.getFullYear();

  return (
    <div className="h-[60px] bg-white border-b border-slate-200/70 flex items-center justify-between px-5 shrink-0 shadow-sm">

      {/* Left — search */}
      <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 w-60 hover-glow transition-all duration-200">
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Rechercher..."
          className="bg-transparent text-[12.5px] text-slate-600 placeholder-slate-400 outline-none w-full"
        />
      </div>

      {/* Center — live clock + date */}
      <div className="flex items-center gap-3 select-none">
        {/* Clock */}
        <div className="flex items-baseline gap-0.5">
          <span className="font-mono text-[19px] font-extrabold text-slate-800 tracking-tight">{h}</span>
          <span className="font-mono text-[14px] font-bold text-slate-300 mx-0.5 animate-pulse">:</span>
          <span className="font-mono text-[19px] font-extrabold text-slate-800 tracking-tight">{m}</span>
          <span className="font-mono text-[14px] font-bold text-slate-300 mx-0.5 animate-pulse">:</span>
          <span className="font-mono text-[19px] font-extrabold text-[#00C9AF] tracking-tight">{s}</span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200" />

        {/* Date */}
        <div className="text-center">
          <span className="text-[12px] font-semibold text-slate-600">
            {day} {date} {month} {year}
          </span>
        </div>
      </div>

      {/* Right — icon buttons */}
      <div className="flex items-center gap-2">
        <IconBtn icon={Calendar} />
        <IconBtn icon={LayoutGrid} />
        <IconBtn icon={Settings} />
        <IconBtn icon={Bell} badge />
      </div>
    </div>
  );
}
