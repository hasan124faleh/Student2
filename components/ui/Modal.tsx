import React from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  zIndex?: string;
}

export const Modal: React.FC<ModalProps> = ({ children, onClose, zIndex = "z-50" }) => (
  <div className={`fixed inset-0 bg-slate-900/60 ${zIndex} flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in overflow-y-auto`} onClick={onClose}>
    <div className="w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
        <button 
            onClick={onClose} 
            className="absolute top-3 left-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-[60]"
            title="إغلاق"
        >
            <X size={20} />
        </button>
        {children}
    </div>
  </div>
);

interface AlertModalProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({ message, type, onClose }) => (
  <Modal onClose={onClose} zIndex="z-[60]">
    <div className="bg-white rounded-2xl p-5 text-center shadow-2xl animate-slide-up">
      <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3 ${type === 'error' ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500'}`}>
        {type === 'error' ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
      </div>
      <p className="text-slate-800 font-bold mb-5 text-sm">{message}</p>
      <button onClick={onClose} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm">حسناً</button>
    </div>
  </Modal>
);

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, onConfirm, onCancel, isDestructive = false }) => (
  <Modal onClose={onCancel} zIndex="z-[60]">
    <div className="bg-white rounded-2xl p-5 text-center shadow-2xl animate-slide-up">
      <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 mb-6 text-sm">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 bg-slate-100 rounded-xl font-bold text-sm">إلغاء</button>
        <button onClick={onConfirm} className={`flex-1 py-2.5 text-white rounded-xl font-bold text-sm ${isDestructive ? 'bg-red-500' : 'bg-blue-600'}`}>{isDestructive ? 'حذف' : 'تأكيد'}</button>
      </div>
    </div>
  </Modal>
);
