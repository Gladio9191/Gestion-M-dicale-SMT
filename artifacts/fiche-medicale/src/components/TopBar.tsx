import { useState, useEffect } from "react";
import { Bell, Search, Settings } from "lucide-react";

const DAYS   = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

function useLiveTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return now;
}
const pad = (n: number) => String(n).padStart(2, "0");

export default function TopBar() {
  const now = useLiveTime();
  const h   = pad(now.getHours());
  const m   = pad(now.getMinutes());
  const s   = pad(now.getSeconds());
  const dateStr = `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 shadow-sm">

      {/* Search */}
      <div className="flex items-center gap-2.5 bg-[#F0F4FF] rounded-xl px-4 py-2.5 w-64 hover-glow transition-all duration-200">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Rechercher..."
          className="bg-transparent text-[13px] text-slate-600 placeholder-slate-400 outline-none w-full"
        />
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3">

        {/* Live clock */}
        <div className="flex items-center gap-1 bg-[#F0F4FF] px-4 py-2 rounded-xl cursor-default select-none">
          <span className="font-mono text-[15px] font-bold text-[#2563EB]">{h}</span>
          <span className="font-mono text-[13px] font-bold text-slate-400 animate-pulse">:</span>
          <span className="font-mono text-[15px] font-bold text-[#2563EB]">{m}</span>
          <span className="font-mono text-[13px] font-bold text-slate-400 animate-pulse">:</span>
          <span className="font-mono text-[15px] font-bold text-slate-400">{s}</span>
        </div>

        {/* Date */}
        <div className="text-right cursor-default select-none">
          <p className="text-[12px] font-semibold text-slate-700">{dateStr}</p>
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-slate-200" />

        {/* Notif */}
        <button className="relative w-9 h-9 rounded-xl bg-[#F0F4FF] flex items-center justify-center hover-lift transition-all duration-200">
          <Bell className="w-4 h-4 text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
        </button>

        {/* Settings */}
        <button className="w-9 h-9 rounded-xl bg-[#F0F4FF] flex items-center justify-center hover-lift transition-all duration-200">
          <Settings className="w-4 h-4 text-slate-500" />
        </button>

        {/* Separator */}
        <div className="w-px h-6 bg-slate-200" />

        {/* User */}
        <div className="flex items-center gap-2.5 cursor-pointer hover-lift">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#6366F1] flex items-center justify-center shadow-sm shadow-blue-200">
            <span className="text-[11px] font-extrabold text-white">DR</span>
          </div>
          <div>
            <p className="text-[12px] font-bold text-slate-800 leading-tight">Dr. Smt</p>
            <p className="text-[10px] text-slate-400">Médecin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
