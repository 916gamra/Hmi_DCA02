import React, { useState } from 'react';
import { Camera, Upload, X, QrCode as QrIcon } from 'lucide-react';
import { Translations, Language, translations } from '../core/i18n';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  t?: Translations;
  lang?: Language;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  t: propT,
  lang = 'ar',
}) => {
  const t = propT || translations[lang];
  const [method, setMethod] = useState<'camera' | 'upload' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCameraScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // In a real app, you'd pass the stream to a QR scanner library here
      console.log('Camera access granted', stream);
      // For now, just close as we don't have the scanner library
      stream.getTracks().forEach(track => track.stop());
      onClose();
    } catch (err) {
      setError(lang === 'ar' ? 'تعذر الوصول للكاميرا. تأكد من منح الصلاحيات.' : 'Accès caméra refusé.');
      console.error('Camera error:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Logic for handling file upload would go here
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 select-none" dir="ltr">
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-2xl max-w-sm w-full overflow-hidden p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
          <h3 className="text-sm font-bold text-[#0f172a]">
            {lang === 'ar' ? 'استقبال وصفة QR' : 'Scanner / Charger QR'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#f1f5f9] text-[#94a3b8] hover:text-[#0f172a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleCameraScan}
            className="flex items-center gap-3 p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#2563eb] transition-all cursor-pointer"
          >
            <Camera className="w-6 h-6 text-[#2563eb]" />
            <div className="text-left">
              <span className="block text-sm font-bold text-[#0f172a]">
                {lang === 'ar' ? 'استخدام الكاميرا' : 'Utiliser la caméra'}
              </span>
              <span className="text-xs text-[#64748b]">
                {lang === 'ar' ? 'مسح رمز QR مباشرة' : 'Scanner le QR code'}
              </span>
            </div>
          </button>

          <label className="flex items-center gap-3 p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#2563eb] transition-all cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            <Upload className="w-6 h-6 text-[#059669]" />
            <div className="text-left">
              <span className="block text-sm font-bold text-[#0f172a]">
                {lang === 'ar' ? 'تحميل صورة' : 'Charger une image'}
              </span>
              <span className="text-xs text-[#64748b]">
                {lang === 'ar' ? 'اختيار صورة من الهاتف' : 'Choisir une photo'}
              </span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
