import React from 'react';
import { Student } from '../types.ts';

interface PrintViewProps {
  students: Student[];
  title?: string;
}

export const PrintView: React.FC<PrintViewProps> = ({ students, title }) => {
  const sortedStudents = [...students].sort((a, b) => a.firstName.localeCompare(b.firstName));
  const ROWS_PER_COLUMN = 30;
  const COLUMNS_PER_PAGE = 2;
  const ITEMS_PER_PAGE = ROWS_PER_COLUMN * COLUMNS_PER_PAGE;
  
  const pages = [];
  for (let i = 0; i < sortedStudents.length; i += ITEMS_PER_PAGE) {
    pages.push(sortedStudents.slice(i, i + ITEMS_PER_PAGE));
  }
  
  const extractionDate = new Date().toLocaleDateString('ar-EG');

  return (
    <div className="print-only text-[9pt] dir-rtl">
      {pages.map((pageStudents, pageIndex) => (
        <div key={pageIndex} className="flex flex-col w-full h-[297mm] box-border p-[1cm] break-after-page relative">
           <div className="w-full text-center border-b-2 border-black pb-2 mb-4">
              <h1 className="text-xl font-bold">{title || "فهرس القيد العام"}</h1>
           </div>
           <div className="flex flex-row gap-[1cm] h-full">
             {[0, 1].map((colIndex) => {
               const colStart = colIndex * ROWS_PER_COLUMN;
               const colStudents = pageStudents.slice(colStart, colStart + ROWS_PER_COLUMN);
               return (
                 <div key={colIndex} className="flex-1 flex flex-col h-full border border-black/10">
                   {colStudents.length > 0 && (
                     <table className="w-full border-collapse border border-black table-fixed h-full">
                       <thead>
                         <tr className="bg-gray-100 h-[30px]">
                           <th className="border border-black p-1 text-center w-[30px] text-[8pt]">ت</th>
                           <th className="border border-black p-1 text-right">الاسم الكامل</th>
                           <th className="border border-black p-1 text-center w-[35px] font-bold text-[8pt]">ق</th>
                           <th className="border border-black p-1 text-center w-[35px] font-bold text-[8pt]">ص</th>
                         </tr>
                       </thead>
                       <tbody>
                         {colStudents.map((s, idx) => {
                           const globalIndex = (pageIndex * ITEMS_PER_PAGE) + colStart + idx + 1;
                           return (
                             <tr key={s.id} className="h-[28px]">
                               <td className="border border-black px-1 text-center font-medium">{globalIndex}</td>
                               <td className="border border-black px-2 align-middle whitespace-nowrap overflow-hidden leading-relaxed font-bold">
                                 {s.firstName} {s.lastName ? <span className="text-gray-700">/ {s.lastName}</span> : ''}
                               </td>
                               <td className="border border-black px-1 text-center font-bold font-mono text-[10pt] align-middle dir-ltr">{s.regNumber}</td>
                               <td className="border border-black px-1 text-center font-bold font-mono text-[10pt] align-middle">{s.pageNumber}</td>
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
           
           {/* Footer with Date and Page Number */}
           <div className="absolute bottom-4 left-0 w-full px-[1cm] flex justify-between items-center text-xs text-gray-500">
              <span>تم الاستخراج: {extractionDate}</span>
              <span>صفحة {pageIndex+1} من {pages.length}</span>
           </div>
        </div>
      ))}
    </div>
  );
};