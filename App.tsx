import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, LogOut, Settings, Search, Plus, Printer, 
  Trash2, FileSpreadsheet, Download, Upload, AlertTriangle, ArrowRight, Save, X, FileText, CheckCircle2, XCircle, AlertCircle, ArrowUp, Filter
} from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { 
  getDocs, addDoc, doc, updateDoc, deleteDoc, writeBatch 
} from 'firebase/firestore';
import { auth, db, studentsCollection } from './firebase.ts';
import * as XLSX from 'xlsx';
import { PrintView } from './components/PrintView.tsx';
import { exportToExcel, generateTemplate, readExcel } from './utils/excelUtils.ts';
import { Student, SortOption, Stats } from './types.ts';

// --- Sub Components ---

const Modal: React.FC<{ children: React.ReactNode, onClose: () => void }> = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in overflow-y-auto" onClick={onClose}>
    <div className="w-full max-w-xl relative" onClick={e => e.stopPropagation()}>
       {children}
    </div>
  </div>
);

// --- Elegant Single Student Print Component ---
const SingleStudentPrint: React.FC<{ student: Student }> = ({ student }) => {
  const statusLabels: Record<string, string> = {
    'active': 'مستمر',
    'transferred': 'منقول',
    'left': 'تارك'
  };

  return (
    <div className="hidden print:flex flex-col items-center justify-center w-full h-screen bg-white p-8">
      <div className="w-full max-w-[21cm] border-[3px] border-double border-slate-800 p-8 rounded-xl relative overflow-hidden">
        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 -translate-y-1/2 translate-x-1/2 rounded-full opacity-50"></div>
        
        {/* Header */}
        <div className="text-center border-b-2 border-slate-200 pb-6 mb-8 relative z-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">بطاقة معلومات الطالب</h1>
          <p className="text-slate-500 font-medium">نظام سجلات الطلاب العام</p>
        </div>

        {/* Main Info Grid */}
        <div className="grid grid-cols-12 gap-6 relative z-10">
          <div className="col-span-12 md:col-span-8 space-y-6">
             <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-400 mb-1">الاسم الكامل</span>
                <div className="text-2xl font-bold text-slate-900 border-b border-dashed border-slate-300 pb-1">
                   {student.firstName} {student.lastName}
                </div>
             </div>
             <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-400 mb-1">حالة الطالب</span>
                  <div className="text-lg font-semibold text-slate-800">
                     {statusLabels[student.status || 'active']}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-400 mb-1">تاريخ التسجيل</span>
                  <div className="text-lg font-semibold text-slate-800">
                     {new Date(student.createdAt).toLocaleDateString('ar-EG')}
                  </div>
                </div>
             </div>
          </div>
          <div className="col-span-12 md:col-span-4 flex flex-col gap-4">
             <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                <span className="text-xs font-bold text-slate-500 uppercase">رقم القيد</span>
                <div className="text-4xl font-mono font-bold text-slate-900 mt-1">{student.regNumber}</div>
             </div>
             <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                <span className="text-xs font-bold text-slate-500 uppercase">رقم الصفحة</span>
                <div className="text-4xl font-mono font-bold text-slate-900 mt-1">{student.pageNumber}</div>
             </div>
          </div>
          <div className="col-span-12 mt-4">
             <div className="border border-slate-200 rounded-lg p-6 min-h-[150px] bg-slate-50/50">
                <span className="text-sm font-bold text-slate-400 block mb-2">الملاحظات</span>
                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                   {student.notes || "لا توجد ملاحظات مسجلة."}
                </p>
             </div>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end">
           <div className="text-xs text-slate-400">
              تم الاستخراج: {new Date().toLocaleDateString('ar-EG')}
           </div>
           <div className="text-center">
              <div className="w-32 border-b border-slate-300 mb-2"></div>
              <span className="text-sm font-bold text-slate-500">توقيع المسؤول</span>
           </div>
        </div>
      </div>
    </div>
  );
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (err) { setError('بيانات الدخول غير صحيحة'); } 
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
             <Users className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">تسجيل الدخول</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">البريد الإلكتروني</label>
            <input type="email" required className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-blue-500 outline-none text-left" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">كلمة المرور</label>
            <input type="password" required className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-blue-500 outline-none text-left" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all">
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; colorClass: string }> = ({ title, value, icon, colorClass }) => (
  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 hover:shadow-md transition-shadow">
    <div className={`p-2 rounded-full ${colorClass} text-white shadow-sm`}>{icon}</div>
    <div>
      <div className="text-xl font-bold text-slate-800 font-mono leading-none">{value}</div>
      <div className="text-[10px] text-slate-500 font-semibold mt-1">{title}</div>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status?: string }) => {
   if (status === 'transferred') return <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold border border-amber-200">منقول</span>;
   if (status === 'left') return <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs font-bold border border-rose-200">تارك</span>;
   return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold border border-emerald-200">مستمر</span>;
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [view, setView] = useState<'list' | 'add' | 'edit' | 'settings' | 'detail'>('list');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Custom Delete Modal State
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(''); 
  const [selectedRegFilter, setSelectedRegFilter] = useState(''); 
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [letterFilter, setLetterFilter] = useState('ALL');
  
  // Print Mode State
  const [printMode, setPrintMode] = useState<'list' | 'single'>('list');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printRegInput, setPrintRegInput] = useState('');

  // Infinite Scroll State
  const [visibleCount, setVisibleCount] = useState(50);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Scroll To Top State
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Import State
  const [importing, setImporting] = useState(false);

  // Form State
  const [nameWarning, setNameWarning] = useState('');
  // In the monolithic code, formData state was used for temp storage, but here we can check duplicates directly in input

  // Derived Data
  const uniqueRegNumbers = useMemo(() => {
    const regs = new Set(students.map(s => s.regNumber));
    return Array.from(regs).sort((a, b) => Number(a) - Number(b));
  }, [students]);

  useEffect(() => {
    const cachedData = localStorage.getItem('students_cache');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStudents(parsed);
          setLoading(false);
        }
      } catch (e) { console.error("Cache load failed", e); }
    }

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

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300); 
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setVisibleCount(50);
    window.scrollTo(0, 0);
  }, [debouncedQuery, selectedRegFilter, statusFilter, sortBy, letterFilter]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 50);
        }
      },
      { threshold: 0.5, rootMargin: '100px' }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [students.length, debouncedQuery]); 

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) setShowTopBtn(true);
      else setShowTopBtn(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchStudents = async () => {
    if (students.length === 0) setLoading(true); // Only show loading if no cache
    try {
      const querySnapshot = await getDocs(studentsCollection);
      const loadedStudents: Student[] = [];
      querySnapshot.forEach((doc) => {
        loadedStudents.push({ id: doc.id, status: 'active', ...doc.data() } as Student);
      });
      loadedStudents.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setStudents(loadedStudents);
      localStorage.setItem('students_cache', JSON.stringify(loadedStudents));
    } catch (e) { console.error("Error fetching", e); } 
    finally { setLoading(false); }
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

  const filteredStudents = useMemo(() => {
    let result = students;

    if (selectedRegFilter) {
       result = result.filter(s => s.regNumber === selectedRegFilter);
    }

    if (letterFilter !== 'ALL') {
       result = result.filter(s => s.firstName.startsWith(letterFilter));
    }

    if (statusFilter !== 'ALL') {
       result = result.filter(s => (s.status || 'active') === statusFilter);
    }

    if (debouncedQuery) {
       const q = debouncedQuery.toLowerCase();
       result = result.filter(s => 
          s.firstName.toLowerCase().includes(q) || 
          (s.lastName && s.lastName.toLowerCase().includes(q))
       );
    }

    if (sortBy === 'alphabetical') {
      result.sort((a, b) => a.firstName.localeCompare(b.firstName));
    } else {
      result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return result;
  }, [students, debouncedQuery, selectedRegFilter, statusFilter, sortBy, letterFilter]);

  const displayedStudents = useMemo(() => {
    return filteredStudents.slice(0, visibleCount);
  }, [filteredStudents, visibleCount]);

  const arabicLetters = ['أ', 'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'];

  const handleDeleteClick = (id: string) => setStudentToDelete(id);

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      await deleteDoc(doc(db, "students", studentToDelete));
      const updatedList = students.filter(s => s.id !== studentToDelete);
      setStudents(updatedList);
      localStorage.setItem('students_cache', JSON.stringify(updatedList));
      if (view === 'detail') setView('list');
      setStudentToDelete(null);
    } catch (e) { alert("فشل الحذف"); }
  };

  const executeDeleteAll = async () => {
     setShowDeleteAllConfirm(false);
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
       localStorage.removeItem('students_cache');
       alert("تم الحذف بنجاح");
       setView('list');
     } catch (e) {
       console.error(e);
       alert("حدث خطأ أثناء الحذف");
     } finally { setLoading(false); }
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
      let updatedList = [...students];
      if (isEdit && selectedStudentId) {
        await updateDoc(doc(db, "students", selectedStudentId), data);
        updatedList = students.map(s => s.id === selectedStudentId ? { ...s, ...data } : s);
      } else {
        const newStudent = { ...data, createdAt: Date.now() };
        const docRef = await addDoc(studentsCollection, newStudent);
        updatedList = [{ id: docRef.id, ...newStudent } as Student, ...students];
      }
      setStudents(updatedList);
      localStorage.setItem('students_cache', JSON.stringify(updatedList));
      setView('list');
      setSelectedStudentId(null);
    } catch (err) { alert("فشل الحفظ"); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
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
      if (batchCount > 0) await currentBatch.commit();

      if (count > 0) {
        const updatedList = [...newItems, ...students];
        setStudents(updatedList);
        localStorage.setItem('students_cache', JSON.stringify(updatedList));
        alert(`تم استيراد ${count} سجل بنجاح`);
      } else { alert("لم يتم العثور على سجلات جديدة"); }
    } catch (err) { console.error(err); alert("خطأ أثناء الاستيراد"); } 
    finally { setImporting(false); e.target.value = ''; }
  };
  
  const handleNumericInput = (e: React.FormEvent<HTMLInputElement>) => {
     e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '');
  };

  const handlePrint = (reg?: string) => {
     if (reg) setSelectedRegFilter(reg);
     setPrintMode('list');
     setShowPrintModal(false);
     setTimeout(() => window.print(), 500);
  };
  
  const handleSingleStudentPrint = () => {
     setPrintMode('single');
     setTimeout(() => window.print(), 300);
  };

  // Render Views
  if (loading) return <div className="h-screen flex items-center justify-center text-slate-500">جاري التحميل...</div>;
  if (!user) return <Login />;

  const stats: Stats = {
    totalStudents: students.length,
    uniqueRegNumbers: new Set(students.map(s => s.regNumber)).size,
    totalPages: new Set(students.map(s => s.pageNumber).filter(p => !!p)).size
  };
  
  let studentsToPrint: Student[] = [];
  let printTitle = "فهرس القيد العام";

  if (printMode === 'list') {
      if (selectedRegFilter) {
          studentsToPrint = filteredStudents;
          printTitle = `فهرس القيد ${selectedRegFilter}`;
      } else {
          studentsToPrint = filteredStudents;
          printTitle = "فهرس القيد العام";
      }
  }

  const singleStudentData = students.find(s => s.id === selectedStudentId);

  return (
    <>
      <div className="min-h-screen no-print pb-20">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm backdrop-blur-sm bg-white/90">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-lg text-slate-800 cursor-pointer" onClick={() => setView('list')}>
              <div className="bg-slate-900 text-white p-1.5 rounded-lg"><Users size={18} /></div>
              <span className="hidden sm:inline">سجل القيود</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setView('settings')} className={`p-2 rounded-full transition-colors ${view === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}><Settings size={20} /></button>
              <button onClick={() => { if(confirm("تسجيل خروج؟")) signOut(auth); }} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"><LogOut size={20} /></button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
            <div className="animate-fade-in space-y-5">
              {/* Compact Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard title="الطلاب" value={stats.totalStudents} icon={<Users size={16}/>} colorClass="bg-blue-500" />
                <StatCard title="القيود" value={stats.uniqueRegNumbers} icon={<FileSpreadsheet size={16}/>} colorClass="bg-emerald-500" />
                <StatCard title="الصفحات" value={stats.totalPages} icon={<FileText size={16}/>} colorClass="bg-purple-500" />
                <StatCard title="تارك/منقول" value={students.filter(s=>s.status!=='active').length} icon={<AlertTriangle size={16}/>} colorClass="bg-amber-500" />
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-2">
                   <div className="flex items-center w-full sm:w-auto flex-1 gap-2">
                       <Search className="text-slate-400 mr-1" size={18} />
                       <input className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400 bg-transparent min-w-[120px]" placeholder="بحث بالاسم..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); if(e.target.value) setSelectedRegFilter(''); }} />
                       {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-red-500"><X size={16}/></button>}
                   </div>
                   
                   <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 sm:border-r border-slate-100 pt-2 sm:pt-0 sm:pr-2 mt-2 sm:mt-0">
                       {/* Reg Dropdown in Filter */}
                       <div className="relative">
                           <select 
                               value={selectedRegFilter} 
                               onChange={(e) => { setSelectedRegFilter(e.target.value); if(e.target.value) setSearchQuery(''); }}
                               className="bg-transparent text-sm text-slate-600 outline-none cursor-pointer p-1 pr-6 appearance-none hover:text-sky-600 font-medium min-w-[100px]"
                           >
                               <option value="">جميع القيود</option>
                               {uniqueRegNumbers.map(r => (
                                   <option key={r} value={r}>قيد {r}</option>
                               ))}
                           </select>
                           <Filter size={14} className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                       </div>
                       
                       <div className="h-4 w-px bg-slate-200"></div>

                       <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-transparent text-xs text-slate-600 outline-none p-1 font-medium cursor-pointer">
                         <option value="ALL">كل الحالات</option>
                         <option value="active">مستمر</option>
                         <option value="transferred">منقول</option>
                         <option value="left">تارك</option>
                       </select>

                       <div className="h-4 w-px bg-slate-200"></div>

                       <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)} className="bg-transparent text-xs text-slate-600 outline-none p-1 font-medium cursor-pointer">
                         <option value="recent">الأحدث</option>
                         <option value="alphabetical">أبجدي</option>
                       </select>
                   </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSelectedStudentId(null); setView('add'); setNameWarning(''); }} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 flex items-center gap-2 shadow-sm transition-all whitespace-nowrap"><Plus size={16} /> إضافة</button>
                  <button onClick={() => setShowPrintModal(true)} className="bg-white text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2 transition-colors whitespace-nowrap"><Printer size={16} /> طباعة</button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 justify-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <button onClick={() => setLetterFilter('ALL')} className={`px-3 py-1 text-xs rounded-md transition-colors ${letterFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>الكل</button>
                {arabicLetters.map(l => (
                  <button key={l} onClick={() => setLetterFilter(l)} className={`w-7 h-7 flex items-center justify-center text-xs rounded-md transition-colors ${letterFilter === l ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{l}</button>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="p-3 w-14 text-center">#</th>
                        <th className="p-3">اسم الطالب</th>
                        <th className="p-3 w-28 text-center">القيد</th>
                        <th className="p-3 w-20 text-center">الصفحة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {displayedStudents.map((s, idx) => (
                        <tr key={s.id} onClick={() => { setSelectedStudentId(s.id); setView('detail'); }} className="hover:bg-blue-50/50 cursor-pointer transition-colors group">
                          <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3 font-semibold text-slate-800 flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${s.status === 'left' ? 'bg-rose-500' : s.status === 'transferred' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                            {s.firstName} <span className="text-slate-400 font-normal text-xs">{s.lastName}</span>
                          </td>
                          <td className="p-3 text-center"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-mono font-bold dir-ltr">{s.regNumber}</span></td>
                          <td className="p-3 text-center"><span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-mono font-bold border border-amber-200">{s.pageNumber}</span></td>
                        </tr>
                      ))}
                      {displayedStudents.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-slate-400">لا توجد بيانات</td></tr>}
                    </tbody>
                  </table>
                  
                  {displayedStudents.length > 0 && displayedStudents.length < filteredStudents.length && (
                    <div ref={loadMoreRef} className="p-6 text-center w-full">
                       <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
                       <p className="mt-2 text-xs text-slate-400">جاري تحميل المزيد...</p>
                    </div>
                  )}
                  
                   {displayedStudents.length > 0 && displayedStudents.length === filteredStudents.length && (
                    <div className="p-6 text-center w-full text-slate-400 text-xs border-t border-slate-50">
                       تم عرض جميع النتائج ({filteredStudents.length})
                    </div>
                  )}
                </div>
              </div>
            </div>

          {/* MODAL VIEWS */}
          {(view === 'add' || view === 'edit') && (
            <Modal onClose={() => setView('list')}>
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    {view === 'add' ? <Plus className="text-blue-600" size={20}/> : <Settings className="text-blue-600" size={20}/>}
                    {view === 'add' ? 'إضافة سجل جديد' : 'تعديل السجل'}
                  </h2>
                  <button onClick={() => setView('list')} className="p-1 rounded-full hover:bg-slate-200 text-slate-500"><X size={20}/></button>
                </div>
                <form onSubmit={(e) => handleSaveStudent(e, view === 'edit')} className="p-6 space-y-5">
                   <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-2 sm:col-span-1">
                       <label className="block text-xs font-bold text-slate-500 mb-1">الاسم الرباعي <span className="text-red-500">*</span></label>
                       <input name="firstName" required 
                         defaultValue={view === 'edit' ? students.find(s=>s.id===selectedStudentId)?.firstName : ''} 
                         onChange={(e) => checkDuplicate(e.target.value)}
                         className="w-full p-2.5 rounded-xl border focus:border-blue-500 outline-none text-sm transition-colors"
                         placeholder="أدخل اسم الطالب كاملاً"
                       />
                     </div>
                     <div className="col-span-2 sm:col-span-1">
                       <label className="block text-xs font-bold text-slate-500 mb-1">اللقب</label>
                       <input name="lastName" 
                         defaultValue={view === 'edit' ? students.find(s=>s.id===selectedStudentId)?.lastName : ''} 
                         className="w-full p-2.5 rounded-xl border focus:border-blue-500 outline-none text-sm transition-colors"
                       />
                     </div>
                   </div>
                   
                   {nameWarning && (
                     <div className="bg-orange-50 text-orange-800 p-3 rounded-lg text-xs font-semibold border border-orange-200 animate-fade-in shadow-sm whitespace-pre-wrap leading-relaxed">
                       {nameWarning}
                     </div>
                   )}

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">رقم القيد <span className="text-red-500">*</span></label>
                        <input name="regNumber" required onInput={handleNumericInput} defaultValue={view === 'edit' ? students.find(s=>s.id===selectedStudentId)?.regNumber : ''} className="w-full p-2.5 rounded-xl border focus:border-blue-500 outline-none font-mono dir-ltr text-right text-sm" placeholder="أرقام فقط"/>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">رقم الصفحة <span className="text-red-500">*</span></label>
                        <input name="pageNumber" required onInput={handleNumericInput} defaultValue={view === 'edit' ? students.find(s=>s.id===selectedStudentId)?.pageNumber : ''} className="w-full p-2.5 rounded-xl border focus:border-blue-500 outline-none font-mono text-center text-sm" placeholder="أرقام فقط"/>
                     </div>
                   </div>

                   <div>
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
                   </div>

                   <div><label className="block text-xs font-bold text-slate-500 mb-1">ملاحظات</label><textarea name="notes" defaultValue={view === 'edit' ? students.find(s=>s.id===selectedStudentId)?.notes : ''} className="w-full p-3 rounded-xl border focus:border-blue-500 outline-none h-20 text-sm"></textarea></div>
                   <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10">حفظ البيانات</button>
                </form>
              </div>
            </Modal>
          )}

          {view === 'detail' && selectedStudentId && (() => {
            const s = students.find(x => x.id === selectedStudentId);
            return s ? (
              <Modal onClose={() => setView('list')}>
                 <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
                   <div className="p-6 border-b border-slate-50 flex justify-between items-start bg-slate-50/30">
                     <div>
                       <div className="flex items-center gap-2 mb-2">
                          <h1 className="text-2xl font-bold text-slate-800">{s.firstName} {s.lastName}</h1>
                          <StatusBadge status={s.status} />
                       </div>
                       <div className="text-slate-400 text-xs font-medium">تاريخ الإضافة: {new Date(s.createdAt).toLocaleDateString('ar-EG')}</div>
                     </div>
                     <div className="flex gap-2">
                        <div className="bg-slate-100 p-2 rounded-full"><Users className="text-slate-400" size={24} /></div>
                        <button onClick={() => setView('list')} className="p-2 rounded-full hover:bg-slate-200 text-slate-500"><X size={20}/></button>
                     </div>
                   </div>
                   <div className="p-6">
                     <div className="grid grid-cols-2 gap-4 mb-6">
                       <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-center">
                         <div className="text-[10px] font-bold text-blue-400 uppercase mb-1">رقم القيد</div>
                         <div className="text-2xl font-mono font-bold text-blue-900">{s.regNumber}</div>
                       </div>
                       <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 text-center">
                         <div className="text-[10px] font-bold text-amber-400 uppercase mb-1">رقم الصفحة</div>
                         <div className="text-2xl font-mono font-bold text-amber-900">{s.pageNumber}</div>
                       </div>
                     </div>
                     {s.notes && (
                       <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                         <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2 text-xs"><FileText size={14}/> ملاحظات</h3>
                         <p className="text-slate-600 text-sm leading-relaxed">{s.notes}</p>
                       </div>
                     )}
                     <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100">
                       <button onClick={handleSingleStudentPrint} className="col-span-3 bg-slate-800 text-white py-2.5 rounded-lg font-bold hover:bg-slate-900 flex items-center justify-center gap-2 text-sm mb-2"><Printer size={16}/> طباعة معلومات الطالب</button>
                       <button onClick={() => setView('edit')} className="bg-slate-100 text-slate-700 py-2.5 rounded-lg font-bold hover:bg-slate-200 flex items-center justify-center gap-2 text-sm"><Settings size={16}/> تعديل</button>
                       <button onClick={() => handleDeleteClick(s.id)} className="bg-red-50 text-red-600 py-2.5 rounded-lg font-bold hover:bg-red-100 flex items-center justify-center gap-2 text-sm"><Trash2 size={16}/> حذف</button>
                     </div>
                   </div>
                 </div>
              </Modal>
            ) : null;
          })()}

          {view === 'settings' && (
            <Modal onClose={() => setView('list')}>
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20}/> الإعدادات</h2>
                    <button onClick={() => setView('list')} className="p-1 rounded-full hover:bg-slate-200 text-slate-500"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-3">
                    <button onClick={() => exportToExcel(students)} className="w-full flex items-center justify-between p-3.5 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors">
                      <span className="flex items-center gap-2 font-bold text-sm"><Download size={18}/> تصدير البيانات (Excel)</span>
                    </button>
                    <button onClick={generateTemplate} className="w-full flex items-center justify-between p-3.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors">
                      <span className="flex items-center gap-2 font-bold text-sm"><FileSpreadsheet size={18}/> تحميل نموذج فارغ (1000 طالب)</span>
                    </button>
                    <label className={`w-full flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer ${importing ? 'opacity-50' : ''}`}>
                       <span className="flex items-center gap-2 font-bold text-sm"><Upload size={18}/> {importing ? 'جاري الرفع...' : 'استيراد من Excel'}</span>
                       <input type="file" className="hidden" accept=".xlsx" onChange={handleImport} disabled={importing} />
                    </label>
                  </div>
                  <div className="pt-4 border-t border-red-100">
                    <button onClick={() => setShowDeleteAllConfirm(true)} className="w-full p-3.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 flex items-center justify-center gap-2 text-sm border border-red-100">
                       <Trash2 size={18}/> حذف جميع البيانات
                    </button>
                  </div>
                </div>
              </div>
            </Modal>
          )}

          {showPrintModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowPrintModal(false)}>
               <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-center mb-6">خيارات الطباعة</h3>
                  <div className="space-y-3">
                     <button onClick={() => { setSelectedRegFilter(''); handlePrint(); setShowPrintModal(false); }} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 text-sm">طباعة السجل بالكامل</button>
                     <div className="text-center text-slate-400 text-xs">- أو -</div>
                     
                     <div className="relative">
                       <select 
                           value={printRegInput}
                           onChange={(e) => setPrintRegInput(e.target.value)}
                           className="w-full p-3 border rounded-xl outline-none focus:border-blue-500 text-center text-sm appearance-none bg-white font-mono dir-ltr"
                       >
                           <option value="">اختر رقم القيد...</option>
                           {uniqueRegNumbers.map(r => (
                               <option key={r} value={r}>قيد {r}</option>
                           ))}
                       </select>
                       <ArrowUp size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-180" />
                     </div>

                     <button onClick={() => { handlePrint(printRegInput); setShowPrintModal(false); }} className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 text-sm" disabled={!printRegInput}>طباعة القيد المحدد</button>
                     <button onClick={() => setShowPrintModal(false)} className="w-full py-2 text-slate-400 hover:text-slate-600 text-sm">إلغاء</button>
                  </div>
               </div>
            </div>
          )}

           <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`fixed bottom-6 left-6 p-3 rounded-full shadow-lg text-white transition-all transform z-30 ${showTopBtn ? 'bg-slate-900 translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}
           >
            <ArrowUp size={24} />
           </button>
        
          {showDeleteAllConfirm && (
            <Modal onClose={() => setShowDeleteAllConfirm(false)}>
                <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center shadow-2xl transform transition-all scale-100">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Trash2 size={40} className="text-red-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">حذف جميع البيانات؟</h3>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        هل أنت متأكد من رغبتك في حذف كافة سجلات الطلاب؟ <br/>
                        <span className="text-red-500 font-bold text-sm">هذا الإجراء نهائي ولا يمكن التراجع عنه.</span>
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setShowDeleteAllConfirm(false)} className="py-3 px-6 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                            إلغاء
                        </button>
                        <button onClick={executeDeleteAll} className="py-3 px-6 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30">
                            نعم، حذف الكل
                        </button>
                    </div>
                </div>
            </Modal>
          )}

          {studentToDelete && (
            <Modal onClose={() => setStudentToDelete(null)}>
                <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-auto text-center shadow-2xl animate-fade-in">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="text-red-600 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">حذف الطالب؟</h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                    هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟ <br/>
                    <span className="text-red-500 font-semibold">لا يمكن استرجاع البيانات بعد الحذف.</span>
                </p>
                <div className="flex gap-3">
                    <button 
                    onClick={() => setStudentToDelete(null)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                    >
                    إلغاء
                    </button>
                    <button 
                    onClick={confirmDeleteStudent}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                    >
                    نعم، حذف
                    </button>
                </div>
                </div>
            </Modal>
           )}
        </main>
      </div>
      
      {printMode === 'list' && (
         <PrintView students={studentsToPrint} title={printTitle} />
      )}
      {printMode === 'single' && singleStudentData && (
         <SingleStudentPrint student={singleStudentData} />
      )}
    </>
  );
}