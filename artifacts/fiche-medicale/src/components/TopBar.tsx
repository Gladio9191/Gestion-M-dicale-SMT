import { useState, useEffect } from "react";
import { Bell, Search } from "lucide-react";

const DAYS = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

function useLiveTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

/* ── Mini calendar ─────────────────────────────────────────────────── */
function MiniCalendar({ date }: { date: Date }) {
  const day   = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year  = date.getFullYear();
  const dow   = DAYS[date.getDay()];

  return (
    <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
      {/* Day-box */}
      <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-300/40 hover-lift cursor-default">
        <span className="text-[16px] font-extrabold leading-none">{day}</span>
        <span className="text-[8px] font-semibold uppercase tracking-wider opacity-80">{month}</span>
      </div>
      {/* Day + year label */}
      <div>
        <p className="text-[13px] font-semibold text-slate-700 leading-tight">{dow}</p>
        <p className="text-[11px] text-slate-400">{month} {year}</p>
      </div>
    </div>
  );
}

/* ── Digital clock ─────────────────────────────────────────────────── */
function DigitalClock({ date }: { date: Date }) {
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());

  return (
    <div className="flex items-center gap-1.5 bg-slate-900 px-4 py-2 rounded-xl hover-lift cursor-default">
      <span className="font-mono text-[17px] font-bold text-white tracking-wider">{h}</span>
      <span className="font-mono text-[14px] font-bold text-blue-400 animate-pulse">:</span>
      <span className="font-mono text-[17px] font-bold text-white tracking-wider">{m}</span>
      <span className="font-mono text-[14px] font-bold text-blue-400 animate-pulse">:</span>
      <span className="font-mono text-[17px] font-bold text-slate-400 tracking-wider">{s}</span>
    </div>
  );
}

/* ── TopBar ────────────────────────────────────────────────────────── */
export default function TopBar() {
  const now = useLiveTime();

  return (
    <div className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 shadow-[0_1px_0_0_#F1F5F9]">
      {/* Left: search */}
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-56 group hover-glow transition-all duration-300">
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Rechercher un agent…"
          className="bg-transparent text-[12px] text-slate-600 placeholder-slate-400 outline-none w-full"
        />
      </div>

      {/* Right: clock + calendar + notif */}
      <div className="flex items-center gap-4">
        <DigitalClock date={now} />
        <MiniCalendar date={now} />

        {/* Notification bell */}
        <button className="relative w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center hover-lift hover-glow transition-all duration-200 cursor-pointer">
          <Bell className="w-4 h-4 text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 border-2 border-white" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-200 hover-lift cursor-pointer">
          <span className="text-[11px] font-bold text-white">SM</span>
        </div>
      </div>
    </div>
  );
}
