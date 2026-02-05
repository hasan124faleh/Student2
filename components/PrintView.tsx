import React from 'react';
import { Student } from '../types';

interface PrintViewProps {
  students: Student[];
  title?: string;
}

export const PrintView: React.FC<PrintViewProps> = ({ students, title }) => {
  // Sort alphabetically for print
  const sortedStudents = [...students].sort((a, b) => a.firstName.localeCompare(b.firstName));
  
  const ROWS_PER_COLUMN = 30;
  const COLUMNS_PER_PAGE = 2;
  const ITEMS_PER_PAGE = ROWS_PER_COLUMN * COLUMNS_PER_PAGE;
  
  const pages = [];
  for (let i = 0; i < sortedStudents.length; i += ITEMS_PER_PAGE) {
    pages.push(sortedStudents.slice(i, i + ITEMS_PER_PAGE));
  }

  return (
    <div className="print-only text-[10pt] dir-rtl font-cairo">
      {pages.map((pageStudents, pageIndex) => (
        <div key={pageIndex} className="flex flex-col w-full h-[100vh] box-border p-[1cm] break-after-page relative">
           {/* Header for each page */}
           <div className="w-full text-center border-b-2 border-black pb-2 mb-4">
              <h1 className="text-xl font-bold">{title || "فهرس القيد العام"}</h1>
           </div>

           <div className="flex flex-row gap-[1cm] flex-1">
             {[0, 1].map((colIndex) => {
               const colStart = colIndex * ROWS_PER_COLUMN;
               const colStudents = pageStudents.slice(colStart, colStart + ROWS_PER_COLUMN);
               
               return (
                 <div key={colIndex} className="flex-1 flex flex-col">
                   {colStudents.length > 0 && (
                     <table className="w-full border-collapse border border-black">
                       <thead>
                         <tr className="bg-gray-100">
                           <th className="border border-black p-1 text-center w-[45px]">م</th>
                           <th className="border border-black p-1 text-right">الاسم الكامل</th>
                           <th className="border border-black p-1 text-center w-[60px] font-bold">قيد</th>
                           <th className="border border-black p-1 text-center w-[45px] font-bold">ص</th>
                         </tr>
                       </thead>
                       <tbody>
                         {colStudents.map((s, idx) => {
                           const globalIndex = (pageIndex * ITEMS_PER_PAGE) + colStart + idx + 1;
                           return (
                             <tr key={s.id}>
                               <td className="border border-black p-1 text-center">{globalIndex}</td>
                               <td className="border border-black p-1 text-right">{s.firstName} {s.lastName ? `/ ${s.lastName}` : ''}</td>
                               <td className="border border-black p-1 text-center font-bold font-mono" dir="ltr">{s.regNumber}</td>
                               <td className="border border-black p-1 text-center font-bold font-mono">{s.pageNumber}</td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   )}
                 </div>
               );
             })}
           </div>
           
           {/* Footer Page Number */}
           <div className="absolute bottom-4 left-0 w-full text-center text-xs text-gray-500">
              صفحة {pageIndex + 1} من {pages.length}
           </div>
        </div>
      ))}
    </div>
  );
};