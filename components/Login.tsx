import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../firebase';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { 
        await signInWithEmailAndPassword(auth, email, password); 
    } catch (err) { 
        setError('بيانات الدخول غير صحيحة'); 
    } finally { 
        setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"><Users className="w-8 h-8 text-white" /></div>
          <h2 className="text-2xl font-bold text-slate-800">تسجيل الدخول</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none text-left bg-slate-50" dir="ltr" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none text-left bg-slate-50" dir="ltr" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg transition-all">{loading ? 'جاري التحقق...' : 'دخول'}</button>
        </form>
      </div>
    </div>
  );
};
