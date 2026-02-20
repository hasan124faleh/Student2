import * as XLSX from 'xlsx';

export const cleanName = (name: string) => {
    if (!name) return "";
    return name.replace(/\s+\d+$/, '').trim();
};

export const formatDateForInput = (timestamp: number | string | undefined) => {
    if (!timestamp) return new Date().toISOString().split('T')[0];
    return new Date(timestamp).toISOString().split('T')[0];
};

export const exportToExcel = (students: any[]) => {
  const statusMap: Record<string, string> = { 'active': 'مستمر', 'transferred': 'منقول', 'left': 'تارك', 'graduated': 'تخرج' };
  const data = students.map(s => ({
    'الاسم الأول': cleanName(s.firstName),
    'اللقب': s.lastName,
    'رقم القيد': s.regNumber,
    'رقم الصفحة': s.pageNumber,
    'الحالة': statusMap[s.status || 'active'] || 'مستمر',
    'الملاحظات': s.notes || '',
    'تاريخ الإضافة': new Date(s.createdAt).toLocaleDateString('ar-EG')
  }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "الطلاب");
  XLSX.writeFile(workbook, "سجل_الطلاب.xlsx");
};

export const generateTemplate = () => {
  const firstNames = ['محمد', 'أحمد', 'عبدالله', 'علي', 'عمر', 'خالد', 'سعد', 'سعيد', 'صالح', 'فهد', 'سلمان', 'يوسف', 'إبراهيم'];
  const secondNames = ['حسين', 'حسن', 'عبدالرحمن', 'محمود', 'مصطفى', 'جعفر', 'عباس', 'كاظم', 'رضا', 'مهدي'];
  const thirdNames = ['علي', 'محمد', 'جاسم', 'كريم', 'خلف', 'سالم', 'حمزة', 'فاضل'];
  const fourthNames = ['عبدالله', 'ناصر', 'منصور', 'خليفة', 'سلطان', 'يحيى', 'زكريا'];
  const titles = ['الشمري', 'العتيبي', 'القحطاني', 'العنزي', 'الحربي', 'الزهراني', 'المالكي', 'الدوسري', 'التميمي', 'الخالدي'];

  const templateData = [];
  
  for (let reg = 1; reg <= 10; reg++) {
    for (let i = 0; i < 200; i++) {
       const n1 = firstNames[Math.floor(Math.random() * firstNames.length)];
       const n2 = secondNames[Math.floor(Math.random() * secondNames.length)];
       const n3 = thirdNames[Math.floor(Math.random() * thirdNames.length)];
       const n4 = fourthNames[Math.floor(Math.random() * fourthNames.length)];
       const title = titles[Math.floor(Math.random() * titles.length)];
       
       const pageNum = Math.floor(i / 30) + 1;

       templateData.push({
          'الاسم الأول': `${n1} ${n2} ${n3} ${n4}`, 
          'اللقب': title,
          'رقم القيد': reg.toString(),
          'رقم الصفحة': pageNum.toString(),
          'الحالة': 'مستمر',
          'الملاحظات': ''
       });
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "نموذج 2000 طالب");
  XLSX.writeFile(workbook, "نموذج_سجل_القيود_الكبير.xlsx");
};

export const readExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
        resolve(jsonData);
      } catch (err) { reject(err); }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
