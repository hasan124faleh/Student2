import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, LogOut, Settings, Search, Plus, Printer, 
  Trash2, FileSpreadsheet, Download, Upload, AlertTriangle, ArrowRight, Save, X, FileText, CheckCircle2, XCircle, AlertCircle, ArrowUp
} from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { 
  getDocs, addDoc, doc, updateDoc, deleteDoc, writeBatch 
} from 'firebase/firestore';
import { auth, db, studentsCollection } from './firebase';
import * as XLSX from 'xlsx';

// --- Types & Interfaces ---

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  regNumber: string;
  pageNumber: string;
  notes: string;
  status?: string;
  createdAt: number;
}

export type SortOption = 'recent' | 'alphabetical';

export interface Stats {
  totalStudents: number;
  uniqueRegNumbers: number;
  totalPages: number;
}

// --- Excel Utilities ---

const exportToExcel = (students: Student[]) => {
  const statusMap: Record<string, string> = { 'active': 'مستمر', 'transferred': 'منقول', 'left': 'تارك' };
  const data = students.map(s => ({
    'الاسم الأول': s.firstName,
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

const generateTemplate = () => {
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

const readExcel = (file: File): Promise<Record<string, any>[]> => {
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

// --- Sub Components ---

const Modal: React.FC<{ children: React.ReactNode, onClose: () => void }> = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in overflow-y-auto" onClick={onClose}>
    <div className="w-full max-w-xl relative" onClick={e => e.stopPropagation()}>
       {children}
    </div>
  </div>
);

const PrintView: React.FC<{ students: Student[] }> = ({ students }) => {
  const sortedStudents = [...students].sort((a, b) => a.firstName.localeCompare(b.firstName));
  const ROWS_PER_COLUMN = 30;
  const COLUMNS_PER_PAGE = 2;
  const ITEMS_PER_PAGE = ROWS_PER_COLUMN * COLUMNS_PER_PAGE;
  
  const pages = [];
  for (let i = 0; i < sortedStudents.length; i += ITEMS_PER_PAGE) {
    pages.push(sortedStudents.slice(i, i + ITEMS_PER_PAGE));
  }

  return (
    <div className="print-only text-[10pt] dir-rtl">
      {pages.map((pageStudents, pageIndex) => (
        <div key={pageIndex} className="flex flex-row w-full h-[100vh] box-border p-[1cm] gap-[1cm] break-after-page">
           {[0, 1].map((colIndex) => {
             const colStart = colIndex * ROWS_PER_COLUMN;
             const colStudents = pageStudents.slice(colStart, colStart + ROWS_PER_COLUMN);
             
             return (
               <div key={colIndex} className="flex-1 flex flex-col">
                 {colStudents.length > 0 && (
                   <table className="w-full border-collapse border border-black">
                     <thead>
                       <tr className="bg-gray-100">
                         <th className="border border-black p-1 text-center w-[45px]">التسلسل</th>
                         <th className="border border-black p-1 text-right">الاسم الكامل</th>
                         <th className="border border-black p-1 text-center w-[75px] font-bold">ق</th>
                         <th className="border border-black p-1 text-center w-[55px] font-bold">ص</th>
                       </tr>
                     </thead>
                     <tbody>
                       {colStudents.map((s, idx) => {
                         const globalIndex = (pageIndex * ITEMS_PER_PAGE) + colStart + idx + 1;
                         return (
                           <tr key={s.id}>
                             <td className="border border-black p-1 text-center">{globalIndex}</td>
                             <td className="border border-black p-1">{s.firstName} {s.lastName ? `/ ${s.lastName}` : ''}</td>
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
      ))}
    </div>
  );
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('خطأ في البريد الإلكتروني أو كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sky-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
             <Users className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">تسجيل الدخول</h2>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'جاري التحقق...' : 'دخول النظام'}
          </button>
        </form>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; colorClass: string }> = ({ title, value, icon, colorClass }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
    <div className={`p-3 rounded-xl ${colorClass}`}>
      {icon}
    </div>
    <div>
      <h4 className="text-sm text-slate-500 mb-1">{title}</h4>
      <div className="text-2xl font-bold text-slate-800 font-mono">{value}</div>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status?: string }) => {
   if (status === 'transferred') return <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold border border-amber-200">منقول</span>;
   if (status === 'left') return <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs font-bold border border-rose-200">تارك</span>;
   return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold border border-emerald-200">مستمر</span>;
};

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-slate-50 p-8 flex flex-col gap-6 animate-pulse">
    <div className="h-16 bg-slate-200 rounded-xl w-full"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-24 bg-slate-200 rounded-xl"></div>
      <div className="h-24 bg-slate-200 rounded-xl"></div>
      <div className="h-24 bg-slate-200 rounded-xl"></div>
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [view, setView] = useState<'list' | 'add' | 'edit' | 'settings' | 'detail'>('list');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(''); 
  const [filterRegOnly, setFilterRegOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [letterFilter, setLetterFilter] = useState('ALL');
  
  // Infinite Scroll State
  const [visibleCount, setVisibleCount] = useState(50);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Scroll To Top State
  const [showTopBtn, setShowTopBtn] = useState(false);

  // Print Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printRegInput, setPrintRegInput] = useState('');

  // Import State
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Form State
  const [nameWarning, setNameWarning] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchStudents();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Debounce Search Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300); 

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset infinite scroll when filters change
  useEffect(() => {
    setVisibleCount(50);
    window.scrollTo(0, 0);
  }, [debouncedQuery, filterRegOnly, statusFilter, sortBy, letterFilter]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 50);
        }
      },
      { threshold: 0.5, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [students.length, debouncedQuery]); 

  // Scroll event listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowTopBtn(true);
      } else {
        setShowTopBtn(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(studentsCollection);
      const loadedStudents: Student[] = [];
      querySnapshot.forEach((doc) => {
        loadedStudents.push({ id: doc.id, status: 'active', ...doc.data() } as Student);
      });
      loadedStudents.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setStudents(loadedStudents);
    } catch (e) {
      console.error("Error fetching", e);
      alert("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const checkDuplicate = (val: string) => {
    if (!val || val.length < 2) { setNameWarning(''); return; }
    const matches = students.filter(s => 
       s.firstName.trim().includes(val.trim()) && 
       s.id !== selectedStudentId
    );
    if (matches.length > 0) {
      const info = matches.slice(0, 5).map(m => `• ${m.firstName} (قيد: ${m.regNumber} - صفحة: ${m.pageNumber})`).join('\n');
      setNameWarning(`تنبيه: يوجد ${matches.length} طلاب بأسماء مشابهة:\n${info}${matches.length > 5 ? '\n...والمزيد' : ''}`);
    } else {
      setNameWarning('');
    }
  };

  // Filter Logic
  const filteredStudents = useMemo(() => {
    let result = students.filter(s => {
      const sName = s.firstName.trim();
      if (letterFilter !== 'ALL' && !sName.startsWith(letterFilter)) return false;
      
      // Status Filter
      if (statusFilter !== 'ALL' && (s.status || 'active') !== statusFilter) return false;

      if (!debouncedQuery) return true;
      
      const query = debouncedQuery.toLowerCase();
      const reg = (s.regNumber || '').toLowerCase();
      
      if (filterRegOnly) {
        return reg === query; 
      }
      
      const first = (s.firstName || '').toLowerCase();
      const last = (s.lastName || '').toLowerCase();
      return first.includes(query) || last.includes(query) || reg.includes(query);
    });

    if (sortBy === 'alphabetical') {
      result.sort((a, b) => a.firstName.localeCompare(b.firstName));
    } else {
      result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return result;
  }, [students, debouncedQuery, filterRegOnly, statusFilter, sortBy, letterFilter]);

  // Visible Students (Sliced)
  const displayedStudents = useMemo(() => {
    return filteredStudents.slice(0, visibleCount);
  }, [filteredStudents, visibleCount]);

  const arabicLetters = ['أ', 'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'];

  // Actions
  const handleLogout = async () => {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      await signOut(auth);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      try {
        await deleteDoc(doc(db, "students", id));
        setStudents(prev => prev.filter(s => s.id !== id));
        if (view === 'detail') setView('list');
      } catch (e) {
        alert("فشل الحذف");
      }
    }
  };

  const handleDeleteAll = async () => {
    if (confirm('تحذير: هل أنت متأكد من حذف جميع البيانات؟') && confirm('تأكيد نهائي؟')) {
       setLoading(true);
       try {
         const allIds = students.map(s => s.id);
         const CHUNK_SIZE = 400; 
         
         for (let i = 0; i < allIds.length; i += CHUNK_SIZE) {
            const batch = writeBatch(db);
            const chunk = allIds.slice(i, i + CHUNK_SIZE);
            chunk.forEach(id => batch.delete(doc(db, "students", id)));
            await batch.commit();
         }
         
         setStudents([]);
         alert("تم الحذف");
         setView('list');
       } catch (e) {
         console.error(e);
         alert("حدث خطأ أثناء الحذف");
       } finally {
         setLoading(false);
       }
    }
  };

  const handleSaveStudent = async (e: React.FormEvent<HTMLFormElement>, isEdit: boolean) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      regNumber: formData.get('regNumber') as string,
      pageNumber: formData.get('pageNumber') as string,
      notes: formData.get('notes') as string,
      status: formData.get('status') as string || 'active'
    };

    // Validation
    const exists = students.some(s => 
      s.id !== selectedStudentId && 
      s.regNumber === data.regNumber && 
      s.pageNumber === data.pageNumber
    );
    if (exists) {
      alert('خطأ: هذا القيد مسجل في نفس الصفحة مسبقاً!');
      return;
    }

    try {
      if (isEdit && selectedStudentId) {
        await updateDoc(doc(db, "students", selectedStudentId), data);
        setStudents(prev => prev.map(s => s.id === selectedStudentId ? { ...s, ...data } : s));
      } else {
        const newStudent = { ...data, createdAt: Date.now() };
        const docRef = await addDoc(studentsCollection, newStudent);
        setStudents(prev => [{ id: docRef.id, ...newStudent } as Student, ...prev]);
      }
      setView('list');
    } catch (err) {
      alert("فشل الحفظ");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportProgress(0);

    try {
      const rows = await readExcel(file);
      let count = 0;
      const signatures = new Set(students.map(s => `${s.regNumber}-${s.pageNumber}`));
      const newItems: Student[] = [];
      
      const BATCH_SIZE = 400;
      let currentBatch = writeBatch(db);
      let batchCount = 0;

      for (const row of rows) {
         const fName = row['firstName'] || row['الاسم الأول'];
         const reg = row['regNumber'] || row['رقم القيد'];
         const page = row['pageNumber'] || row['رقم الصفحة'];
         const st = row['status'] || row['الحالة'] || 'active';
         let statusKey = 'active';
         if (st === 'منقول' || st === 'transferred') statusKey = 'transferred';
         if (st === 'تارك' || st === 'left') statusKey = 'left';

         if (fName && reg) {
           const sig = `${reg}-${page}`;
           if (!signatures.has(sig)) {
             const item = {
               firstName: String(fName).trim(),
               lastName: String(row['lastName'] || row['اللقب'] || '').trim(),
               regNumber: String(reg).trim(),
               pageNumber: String(page || '').trim(),
               notes: String(row['notes'] || row['الملاحظات'] || ''),
               status: statusKey,
               createdAt: Date.now() + count
             };
             
             const ref = doc(studentsCollection);
             currentBatch.set(ref, item);
             newItems.push({id: ref.id, ...item} as Student);
             signatures.add(sig);
             count++;
             batchCount++;
             
             if (batchCount >= BATCH_SIZE) {
               await currentBatch.commit();
               currentBatch = writeBatch(db);
               batchCount = 0;
             }
           }
         }
      }

      if (batchCount > 0) {
        await currentBatch.commit();
      }

      if (count > 0) {
        setStudents(prev => [...newItems, ...prev]);
        alert(`تم استيراد ${count} سجل بنجاح`);
      } else { 
        alert("لم يتم العثور على سجلات جديدة (ربما جميعها مكررة)"); 
      }

    } catch (err) {
      console.error(err);
      alert("خطأ أثناء الاستيراد");
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };
  
  const handleNumericInput = (e: React.FormEvent<HTMLInputElement>) => {
     e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '');
  };

  const handlePrint = (reg?: string) => {
     if (reg) {
        setSearchQuery(reg);
        setFilterRegOnly(true);
     }
     setShowPrintModal(false);
     setTimeout(() => window.print(), 500);
  };

  // Render Views
  if (loading) return <LoadingSkeleton />;
  if (!user) return <Login />;

  const stats: Stats = {
    totalStudents: students.length,
    uniqueRegNumbers: new Set(students.map(s => s.regNumber)).size,
    totalPages: new Set(students.map(s => s.pageNumber).filter(p => !!p)).size
  };
  
  let studentsToPrint = students;
  if (view === 'detail' && selectedStudentId) {
     studentsToPrint = students.filter(s => s.id === selectedStudentId);
  } else if (filterRegOnly && debouncedQuery) {
     studentsToPrint = filteredStudents;
  }

  return (
    <>
      <div className="min-h-screen no-print pb-20">
        <header className="bg-white/85 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-900 font-bold text-xl cursor-pointer" onClick={() => setView('list')}>
              <div className="bg-slate-900 text-white p-2 rounded-xl">
                <Users size={20} />
              </div>
              <span>فهرس الطلاب</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setView('settings')} className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                <Settings size={20} />
              </button>
              <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div className="animate-fade-in">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard 
                  title="إجمالي الطلاب" 
                  value={stats.totalStudents} 
                  icon={<Users size={24} />} 
                  colorClass="bg-slate-100 text-slate-700" 
                />
                <StatCard 
                  title="عدد القيود" 
                  value={stats.uniqueRegNumbers} 
                  icon={<FileSpreadsheet size={24} />} 
                  colorClass="bg-sky-100 text-sky-600" 
                />
                <StatCard 
                  title="الصفحات" 
                  value={stats.totalPages} 
                  icon={<Download size={24} />} 
                  colorClass="bg-emerald-100 text-emerald-600" 
                />
                <StatCard title="تارك/منقول" value={students.filter(s=>s.status!=='active').length} icon={<AlertTriangle size={24}/>} colorClass="bg-amber-100 text-amber-600" />
              </div>

              {/* Controls */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                 <div className="flex flex-wrap items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm w-full md:w-auto flex-1 max-w-3xl relative">
                    <Search className="text-slate-400 mx-2" size={20} />
                    <input 
                      type="text" 
                      placeholder="بحث..." 
                      className="flex-1 p-2 outline-none min-w-[120px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                     {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-red-500">
                          <X size={16} />
                        </button>
                      )}
                    
                    <div className="w-px h-6 bg-slate-200 mx-2"></div>
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer px-2 select-none hover:text-sky-600">
                      <input type="checkbox" checked={filterRegOnly} onChange={(e) => setFilterRegOnly(e.target.checked)} className="w-4 h-4 rounded text-sky-600" />
                      قيد فقط
                    </label>

                    <div className="w-px h-6 bg-slate-200 mx-2"></div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-transparent text-sm text-slate-600 outline-none cursor-pointer p-1">
                      <option value="ALL">كل الحالات</option>
                      <option value="active">مستمر</option>
                      <option value="transferred">منقول</option>
                      <option value="left">تارك</option>
                    </select>

                    <div className="w-px h-6 bg-slate-200 mx-2"></div>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="bg-transparent text-sm text-slate-600 outline-none cursor-pointer p-1">
                      <option value="recent">الأحدث</option>
                      <option value="alphabetical">أبجدي</option>
                    </select>
                 </div>

                 <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => setView('add')} className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors flex-1 md:flex-initial">
                      <Plus size={18} />
                      جديد
                    </button>
                    <button onClick={() => setShowPrintModal(true)} className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-colors flex-1 md:flex-initial">
                      <Printer size={18} />
                      طباعة
                    </button>
                 </div>
              </div>

              {/* Alphabet Filter */}
              <div className="flex flex-wrap gap-1 mb-6 justify-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <button onClick={() => setLetterFilter('ALL')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors border ${letterFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-sky-500 hover:text-sky-500'}`}>الكل</button>
                {arabicLetters.map(l => (
                   <button key={l} onClick={() => setLetterFilter(l)} className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors border ${letterFilter === l ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-sky-500 hover:text-sky-500'}`}>{l}</button>
                ))}
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-4 font-bold text-slate-500 text-sm text-center w-20">#</th>
                        <th className="p-4 font-bold text-slate-500 text-sm w-1/2">اسم الطالب</th>
                        <th className="p-4 font-bold text-slate-500 text-sm w-1/4">رقم القيد</th>
                        <th className="p-4 font-bold text-slate-500 text-sm w-1/4">الصفحة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedStudents.map((s, idx) => (
                        <tr 
                          key={s.id} 
                          onClick={() => { setSelectedStudentId(s.id); setView('detail'); }}
                          className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                          <td className="p-4 text-center text-slate-400 font-medium group-hover:text-slate-600">
                            {idx + 1}
                          </td>
                          <td className="p-4">
                             <div className="flex items-center gap-3">
                               <div className={`w-2.5 h-2.5 rounded-full ${s.status === 'left' ? 'bg-rose-500' : s.status === 'transferred' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                               <span className="font-semibold text-slate-800">{s.firstName} {s.lastName ? `/ ${s.lastName}` : ''}</span>
                             </div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono font-bold bg-sky-50 text-sky-600 px-3 py-1 rounded-md dir-ltr inline-block">
                              {s.regNumber}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="font-bold bg-[#FFFC17] text-black px-3 py-1 rounded-md border border-yellow-600 inline-block shadow-sm">
                              {s.pageNumber}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {displayedStudents.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-slate-400">لا توجد نتائج</td></tr>}
                    </tbody>
                  </table>
                  
                  {displayedStudents.length > 0 && displayedStudents.length < filteredStudents.length && (
                    <div ref={loadMoreRef} className="p-6 text-center w-full">
                       <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
                       <p className="mt-2 text-xs text-slate-400">جاري تحميل المزيد...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          {/* Add/Edit View Modal */}
          {(view === 'add' || view === 'edit') && (
            <Modal onClose={() => setView('list')}>
             <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
               <div className="bg-white border-b border-slate-200 p-6 flex justify-between items-center">
                 <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                   {view === 'add' ? 'إضافة طالب جديد' : 'تعديل بيانات طالب'}
                 </h2>
                 <button onClick={() => setView('list')} className="p-1 rounded-full hover:bg-slate-100"><X size={24} /></button>
               </div>
               <div className="p-8">
                 <form onSubmit={(e) => handleSaveStudent(e, view === 'edit')}>
                   <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الرباعي <span className="text-red-500">*</span></label>
                            <input 
                              name="firstName" 
                              required 
                              defaultValue={view === 'edit' ? students.find(s=>s.id===selectedStudentId)?.firstName : ''} 
                              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" 
                              onChange={(e) => checkDuplicate(e.target.value)}
                              placeholder="أدخل اسم الطالب كاملاً"
                            />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">اللقب</label>
                            <input name="lastName" defaultValue={view === 'edit' ? students.find(s=>s.id===selectedStudentId)?.lastName : ''} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" />
                         </div>
                      </div>
                      {nameWarning && (
                        <div className="mt-3 bg-orange-50 text-orange-800 p-3 rounded-lg text-xs font-semibold border border-orange-200 animate-fade-in whitespace-pre-wrap leading-relaxed">
                          {nameWarning}
                        </div>
                      )}
                   </div>

                   <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">رقم القيد <span className="text-red-500">*</span></label>
                            <input name="regNumber" required onInput={handleNumericInput} defaultValue={view === 'edit' ? students.find(s=>s.id===selectedStudentId)?.regNumber : ''} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none font-mono text-left" dir="ltr" />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">رقم الصفحة <span className="text-red-500">*</span></label>
                            <input name="pageNumber" required onInput={handleNumericInput} defaultValue={view === 'edit' ? students.find(s=>s.id===selectedStudentId)?.pageNumber : ''} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none font-mono text-center" />
                         </div>
                      </div>
                   </div>

                   <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-8">
                       <label className="block text-xs font-bold text-slate-500 mb-1">حالة الطالب</label>
                       <div className="grid grid-cols-3 gap-2">
                         <label className="cursor-pointer">
                           <input type="radio" name="status" value="active" className="peer hidden" defaultChecked={view==='add' || students.find(s=>s.id===selectedStudentId)?.status === 'active'} />
                           <div className="text-center py-2 rounded-lg border border-slate-200 peer-checked:bg-emerald-50 peer-checked:border-emerald-500 peer-checked:text-emerald-700 text-sm font-medium transition-all hover:bg-slate-50">مستمر</div>
                         </label>
                         <label className="cursor-pointer">
                           <input type="radio" name="status" value="transferred" className="peer hidden" defaultChecked={students.find(s=>s.id===selectedStudentId)?.status === 'transferred'} />
                           <div className="text-center py-2 rounded-lg border border-slate-200 peer-checked:bg-amber-50 peer-checked:border-amber-500 peer-checked:text-amber-700 text-sm font-medium transition-all hover:bg-slate-50">منقول</div>
                         </label>
                         <label className="cursor-pointer">
                           <input type="radio" name="status" value="left" className="peer hidden" defaultChecked={students.find(s=>s.id===selectedStudentId)?.status === 'left'} />
                           <div className="text-center py-2 rounded-lg border border-slate-200 peer-checked:bg-rose-50 peer-checked:border-rose-500 peer-checked:text-rose-700 text-sm font-medium transition-all hover:bg-slate-50">تارك</div>
                         </label>
                       </div>
                       
                       <div className="mt-4">
                         <label className="block text-xs font-bold text-slate-500 mb-1">ملاحظات</label>
                         <textarea name="notes" defaultValue={view === 'edit' ? students.find(s=>s.id===selectedStudentId)?.notes : ''} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none min-h-[100px]" />
                       </div>
                   </div>

                   <div className="flex gap-4 pt-4 border-t border-slate-100">
                      <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-bold flex items-center justify-center gap-2">
                        <Save size={18} /> حفظ البيانات
                      </button>
                   </div>
                 </form>
               </div>
             </div>
            </Modal>
          )}

          {/* Settings View Modal */}
          {view === 'settings' && (
            <Modal onClose={() => setView('list')}>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
              <div className="bg-white border-b border-slate-200 p-6 flex justify-between items-center">
                 <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                   <Settings size={24} /> الإعدادات
                 </h2>
                 <button onClick={() => setView('list')} className="p-1 rounded-full hover:bg-slate-100"><X size={24} /></button>
              </div>
              <div className="p-8 space-y-8">
                 <div className="pb-8 border-b border-slate-100">
                    <button onClick={() => exportToExcel(students)} className="w-full flex items-center gap-2 px-5 py-2.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-medium">
                       <Download size={18} /> تصدير إلى Excel
                    </button>
                 </div>
                 <div className="pb-8 border-b border-slate-100">
                    <button onClick={generateTemplate} className="w-full flex items-center gap-2 px-5 py-2.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium">
                       <FileSpreadsheet size={18} /> تحميل نموذج فارغ (1000 طالب)
                    </button>
                 </div>
                 <div className="pt-4 border-t-2 border-red-100">
                    <button onClick={handleDeleteAll} className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium border border-red-100">
                       <Trash2 size={18} /> حذف جميع البيانات
                    </button>
                 </div>
              </div>
            </div>
            </Modal>
          )}

          {/* Detail View Modal */}
          {view === 'detail' && selectedStudentId && (() => {
             const s = students.find(st => st.id === selectedStudentId);
             if (!s) return null;
             return (
              <Modal onClose={() => setView('list')}>
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
                 <div className="h-1.5 bg-gradient-to-r from-slate-900 to-slate-700"></div>
                 <div className="p-8 border-b border-slate-100 flex justify-between items-start">
                    <div>
                       <h1 className="text-3xl font-bold text-slate-900 mb-2">{s.firstName} {s.lastName}</h1>
                       <StatusBadge status={s.status} />
                    </div>
                    <button onClick={() => setView('list')} className="p-1 rounded-full hover:bg-slate-100"><X size={24} /></button>
                 </div>
                 <div className="p-8">
                    <div className="grid grid-cols-2 gap-8 mb-8">
                       <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">رقم القيد</span>
                          <div className="text-2xl font-mono font-bold text-slate-800">{s.regNumber}</div>
                       </div>
                       <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">رقم الصفحة</span>
                          <div className="text-2xl font-mono font-bold text-slate-800">{s.pageNumber}</div>
                       </div>
                    </div>
                    {s.notes && (
                      <div className="mt-8 pt-8 border-t border-slate-100">
                         <h4 className="flex items-center gap-2 text-slate-500 font-bold text-sm mb-3">
                            <AlertTriangle size={16} /> الملاحظات
                         </h4>
                         <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {s.notes}
                         </div>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-slate-100">
                        <button onClick={() => window.print()} className="col-span-3 bg-slate-800 text-white py-2.5 rounded-lg font-bold hover:bg-slate-900 flex items-center justify-center gap-2 text-sm mb-2"><Printer size={16}/> طباعة معلومات الطالب</button>
                        <button onClick={() => setView('edit')} className="bg-slate-100 text-slate-700 py-2.5 rounded-lg font-bold hover:bg-slate-200 flex items-center justify-center gap-2 text-sm"><Settings size={16}/> تعديل</button>
                        <button onClick={() => handleDelete(s.id)} className="bg-red-50 text-red-600 py-2.5 rounded-lg font-bold hover:bg-red-100 flex items-center justify-center gap-2 text-sm"><Trash2 size={16}/> حذف</button>
                    </div>
                 </div>
              </div>
              </Modal>
             );
          })()}

        </main>

        {/* Print Modal */}
        {showPrintModal && (
          <Modal onClose={() => setShowPrintModal(false)}>
             <div className="bg-white rounded-2xl w-full p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-center mb-6">خيارات الطباعة</h3>
                <button onClick={() => handlePrint()} className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold mb-4 hover:bg-slate-800">
                   طباعة جميع السجلات
                </button>
                <div className="relative text-center my-6">
                   <div className="h-px bg-slate-200 absolute w-full top-1/2 -z-10"></div>
                   <span className="bg-white px-2 text-slate-400 text-sm">أو</span>
                </div>
                <div className="mb-4">
                   <label className="block text-sm font-medium mb-2 text-slate-600">طباعة قيد محدد</label>
                   <input 
                     value={printRegInput}
                     onChange={(e) => setPrintRegInput(e.target.value)}
                     className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-sky-500"
                     placeholder="أدخل رقم القيد..." 
                   />
                </div>
                <button onClick={() => handlePrint(printRegInput)} className="w-full py-2 bg-slate-100 text-slate-600 rounded-lg font-bold mb-2 hover:bg-slate-200">
                   طباعة القيد المحدد
                </button>
                <button onClick={() => setShowPrintModal(false)} className="w-full py-2 text-slate-400 font-medium hover:text-slate-600 mt-2">
                   إلغاء
                </button>
             </div>
          </Modal>
        )}

         {/* SCROLL TO TOP BUTTON */}
         <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`fixed bottom-6 left-6 p-3 rounded-full shadow-lg text-white transition-all transform z-30 ${showTopBtn ? 'bg-slate-900 translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}
         >
          <ArrowUp size={24} />
         </button>
      </div>
      
      {/* Hidden Print View */}
      <PrintView students={studentsToPrint} />
    </>
  );
}