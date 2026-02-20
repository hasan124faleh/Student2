import React from 'react';
import { Student } from '../types';
import { cleanName } from '../utils/excelUtils';

interface SingleStudentPrintProps {
  student: Student;
}

export const SingleStudentPrint: React.FC<SingleStudentPrintProps> = ({ student }) => {
  const statusLabels: Record<string, string> = { 'active': 'مستمر', 'transferred': 'منقول', 'left': 'تارك', 'graduated': 'تخرج' };
  const printDate = new Date().toLocaleDateString('ar-EG');
  return (
    <div className="hidden print:flex flex-col items-center justify-start w-full h-screen bg-white p-0 overflow-hidden">
      <div className="w-[190mm] h-[250mm] border-[6px] border-double border-slate-800 p-6 rounded-none relative overflow-hidden flex flex-col justify-between mx-auto mt-0 shadow-none">
        <div className="absolute top-2 right-2 w-16 h-16 border-t-4 border-r-4 border-slate-900"></div>
        <div className="absolute top-2 left-2 w-16 h-16 border-t-4 border-l-4 border-slate-900"></div>
        <div className="absolute bottom-2 right-2 w-16 h-16 border-b-4 border-r-4 border-slate-900"></div>
        <div className="absolute bottom-2 left-2 w-16 h-16 border-b-4 border-l-4 border-slate-900"></div>

        <div className="text-center border-b-2 border-slate-900 pb-4 mb-4 relative z-10">
          <div className="flex justify-between items-start mb-2 px-2">
            <div className="text-sm font-bold leading-relaxed">جمهورية العراق<br/>وزارة التربية<br/>المديرية العامة للتربية</div>
            <div className="w-20 h-20 border-2 border-slate-800 rounded-full flex items-center justify-center bg-slate-50 shadow-sm"><span className="text-3xl">🎓</span></div>
            <div className="text-sm font-bold leading-relaxed text-left">التاريخ: {printDate}<br/>العدد: ............</div>
          </div>
          <h1 className="text-4xl font-black text-slate-900 mt-4 font-cairo tracking-wide">بطاقة الطالب الشخصية</h1>
          <p className="text-lg font-bold text-slate-600 mt-2 bg-slate-100 inline-block px-6 py-1 rounded-full border border-slate-300">نسخة طبق الأصل من سجل القيود</p>
        </div>

        <div className="flex-1 flex flex-col gap-4 justify-start pt-2 px-4 relative z-10">
           <div className="text-center space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-lg font-bold text-slate-500 block">الاسم الرباعي واللقب</span>
              <div className="text-3xl font-black text-slate-900 pb-1">{cleanName(student.firstName)} {student.lastName || ''}</div>
           </div>

           <div className="grid grid-cols-2 gap-6 my-2">
              <div className="border-2 border-slate-800 p-4 text-center rounded-xl bg-white shadow-[2px_2px_0px_0px_rgba(30,41,59,1)]">
                <span className="text-base font-bold text-slate-600 uppercase block mb-1">رقم القيد العام</span>
                <div className="text-5xl font-mono font-black text-slate-900 tracking-wider">{student.regNumber}</div>
              </div>
              <div className="border-2 border-slate-800 p-4 text-center rounded-xl bg-white shadow-[2px_2px_0px_0px_rgba(30,41,59,1)]">
                <span className="text-base font-bold text-slate-600 uppercase block mb-1">رقم الصفحة</span>
                <div className="text-5xl font-mono font-black text-slate-900 tracking-wider">{student.pageNumber}</div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-6 text-right px-2 mt-2">
              <div className="flex flex-col border-b-2 border-slate-200 pb-2">
                 <span className="text-base font-bold text-slate-500 mb-1">الحالة الدراسية</span>
                 <span className="text-2xl font-bold text-slate-900">{statusLabels[student.status || 'active']}</span>
              </div>
              <div className="flex flex-col border-b-2 border-slate-200 pb-2">
                 <span className="text-base font-bold text-slate-500 mb-1">تاريخ التسجيل</span>
                 <span className="text-2xl font-bold text-slate-900 font-mono">{new Date(student.createdAt).toLocaleDateString('ar-EG')}</span>
              </div>
              {student.notes && (
                <div className="col-span-2 flex flex-col bg-yellow-50 p-3 rounded-xl border border-yellow-200 mt-1">
                   <span className="text-xs font-bold text-yellow-700 mb-1">ملاحظات</span>
                   <span className="text-lg font-bold text-slate-800">{student.notes}</span>
                </div>
              )}
           </div>
        </div>

        <div className="mt-4 pt-4 border-t-2 border-slate-900 flex justify-between items-end px-8 pb-4 relative z-10">
           <div className="text-center"><div className="h-16"></div><div className="font-bold text-lg text-slate-900 border-t-2 border-slate-900 pt-2 w-40 mx-auto">توقيع الموظف المختص</div></div>
           <div className="text-center"><div className="h-16"></div><div className="font-bold text-lg text-slate-900 border-t-2 border-slate-900 pt-2 w-40 mx-auto">ختم وتوقيع المدير</div></div>
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none z-0 select-none">
             <div className="transform -rotate-45 text-[150px] font-black text-slate-900 whitespace-nowrap border-4 border-slate-900 p-12 rounded-3xl">سجل رسمي</div>
        </div>
      </div>
    </div>
  );
};
