import * as XLSX from 'xlsx';
import { Student } from '../types';

export const exportToExcel = (students: Student[]) => {
  const data = students.map(s => ({
    'الاسم الأول': s.firstName,
    'اللقب': s.lastName,
    'رقم القيد': s.regNumber,
    'رقم الصفحة': s.pageNumber,
    'الملاحظات': s.notes || '',
    'تاريخ الإضافة': new Date(s.createdAt).toLocaleDateString('ar-EG')
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "الطلاب");
  XLSX.writeFile(workbook, "سجل_الطلاب.xlsx");
};

export const generateTemplate = () => {
  const firstNames = ['محمد', 'أحمد', 'محمود', 'علي'];
  const lastNames = ['الزايدي', 'الشمري', 'القحطاني', 'العتيبي'];
  const templateData = [];

  for (let i = 1; i <= 10; i++) {
    const fIndex = Math.floor(Math.random() * firstNames.length);
    const lIndex = Math.floor(Math.random() * lastNames.length);
    templateData.push({
      'الاسم الأول': firstNames[fIndex],
      'اللقب': lastNames[lIndex],
      'رقم القيد': `REG-00${i}`,
      'رقم الصفحة': `${Math.ceil(i/4)}`,
      'الملاحظات': `مثال`
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "نموذج الطلاب");
  XLSX.writeFile(workbook, "نموذج_سجل_الطلاب.xlsx");
};

export const readExcel = (file: File): Promise<Record<string, any>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
           reject(new Error("ملف Excel فارغ"));
           return;
        }
        const firstSheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet);
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};