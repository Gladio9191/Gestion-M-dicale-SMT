import { Search, Bell, Settings, Calendar, LayoutGrid } from "lucide-react";

function IconBtn({ icon: Icon, badge }: { icon: React.ElementType; badge?: boolean }) {
  return (
    <button className="relative w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:shadow-sm transition-all duration-200">
      <Icon className="w-[17px] h-[17px] text-slate-500" />
      {badge && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
      )}
    </button>
  );
}

export default function TopBar() {
  return (
    <div className="h-[60px] bg-white border-b border-slate-200/70 flex items-center justify-between px-5 shrink-0 shadow-sm">

      {/* Search */}
      <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 w-64 transition-all duration-200 hover-glow">
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Rechercher..."
          className="bg-transparent text-[12.5px] text-slate-600 placeholder-slate-400 outline-none w-full"
        />
      </div>

      {/* Right icon buttons */}
      <div className="flex items-center gap-2">
        <IconBtn icon={Calendar} />
        <IconBtn icon={LayoutGrid} />
        <IconBtn icon={Settings} />
        <IconBtn icon={Bell} badge />
      </div>
    </div>
  );
}
