import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, LogOut, Settings, Search, Plus, Printer, 
  Trash2, FileSpreadsheet, Download, Upload, AlertTriangle, ArrowRight, 
  CheckCircle2, AlertCircle, ArrowUp, UserCheck, 
  RotateCcw, Info, Calendar, Palette, Loader2, BarChart3, PieChart, ArrowLeft
} from 'lucide-react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, writeBatch, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";

import { db, auth } from './firebase';
import { cleanName, formatDateForInput, exportToExcel, generateTemplate, readExcel } from './utils/excelUtils';
import { Student, ThemeColors } from './types';

import { Modal, AlertModal, ConfirmModal } from './components/ui/Modal';
import { SkeletonLoader } from './components/ui/SkeletonLoader';
import { StatCard } from './components/ui/StatCard';
import { Login } from './components/Login';
import { SingleStudentPrint } from './components/SingleStudentPrint';
import PrintView from './components/PrintView';

const themeColors: ThemeColors = {
  slate: { primary: 'bg-slate-900', hover: 'hover:bg-slate-800', secondary: 'bg-blue-600', secondaryHover: 'hover:bg-blue-700', ring: 'focus:ring-blue-500', name: 'الافتراضي (أزرق)' },
  purple: { primary: 'bg-violet-900', hover: 'hover:bg-violet-800', secondary: 'bg-purple-600', secondaryHover: 'hover:bg-purple-700', ring: 'focus:ring-purple-500', name: 'بنفسجي' },
  emerald: { primary: 'bg-teal-900', hover: 'hover:bg-teal-800', secondary: 'bg-emerald-600', secondaryHover: 'hover:bg-emerald-700', ring: 'focus:ring-emerald-500', name: 'أخضر' },
  rose: { primary: 'bg-rose-900', hover: 'hover:bg-rose-800', secondary: 'bg-red-600', secondaryHover: 'hover:bg-red-700', ring: 'focus:ring-red-500', name: 'أحمر' },
  amber: { primary: 'bg-amber-900', hover: 'hover:bg-amber-800', secondary: 'bg-orange-600', secondaryHover: 'hover:bg-orange-700', ring: 'focus:ring-orange-500', name: 'برتقالي' },
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [view, setView] = useState('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(''); 
  const [selectedRegFilter, setSelectedRegFilter] = useState(''); 
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('recent');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printRegInput, setPrintRegInput] = useState('');
  const [visibleCount, setVisibleCount] = useState(150);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [importing, setImporting] = useState(false);
  const [printMode, setPrintMode] = useState('list');
  const [alertConfig, setAlertConfig] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void; isDestructive?: boolean } | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [similarStudents, setSimilarStudents] = useState<Student[]>([]);
  const [colorTheme, setColorTheme] = useState(localStorage.getItem('appTheme') || 'slate');
  const [showThemeModal, setShowThemeModal] = useState(false);

  const currentTheme = themeColors[colorTheme] || themeColors.slate;
  const studentsCollection = collection(db, "students");

  const stats = useMemo(() => {
    const active = students.filter(s => !s.isDeleted);
    return {
        total: active.length,
        activeOnly: active.filter(s => (s.status || 'active') === 'active').length,
        regs: new Set(active.map(s => s.regNumber)).size,
        others: active.filter(s => (s.status || 'active') !== 'active').length,
        deleted: students.filter(s => s.isDeleted).length
    };
  }, [students]);

  const regStats = useMemo(() => {
     const active = students.filter(s => !s.isDeleted);
     const counts: Record<string, number> = {};
     active.forEach(s => {
         counts[s.regNumber] = (counts[s.regNumber] || 0) + 1;
     });
     return Object.entries(counts).map(([reg, count]) => ({ reg, count })).sort((a, b) => Number(a.reg) - Number(b.reg));
  }, [students]);

  const statusStats = useMemo(() => {
    const active = students.filter(s => !s.isDeleted);
    const counts: Record<string, number> = { active: 0, transferred: 0, left: 0, graduated: 0 };
    active.forEach(s => {
        const st = s.status || 'active';
        if (counts[st] !== undefined) counts[st]++;
    });
    return [
        { label: 'مستمر', count: counts.active, color: 'bg-emerald-100 text-emerald-800' },
        { label: 'منقول', count: counts.transferred, color: 'bg-amber-100 text-amber-800' },
        { label: 'تارك', count: counts.left, color: 'bg-rose-100 text-rose-800' },
        { label: 'تخرج', count: counts.graduated, color: 'bg-blue-100 text-blue-800' }
    ];
  }, [students]);

  const years = useMemo(() => {
     const y = new Set(students.map(s => {
        const d = new Date(s.createdAt);
        return isNaN(d.getFullYear()) ? null : d.getFullYear();
     }).filter((y): y is number => y !== null));
     return Array.from(y).sort((a,b) => b - a);
  }, [students]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsubscribe = onSnapshot(studentsCollection, (snapshot) => {
       const data: Student[] = [];
       snapshot.forEach(d => {
          const raw = d.data();
          const createdAt = raw.createdAt?.toMillis ? raw.createdAt.toMillis() : (raw.createdAt || Date.now());
          data.push({ id: d.id, ...raw, createdAt } as Student);
       });
       data.sort((a,b) => b.createdAt - a.createdAt);
       setStudents(data);
       setLoading(false);
    }, (error) => {
       console.error("Error fetching students:", error);
       setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
     const handleScroll = () => {
        setShowScrollTop(window.scrollY > 300);
     };
     window.addEventListener('scroll', handleScroll);
     return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem('appTheme', colorTheme);
  }, [colorTheme]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) setVisibleCount((prev) => prev + 50);
    }, { threshold: 0.1 });
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [students.length]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const rows = await readExcel(file);
      const batch = writeBatch(db);
      let count = 0;
      rows.forEach(row => {
         const fName = row['الاسم الكامل'] || row['firstName'] || row['الاسم الأول'];
         const reg = row['رقم القيد'] || row['regNumber'];
         const page = row['رقم الصفحة'] || row['pageNumber'];
         if (fName && reg) {
            const ref = doc(studentsCollection);
            batch.set(ref, {
               firstName: String(fName).trim(),
               regNumber: String(reg).trim(),
               pageNumber: String(page || '').trim(),
               isDeleted: false,
               createdAt: Date.now() + count
            });
            count++;
         }
      });
      await batch.commit();
      setAlertConfig({ message: `تم استيراد ${count} سجل بنجاح`, type: 'success' });
    } catch (e) { setAlertConfig({ message: "فشل الاستيراد", type: 'error' }); }
    setImporting(false);
  };

  const executeDeleteAll = async () => {
     setConfirmConfig(null);
     setLoading(true);
     try {
       const snap = await getDocs(studentsCollection);
       const CHUNK_SIZE = 400;
       const allDocs = snap.docs;
       for (let i = 0; i < allDocs.length; i += CHUNK_SIZE) {
          const batch = writeBatch(db);
          const chunk = allDocs.slice(i, i + CHUNK_SIZE);
          chunk.forEach((d) => batch.delete(d.ref));
          await batch.commit();
       }
       setAlertConfig({ message: 'تم حذف كافة البيانات بنجاح', type: 'success' });
       setView('list');
     } catch (e) { setAlertConfig({ message: "فشل حذف البيانات", type: 'error' }); }
     finally { setLoading(false); }
  };

  const handleRestore = async (id: string) => {
    try {
        await updateDoc(doc(db, "students", id), { isDeleted: false });
        setAlertConfig({ message: 'تم استعادة السجل بنجاح', type: 'success' });
    } catch(e) { console.error(e); }
  };

  const handleDeleteForever = (id: string) => {
    setConfirmConfig({
        title: "حذف نهائي",
        message: "هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع عن هذا الإجراء.",
        isDestructive: true,
        onConfirm: async () => {
            await deleteDoc(doc(db, "students", id));
            setConfirmConfig(null);
            setAlertConfig({ message: 'تم الحذف نهائياً', type: 'success' });
        }
    });
  };

  const checkSimilarStudents = (val: string) => {
    const name = val.trim();
    if (name.length < 2) {
        setSimilarStudents([]);
        return;
    }
    const matches = students.filter(s => 
        !s.isDeleted && 
        s.id !== selectedId &&
        s.firstName.includes(name)
    );
    setSimilarStudents(matches);
  };

  const filtered = useMemo(() => {
    let res = students.filter(s => view === 'trash' ? s.isDeleted : !s.isDeleted);
    if (selectedRegFilter) res = res.filter(s => s.regNumber === selectedRegFilter);
    if (yearFilter !== 'ALL') res = res.filter(s => new Date(s.createdAt).getFullYear().toString() === yearFilter);
    if (statusFilter !== 'ALL') res = res.filter(s => (s.status || 'active') === statusFilter);
    if (debouncedQuery) {
       const q = debouncedQuery.toLowerCase();
       res = res.filter(s => s.firstName.toLowerCase().includes(q) || (s.lastName && s.lastName.toLowerCase().includes(q)));
    }
    if (sortBy === 'alphabetical') res.sort((a,b) => a.firstName.localeCompare(b.firstName));
    else res.sort((a,b) => b.createdAt - a.createdAt);
    return res;
  }, [students, debouncedQuery, selectedRegFilter, statusFilter, sortBy, yearFilter, view]);

  const displayed = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  if (!user) return <Login />;

  return (
    <>
      <div className="min-h-screen no-print pb-20">
        <header className="bg-white border-b sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/80">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-slate-800 cursor-pointer" onClick={() => setView('list')}>
              <div className={`${currentTheme.primary} text-white p-1.5 rounded-lg shadow-lg transition-colors`}><Users size={18} /></div>
              <span>سجل القيود</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowThemeModal(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><Palette size={20} /></button>
              <button onClick={() => setView('settings')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><Settings size={20} /></button>
              <button onClick={() => setConfirmConfig({ title: "تسجيل خروج", message: "هل أنت متأكد؟", onConfirm: () => signOut(auth) })} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"><LogOut size={20} /></button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-4">
            {loading ? <SkeletonLoader /> : (
                <div className="animate-fade-in space-y-4">
                  {view === 'trash' && (
                    <div className="flex items-center justify-between bg-red-50 p-3 rounded-xl border border-red-100 animate-slide-up">
                        <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                            <Trash2 size={20} />
                            <span>سلة المهملات</span>
                        </div>
                        <button onClick={() => setView('list')} className="flex items-center gap-2 bg-white text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50 transition-colors"><ArrowLeft size={16}/> العودة</button>
                    </div>
                  )}

                  {view !== 'trash' && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard title="إجمالي الطلاب" value={stats.total} icon={<Users size={18}/>} colorClass={currentTheme.secondary} />
                        <StatCard title="المستمرون" value={stats.activeOnly} icon={<UserCheck size={18}/>} colorClass="bg-emerald-600" />
                        <StatCard title="القيود" value={stats.regs} icon={<FileSpreadsheet size={18}/>} colorClass="bg-indigo-600" onClick={() => setView('stats')} />
                        <StatCard title="أخرى" value={stats.others} icon={<AlertTriangle size={18}/>} colorClass="bg-amber-500" onClick={() => setView('statusStats')} />
                    </div>
                  )}

                  {/* Sticky Search Only - Separated and thinner */}
                  <div className="sticky top-14 z-30 bg-slate-50/95 backdrop-blur shadow-sm p-1.5 rounded-xl border border-slate-200 transition-all mb-3">
                     <div className={`relative flex items-center bg-white rounded-lg border border-slate-200 px-3 py-1 focus-within:ring-2 ${currentTheme.ring} transition-all`}>
                         <Search className="text-slate-400 ml-1" size={16} />
                         <input className="flex-1 bg-transparent outline-none text-slate-700 h-8 font-bold text-xs" placeholder="ابحث باسم الطالب..." value={search} onChange={(e) => setSearch(e.target.value)} />
                     </div>
                  </div>

                  {/* Filters - Not Sticky */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-center mb-4">
                      <select value={selectedRegFilter} onChange={(e) => setSelectedRegFilter(e.target.value)} className="bg-white rounded-lg px-2 py-2 border border-slate-200 text-xs font-bold outline-none h-9">
                          <option value="">جميع القيود</option>
                          {Array.from(new Set(students.filter(s => !s.isDeleted).map(s => s.regNumber))).sort((a,b) => Number(a)-Number(b)).map(r => <option key={r} value={r}>قيد {r}</option>)}
                      </select>
                      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white rounded-lg px-2 py-2 border border-slate-200 text-xs font-bold outline-none h-9">
                          <option value="ALL">كل الحالات</option>
                          <option value="active">مستمر</option>
                          <option value="transferred">منقول</option>
                          <option value="left">تارك</option>
                          <option value="graduated">تخرج</option>
                      </select>
                      <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-white rounded-lg px-2 py-2 border border-slate-200 text-xs font-bold outline-none h-9">
                          <option value="recent">الأحدث</option>
                          <option value="alphabetical">أبجدي</option>
                      </select>
                      <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="bg-white rounded-lg px-2 py-2 border border-slate-200 text-xs font-bold outline-none h-9">
                          <option value="ALL">كل السنوات</option>
                          {years.map(y => <option key={y} value={y.toString()}>{y}</option>)}
                      </select>
                  </div>

                  {/* Action Buttons (Not Sticky) */}
                  <div className="flex gap-3">
                        <button onClick={() => { setSelectedId(null); setView('add'); setSimilarStudents([]); }} className={`flex-1 ${currentTheme.primary} ${currentTheme.hover} text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-colors`}><Plus size={16} /> إضافة سجل جديد</button>
                        <button onClick={() => setShowPrintModal(true)} className="flex-1 bg-white text-slate-700 border px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"><Printer size={16} /> خيارات الطباعة</button>
                  </div>

                  <div className="hidden md:block bg-white rounded-2xl border shadow-xl overflow-hidden mt-3">
                    <table className="w-full text-right border-collapse">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase">
                        <tr>
                          <th className="px-4 py-2 w-12 text-center">#</th>
                          <th className="px-4 py-2">اسم الطالب</th>
                          <th className="px-4 py-2 w-28 text-center">رقم القيد</th>
                          <th className="px-4 py-2 w-24 text-center">الصفحة</th>
                          {view === 'trash' && <th className="px-4 py-2 w-32 text-center">إجراءات</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {displayed.map((s, idx) => (
                          <tr key={s.id} onClick={() => { if(view !== 'trash') { setSelectedId(s.id); setView('detail'); }}} className={`hover:bg-blue-50/40 cursor-pointer transition-all border-b border-slate-50 group h-10 ${view === 'trash' ? 'cursor-default' : ''}`}>
                            <td className="px-4 py-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${s.status === 'graduated' ? 'bg-blue-500' : s.status === 'left' ? 'bg-rose-500' : s.status === 'transferred' ? 'bg-amber-500' : 'bg-emerald-500'}`} title={s.status === 'graduated' ? 'تخرج' : s.status === 'left' ? 'تارك' : s.status === 'transferred' ? 'منقول' : 'مستمر'}></div>
                                    <span className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{cleanName(s.firstName)} {s.lastName || ""}</span>
                                </div>
                            </td>
                            <td className="px-4 py-2 text-center"><span className={`${currentTheme.primary} text-white px-2 py-0.5 rounded-md font-mono inline-block min-w-[40px] shadow-sm transition-colors text-[10px]`}>{s.regNumber}</span></td>
                            <td className="px-4 py-2 text-center"><span className="bg-[#FFA500] text-white px-2 py-0.5 rounded-md font-mono inline-block min-w-[40px] shadow-sm text-[10px]">{s.pageNumber}</span></td>
                            {view === 'trash' && (
                                <td className="px-4 py-2 text-center flex gap-1 justify-center">
                                     <button onClick={(e) => { e.stopPropagation(); handleRestore(s.id); }} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200" title="استعادة"><RotateCcw size={14}/></button>
                                     <button onClick={(e) => { e.stopPropagation(); handleDeleteForever(s.id); }} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="حذف نهائي"><Trash2 size={14}/></button>
                                </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden space-y-2 mt-3">
                     {displayed.map((s, idx) => (
                         <div key={s.id} onClick={() => { if(view !== 'trash') { setSelectedId(s.id); setView('detail'); }}} className={`bg-white rounded-xl p-3 shadow-sm border border-slate-200 relative mb-2 hover:bg-slate-50 group transition-colors ${view === 'trash' ? 'cursor-default' : ''}`}>
                            <div className={`absolute top-0 bottom-0 left-0 w-1 ${s.status === 'graduated' ? 'bg-blue-500' : s.status === 'left' ? 'bg-rose-500' : s.status === 'transferred' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                            <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors flex items-center">
                               <span className="text-slate-400 font-mono ml-2 text-xs bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">#{idx + 1}</span>
                               {cleanName(s.firstName)} {s.lastName || ""}
                            </h3>
                            <div className="mt-2 flex gap-2 border-t border-slate-100 pt-2">
                                <span className={`${currentTheme.primary} text-white px-2 py-0.5 rounded text-xs font-bold shadow-sm transition-colors`}>ق {s.regNumber}</span>
                                <span className="bg-[#FFA500] text-white px-2 py-0.5 rounded text-xs font-bold shadow-sm">ص {s.pageNumber}</span>
                            </div>
                            {view === 'trash' && (
                                <div className="mt-2 pt-2 border-t border-slate-100 flex gap-2">
                                     <button onClick={(e) => { e.stopPropagation(); handleRestore(s.id); }} className="flex-1 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg font-bold text-xs flex items-center justify-center gap-1"><RotateCcw size={14}/> استعادة</button>
                                     <button onClick={(e) => { e.stopPropagation(); handleDeleteForever(s.id); }} className="flex-1 py-1.5 bg-red-50 text-red-600 rounded-lg font-bold text-xs flex items-center justify-center gap-1"><Trash2 size={14}/> حذف نهائي</button>
                                </div>
                            )}
                         </div>
                     ))}
                  </div>
                  <div ref={loadMoreRef} className="h-10"></div>
                </div>
            )}
        </main>

        {showScrollTop && (
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={`fixed bottom-6 left-6 ${currentTheme.primary} ${currentTheme.hover} text-white p-2.5 rounded-full shadow-xl z-50 animate-fade-in transition-all`}>
                <ArrowUp size={20} />
            </button>
        )}

        {(view === 'add' || view === 'edit') && (
            <Modal onClose={() => { setView('list'); setSimilarStudents([]); }}>
              <div className="bg-white rounded-2xl shadow-2xl p-5 space-y-4">
                <h2 className="text-lg font-bold">{view === 'add' ? 'إضافة سجل طالب' : 'تعديل بيانات الطالب'}</h2>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    const regNum = String(form.get('regNumber')).trim();
                    const pageNum = String(form.get('pageNumber')).trim();
                    
                    const isDuplicate = students.some(s => 
                        !s.isDeleted && 
                        s.regNumber === regNum && 
                        s.pageNumber === pageNum && 
                        s.id !== selectedId
                    );

                    if (isDuplicate) {
                        setAlertConfig({ message: "خطأ: هذا القيد مسجل بالفعل في نفس الصفحة لطالب آخر.", type: 'error' });
                        return;
                    }

                    const data = {
                        firstName: form.get('firstName'),
                        lastName: form.get('lastName'),
                        regNumber: regNum,
                        pageNumber: pageNum,
                        notes: form.get('notes'),
                        status: form.get('status') || 'active',
                        isDeleted: false,
                        createdAt: view === 'edit' ? new Date(form.get('createdAt') as string).getTime() : Date.now()
                    };
                    try {
                        if (view === 'edit' && selectedId) await updateDoc(doc(db, "students", selectedId), data);
                        else await addDoc(studentsCollection, data);
                        setView('list');
                        setSimilarStudents([]);
                        setAlertConfig({ message: 'تم الحفظ بنجاح', type: 'success' });
                    } catch(err) { setAlertConfig({ message: "حدث خطأ", type: 'error' }); }
                }} className="space-y-3">
                   <div>
                       <input 
                           name="firstName" 
                           required 
                           defaultValue={view === 'edit' ? cleanName(students.find(s=>s.id===selectedId)?.firstName || '') : ''} 
                           className={`w-full p-2.5 rounded-xl bg-slate-50 outline-none border ${currentTheme.ring} font-bold text-sm`} 
                           placeholder="اسم الطالب" 
                           onChange={(e) => checkSimilarStudents(e.target.value)} 
                           autoComplete="off"
                       />
                       {similarStudents.length > 0 && (
                           <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-2 animate-fade-in">
                               <div className="flex items-center gap-1 text-amber-800 font-bold text-[10px] mb-1">
                                   <AlertTriangle size={12}/>
                                   <span>تنبيه: أسماء مشابهة مسجلة مسبقاً</span>
                               </div>
                               <div className="max-h-24 overflow-y-auto space-y-1">
                                   {similarStudents.map(s => (
                                       <div key={s.id} className="flex justify-between items-center bg-white p-1.5 rounded-lg border border-amber-100 text-[10px]">
                                           <span className="font-bold text-slate-700 truncate ml-1">{cleanName(s.firstName)}</span>
                                           <div className="flex gap-1 flex-shrink-0">
                                               <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold">قيد {s.regNumber}</span>
                                               <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded font-mono font-bold">ص {s.pageNumber}</span>
                                           </div>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       )}
                   </div>
                   <input name="lastName" defaultValue={view === 'edit' ? students.find(s=>s.id===selectedId)?.lastName : ''} className={`w-full p-2.5 rounded-xl bg-slate-50 outline-none border ${currentTheme.ring} font-bold text-sm`} placeholder="اللقب (اختياري)" />
                   <div className="grid grid-cols-2 gap-3">
                     <input name="regNumber" required className="w-full p-2.5 rounded-xl bg-slate-50 border outline-none text-center font-bold text-sm" placeholder="رقم القيد" defaultValue={view === 'edit' ? students.find(s=>s.id===selectedId)?.regNumber : ''} />
                     <input name="pageNumber" required className="w-full p-2.5 rounded-xl bg-slate-50 border outline-none text-center font-bold text-sm" placeholder="رقم الصفحة" defaultValue={view === 'edit' ? students.find(s=>s.id===selectedId)?.pageNumber : ''} />
                   </div>
                   <input type="date" name="createdAt" className="w-full p-2.5 rounded-xl bg-slate-50 border outline-none font-bold text-sm" defaultValue={view === 'edit' ? formatDateForInput(students.find(s=>s.id===selectedId)?.createdAt) : formatDateForInput(Date.now())} />
                   <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">حالة الطالب</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <label className="cursor-pointer group">
                            <input type="radio" name="status" value="active" className="peer hidden" defaultChecked={view==='add' || students.find(s=>s.id===selectedId)?.status === 'active'} />
                            <div className="py-2 px-1 rounded-xl border-2 border-slate-100 text-center font-bold text-xs text-slate-500 peer-checked:bg-emerald-500 peer-checked:text-white peer-checked:border-emerald-500 transition-all">مستمر</div>
                        </label>
                        <label className="cursor-pointer group">
                            <input type="radio" name="status" value="transferred" className="peer hidden" defaultChecked={students.find(s=>s.id===selectedId)?.status === 'transferred'} />
                            <div className="py-2 px-1 rounded-xl border-2 border-slate-100 text-center font-bold text-xs text-slate-500 peer-checked:bg-amber-500 peer-checked:text-white peer-checked:border-amber-500 transition-all">منقول</div>
                        </label>
                        <label className="cursor-pointer group">
                            <input type="radio" name="status" value="left" className="peer hidden" defaultChecked={students.find(s=>s.id===selectedId)?.status === 'left'} />
                            <div className="py-2 px-1 rounded-xl border-2 border-slate-100 text-center font-bold text-xs text-slate-500 peer-checked:bg-rose-500 peer-checked:text-white peer-checked:border-rose-500 transition-all">تارك</div>
                        </label>
                        <label className="cursor-pointer group">
                            <input type="radio" name="status" value="graduated" className="peer hidden" defaultChecked={students.find(s=>s.id===selectedId)?.status === 'graduated'} />
                            <div className="py-2 px-1 rounded-xl border-2 border-slate-100 text-center font-bold text-xs text-slate-500 peer-checked:bg-blue-500 peer-checked:text-white peer-checked:border-blue-500 transition-all">تخرج</div>
                        </label>
                      </div>
                   </div>
                   <input name="notes" defaultValue={view === 'edit' ? students.find(s=>s.id===selectedId)?.notes : ''} className={`w-full p-2.5 rounded-xl bg-slate-50 outline-none border ${currentTheme.ring} font-bold text-sm`} placeholder="ملاحظات (اختياري)" />
                   <button className={`w-full ${currentTheme.primary} ${currentTheme.hover} text-white py-2.5 rounded-xl font-bold shadow-xl transition-colors text-sm`}>حفظ</button>
                </form>
              </div>
            </Modal>
        )}

        {showThemeModal && (
          <Modal onClose={() => setShowThemeModal(false)}>
            <div className="bg-white rounded-2xl p-5 text-center space-y-4 shadow-xl">
               <h3 className="text-lg font-bold">اختر لون التطبيق</h3>
               <div className="grid grid-cols-2 gap-3">
                  {Object.entries(themeColors).map(([key, value]) => (
                    <button 
                      key={key} 
                      onClick={() => { setColorTheme(key); setShowThemeModal(false); }}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${colorTheme === key ? `border-black bg-slate-50` : 'border-transparent hover:bg-slate-50'}`}
                    >
                       <div className={`w-6 h-6 rounded-full ${value.primary}`}></div>
                       <span className="font-bold text-slate-700 text-sm">{value.name}</span>
                    </button>
                  ))}
               </div>
               <button onClick={() => setShowThemeModal(false)} className="w-full py-2.5 bg-slate-100 font-bold rounded-xl text-slate-600 text-sm">إغلاق</button>
            </div>
          </Modal>
        )}

        {view === 'settings' && (
            <Modal onClose={() => setView('list')}>
              <div className="bg-white rounded-2xl shadow-xl p-5 space-y-3">
                <h2 className="text-lg font-bold flex items-center gap-2"><Settings size={18}/> الإعدادات</h2>
                <button onClick={() => setView('trash')} className="w-full py-3 bg-slate-50 rounded-xl font-bold flex justify-between px-3 hover:bg-slate-100 transition-colors text-sm"><span>سلة المهملات</span> <ArrowRight size={16}/></button>
                <button onClick={() => setView('stats')} className="w-full py-3 bg-blue-50 text-blue-700 rounded-xl font-bold px-3 flex items-center gap-2 hover:bg-blue-100 transition-transform active:scale-95 text-sm"><BarChart3 size={18}/> إحصائيات القيود</button>
                <button onClick={() => exportToExcel(students.filter(s=>!s.isDeleted))} className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold px-3 flex items-center gap-2 hover:bg-emerald-100 transition-transform active:scale-95 text-sm"><Download size={18}/> تصدير Excel</button>
                <button onClick={generateTemplate} className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold px-3 flex items-center gap-2 hover:bg-indigo-100 transition-transform active:scale-95 text-sm"><FileSpreadsheet size={18}/> نموذج 2000 طالب</button>
                <label className={`w-full py-3 ${currentTheme.primary} ${currentTheme.hover} text-white rounded-xl font-bold flex items-center justify-between px-3 cursor-pointer transition-colors text-sm`}>
                    <span className="flex items-center gap-2"><Upload size={18}/> استيراد من Excel</span>
                    <input type="file" className="hidden" accept=".xlsx" onChange={handleImport} disabled={importing} />
                </label>
                <div className="pt-3 border-t border-slate-100 mt-1">
                   <button onClick={() => setConfirmConfig({ title: "حذف شامل", message: "هل أنت متأكد من حذف كافة البيانات نهائياً؟", onConfirm: executeDeleteAll, isDestructive: true })} className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold px-3 flex items-center gap-2 hover:bg-red-100 transition-transform active:scale-95 text-sm"><Trash2 size={18}/> حذف كافة البيانات</button>
                </div>
              </div>
            </Modal>
        )}

        {view === 'stats' && (
            <Modal onClose={() => setView('list')}>
                <div className="bg-white rounded-2xl shadow-xl p-5 space-y-4 max-h-[80vh] flex flex-col w-full">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <BarChart3 size={20} className="text-blue-600" /> إحصائيات القيود
                    </h2>
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full text-right border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 text-sm font-bold text-slate-500 border-b border-slate-200">رقم القيد</th>
                                    <th className="p-3 text-sm font-bold text-slate-500 border-b border-slate-200">عدد الطلاب</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {regStats.length > 0 ? regStats.map((item) => (
                                    <tr key={item.reg} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-bold text-slate-700 text-sm">قيد {item.reg}</td>
                                        <td className="p-3 font-bold text-slate-900 text-sm">
                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg">
                                                {item.count} طالب
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={2} className="p-4 text-center text-slate-400 font-bold text-sm">لا توجد بيانات متاحة</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                     <button onClick={() => setView('list')} className="w-full py-3 bg-slate-100 font-bold rounded-xl text-slate-600 text-sm hover:bg-slate-200 transition-colors">إغلاق</button>
                </div>
            </Modal>
        )}

        {view === 'statusStats' && (
            <Modal onClose={() => setView('list')}>
                <div className="bg-white rounded-2xl shadow-xl p-5 space-y-4 max-h-[80vh] flex flex-col w-full">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <PieChart size={20} className="text-amber-500" /> إحصائيات الحالة الدراسية
                    </h2>
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full text-right border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 text-sm font-bold text-slate-500 border-b border-slate-200">الحالة</th>
                                    <th className="p-3 text-sm font-bold text-slate-500 border-b border-slate-200">عدد الطلاب</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {statusStats.map((item) => (
                                    <tr key={item.label} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-bold text-slate-700 text-sm">{item.label}</td>
                                        <td className="p-3 font-bold text-sm">
                                            <span className={`px-2 py-1 rounded-lg ${item.color}`}>
                                                {item.count} طالب
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     <button onClick={() => setView('list')} className="w-full py-3 bg-slate-100 font-bold rounded-xl text-slate-600 text-sm hover:bg-slate-200 transition-colors">إغلاق</button>
                </div>
            </Modal>
        )}

        {view === 'detail' && selectedId && (() => {
            const s = students.find(x => x.id === selectedId);
            if (!s) return null;
            const statusLabels: Record<string, string> = { 'active': 'مستمر', 'transferred': 'منقول', 'left': 'تارك', 'graduated': 'تخرج' };
            const statusColors: Record<string, string> = { 'active': 'bg-emerald-100 text-emerald-700', 'transferred': 'bg-amber-100 text-amber-700', 'left': 'bg-rose-100 text-rose-700', 'graduated': 'bg-blue-100 text-blue-700' };

            return (
              <Modal onClose={() => { setView('list'); setSimilarStudents([]); }}>
                 <div className="bg-white rounded-3xl shadow-2xl p-5 md:p-6 space-y-6 animate-slide-up relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-8 -mt-8"></div>
    
                    <div className="relative">
                        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{cleanName(s.firstName)}</h1>
                        <h2 className="text-lg font-bold text-slate-400">{s.lastName || ""}</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div className={`${currentTheme.primary} text-white p-4 rounded-xl shadow-lg flex flex-col items-center justify-center transform transition-transform hover:scale-[1.02]`}>
                           <span className="text-slate-200 text-[10px] font-bold uppercase tracking-wider mb-1">رقم القيد</span>
                           <span className="text-3xl font-mono font-black">{s.regNumber}</span>
                       </div>
                       <div className="bg-white border-2 border-slate-100 p-4 rounded-xl shadow-sm flex flex-col items-center justify-center transform transition-transform hover:scale-[1.02]">
                           <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">رقم الصفحة</span>
                           <span className="text-3xl font-mono font-black text-slate-800">{s.pageNumber}</span>
                       </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white rounded-lg shadow-sm"><Calendar size={16} className="text-slate-500"/></div>
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400">تاريخ التسجيل</div>
                                    <div className="font-bold text-slate-800 text-sm">{new Date(s.createdAt).toLocaleDateString('ar-EG')}</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white rounded-lg shadow-sm"><Info size={16} className="text-slate-500"/></div>
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400">حالة القيد</div>
                                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold mt-0.5 ${statusColors[s.status || 'active'] || statusColors['active']}`}>
                                        {statusLabels[s.status || 'active'] || 'مستمر'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {s.notes && (
                            <div className="pt-3 border-t border-slate-200">
                                <div className="text-[10px] font-bold text-slate-400 mb-1">ملاحظات</div>
                                <p className="text-slate-700 font-medium leading-relaxed text-sm">{s.notes}</p>
                            </div>
                        )}
                    </div>

                    <button onClick={() => { setSelectedId(s.id); setPrintMode('single'); setTimeout(() => window.print(), 500); }} className={`w-full ${currentTheme.secondary} ${currentTheme.secondaryHover} text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-sm`}><Printer size={18}/> طباعة البطاقة</button>
                    <div className="flex gap-2">
                        <button onClick={() => { setView('edit'); setSimilarStudents([]); }} className="flex-1 bg-slate-100 py-2.5 rounded-xl font-bold hover:bg-slate-200 text-slate-700 transition-colors text-sm">تعديل البيانات</button>
                        {view !== 'trash' && (
                            <button onClick={() => setConfirmConfig({ title: "حذف الطالب", message: "نقل إلى سلة المهملات؟", onConfirm: async () => { await updateDoc(doc(db, "students", s.id), { isDeleted: true }); setView('list'); setConfirmConfig(null); setSelectedId(null); setAlertConfig({ message: 'تم الحذف بنجاح', type: 'success' }); } })} className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-xl font-bold hover:bg-red-100 transition-colors text-sm">حذف</button>
                        )}
                    </div>
                 </div>
              </Modal>
            );
        })()}

        {showPrintModal && (
            <Modal onClose={() => setShowPrintModal(false)}>
               <div className="bg-white rounded-2xl p-5 text-center space-y-3 shadow-xl">
                  <h3 className="text-lg font-bold">خيارات الطباعة</h3>
                  <button onClick={() => { setPrintMode('list'); setPrintRegInput(''); setShowPrintModal(false); setTimeout(() => window.print(), 500); }} className={`w-full py-2.5 ${currentTheme.primary} ${currentTheme.hover} text-white rounded-xl font-bold transition-colors text-sm`}>طباعة السجل الحالي بالكامل</button>
                  <div className="text-slate-400 text-[10px]">أو اطبع قيداً محدداً</div>
                  <select value={printRegInput} onChange={(e) => setPrintRegInput(e.target.value)} className={`w-full p-2.5 border rounded-xl text-center font-bold outline-none text-sm ${currentTheme.ring}`}>
                       <option value="">اختر رقم القيد...</option>
                       {Array.from(new Set(students.filter(s => !s.isDeleted).map(s => s.regNumber))).sort().map(r => <option key={r} value={r}>قيد {r}</option>)}
                  </select>
                  <button onClick={() => { setPrintMode('list'); setSelectedRegFilter(printRegInput); setShowPrintModal(false); setTimeout(() => window.print(), 500); }} className={`w-full py-2.5 ${currentTheme.secondary} ${currentTheme.secondaryHover} text-white rounded-xl font-bold disabled:opacity-50 transition-colors text-sm`} disabled={!printRegInput}>طباعة القيد المختار</button>
               </div>
            </Modal>
        )}

        {confirmConfig && <ConfirmModal title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(null)} isDestructive={confirmConfig.isDestructive} />}
        {alertConfig && <AlertModal message={alertConfig.message} type={alertConfig.type} onClose={() => setAlertConfig(null)} />}
        
        {importing && (
          <Modal onClose={() => {}} zIndex="z-[80]">
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
              <div className="animate-spin text-blue-600"><Loader2 size={48} /></div>
              <h3 className="text-xl font-bold text-slate-800">جاري استيراد البيانات...</h3>
              <p className="text-slate-500">يرجى الانتظار قليلاً</p>
            </div>
          </Modal>
        )}
      </div>
      
      {printMode === 'list' && <PrintView students={filtered} title={selectedRegFilter ? `سجل قيد رقم ${selectedRegFilter}` : "فهرس القيد العام"} />}
      {printMode === 'single' && selectedId && students.find(s=>s.id===selectedId) && <SingleStudentPrint student={students.find(s=>s.id===selectedId)!} />}
    </>
  );
};

export default App;
