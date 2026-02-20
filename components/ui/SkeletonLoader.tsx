import React from 'react';

export const SkeletonLoader: React.FC = () => (
  <div className="animate-pulse space-y-4">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 h-20"></div>
      ))}
    </div>
    <div className="bg-white p-2 rounded-xl border border-slate-100 h-12"></div>
  </div>
);
