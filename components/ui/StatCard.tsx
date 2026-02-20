import React from 'react';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, colorClass, onClick }) => (
  <div onClick={onClick} className={`bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-1.5 hover:shadow-md transition-all ${onClick ? 'cursor-pointer active:scale-95' : ''}`}>
    <div className={`p-2 rounded-xl ${colorClass} text-white shadow-md`}>{icon}</div>
    <div>
      <div className="text-xl font-black text-slate-800 font-mono">{value}</div>
      <div className="text-[10px] text-slate-500 font-bold">{title}</div>
    </div>
  </div>
);
