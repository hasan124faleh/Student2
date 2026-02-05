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
  const firstNames = ['محمد', 'أحمد', 'عبدالله', 'علي', 'عمر', 'خالد', 'سعد', 'سعيد', 'صالح', 'فهد', 'سلمان', 'عبدالرحمن', 'إبراهيم', 'يوسف', 'محمود', 'حسن', 'حسين', 'ماجد', 'نايف', 'سلطان'];
  const midNames = ['محمد', 'علي', 'صالح', 'عبدالله', 'حمد', 'سليمان', 'عبدالعزيز', 'سالم', 'ناصر', 'راشد', 'خلف', 'سعود', 'فواز', 'عادل', 'منصور', 'تركي'];
  const lastNames = ['الشمري', 'العتيبي', 'القحطاني', 'العنزي', 'الحربي', 'الزهراني', 'الغامدي', 'المطيري', 'الدوسري', 'السبيعي', 'المالكي', 'عسيري', 'الشهري', 'الرويلي', 'الخالدي'];

  const templateData = [];

  for (let i = 0; i < 1000; i++) {
    const n1 = firstNames[Math.floor(Math.random() * firstNames.length)];
    const n2 = midNames[Math.floor(Math.random() * midNames.length)];
    const n3 = midNames[Math.floor(Math.random() * midNames.length)];
    const n4 = midNames[Math.floor(Math.random() * midNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    // Ensure uniqueness: 100 pages, 10 students per page
    const regNum = (i % 10) + 1;
    const pageNum = Math.floor(i / 10) + 1;
    
    // Status probability
    const rand = Math.random();
    let status = 'مستمر';
    if (rand > 0.95) status = 'تارك';
    else if (rand > 0.9) status = 'منقول';

    templateData.push({
      'الاسم الأول': `${n1} ${n2} ${n3} ${n4}`,
      'اللقب': ln,
      'رقم القيد': regNum.toString(),
      'رقم الصفحة': pageNum.toString(),
      'الحالة': status,
      'الملاحظات': ''
    });
  }
  
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "نموذج 1000 طالب");
  XLSX.writeFile(workbook, "نموذج_سجل_الطلاب_الكبير.xlsx");
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