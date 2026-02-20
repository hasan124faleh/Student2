import React, { useMemo } from 'react';
import { cleanName } from '../utils/excelUtils';

interface Student {
  id: string;
  firstName: string;
  lastName?: string;
  regNumber: string;
  pageNumber: string;
  status?: string;
  notes?: string;
  createdAt: number;
  isDeleted?: boolean;
  printIndex?: number;
}

interface PrintViewProps {
  students: Student[];
  title: string;
}

const PrintView: React.FC<PrintViewProps> = ({ students, title }) => {
  const sortedStudents = useMemo(() => {
     return [...students].sort((a, b) => a.firstName.localeCompare(b.firstName)).map((s, i) => ({ ...s, printIndex: i + 1 }));
  }, [students]);

  const ROWS_PER_COLUMN_MAX = 31; 
  const COLUMNS_PER_PAGE = 2;
  const MAX_ITEMS_PER_PAGE = ROWS_PER_COLUMN_MAX * COLUMNS_PER_PAGE;
  const totalItems = sortedStudents.length;
  const totalPages = Math.ceil(totalItems / MAX_ITEMS_PER_PAGE);
  const printDate = new Date().toLocaleDateString('ar-EG');
  
  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push(sortedStudents.slice(i * MAX_ITEMS_PER_PAGE, (i + 1) * MAX_ITEMS_PER_PAGE));
  }
  
  return (
    <div className="print-only text-[9.5pt] dir-rtl">
      {pages.map((pageStudents, pageIndex) => (
        <div key={pageIndex} className="print-page-container">
           <div className="flex justify-between items-end border-b-2 border-black pb-2 mb-4 w-full h-[40px]">
              <div className="text-[10px] font-medium text-gray-500 w-32 text-right">صفحة {pageIndex + 1} من {totalPages}</div>
              <h1 className="text-xl font-bold flex-1 text-center">{title || "فهرس القيد العام"}</h1>
              <div className="text-[10px] font-medium text-gray-500 w-32 text-left">تاريخ: {printDate}</div>
           </div>
           <div className="flex flex-row gap-[8mm] flex-1">
             {[0, 1].map((colIndex) => {
               const colStudents = pageStudents.slice(colIndex * ROWS_PER_COLUMN_MAX, (colIndex + 1) * ROWS_PER_COLUMN_MAX);
               return (
                 <div key={colIndex} className="flex-1 flex flex-col">
                   <table className="w-full border-collapse table-fixed">
                     <thead>
                       <tr className="bg-gray-100 h-[36px]">
                         <th className="p-1 text-center w-[35px] text-[8.5pt]">ت</th>
                         <th className="p-1 text-right">الاسم الكامل</th>
                         <th className="p-1 text-center w-[40px] font-bold text-[8.5pt]">ق</th>
                         <th className="p-1 text-center w-[40px] font-bold text-[8.5pt]">ص</th>
                       </tr>
                     </thead>
                     <tbody>
                       {Array.from({ length: ROWS_PER_COLUMN_MAX }).map((_, rowIndex) => {
                         const s = colStudents[rowIndex];
                         return (
                           <tr key={rowIndex} className="h-[31px]">
                             <td className="px-1 text-center font-medium whitespace-nowrap">{s ? s.printIndex : ''}</td>
                             <td className="px-2 align-middle whitespace-nowrap overflow-hidden leading-relaxed font-bold">{s ? cleanName(s.firstName) : ''}</td>
                             <td className="px-1 text-center font-bold font-mono text-[10.5pt] align-middle">{s ? s.regNumber : ''}</td>
                             <td className="px-1 text-center font-bold font-mono text-[10.5pt] align-middle">{s ? s.pageNumber : ''}</td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
               );
             })}
           </div>
        </div>
      ))}
    </div>
  );
};

export default PrintView;
