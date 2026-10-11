import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { DEFAULT_PARAMS } from './core/constants';
import { TrayParams, ViewOptions, RecipePreset } from './types';
import { buildModel } from './core/model';
import { buildTimeline, stateAt } from './core/timeline';
import { generatePlcJson, generateCsvPoints, downloadFile } from './core/recipe';
import { Header } from './components/Header';
import { ParametersPanel } from './components/ParametersPanel';
import { CanvasStage } from './components/CanvasStage';
import { SimulationControls } from './components/SimulationControls';
import { ValidationCard } from './components/ValidationCard';
import { ManualModePage } from './components/ManualModePage';
import { ArticleRecipesPage } from './components/ArticleRecipesPage';
import { BottomNavBar, MainTab } from './components/BottomNavBar';
import { QrCodeModal } from './components/QrCodeModal';
import { QrScannerModal } from './components/QrScannerModal';
import { Toast } from './components/Toast';
import { AutomaticSimulatorSection } from './components/AutomaticSimulatorSection';
import { SaveArticleModal } from './components/SaveArticleModal';
import { Language, translations } from './core/i18n';
import { useDeviceDetection } from './hooks/useDeviceDetection';
import { LayoutGrid } from 'lucide-react';

const STORAGE_KEY = 'hmi-tray-designer-oneui8-v2';
const LANG_STORAGE_KEY = 'hmi-tray-lang';

export default function App() {
  const deviceInfo = useDeviceDetection();

  // 1. Language State (AR & FR)
  const [lang, setLang] = useState<Language>(() => {
    try {
      const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
      if (savedLang === 'fr' || savedLang === 'ar') return savedLang;
    } catch (e) {
      console.warn('Failed to read lang preference:', e);
    }
    return 'ar'; // Default Arabic
  });

  const t = translations[lang];

  // Synchronize document dir (always LTR as requested) and lang attribute
  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch (e) {
      console.warn('Failed to save lang preference:', e);
    }
    document.documentElement.lang = lang;
    document.documentElement.dir = 'ltr'; // Always LTR French layout
  }, [lang]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'ar' ? 'fr' : 'ar'));
  };

  // 2. Navigation State (3 bottom tabs: auto | manual | article)
  const [mainTab, setMainTab] = useState<MainTab>(() => {
    try {
      const savedTab = localStorage.getItem('hmi-tray-tab');
      return (savedTab as MainTab) || 'auto';
    } catch (e) {
      return 'auto';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('hmi-tray-tab', mainTab);
    } catch (e) {
      console.warn('Failed to save tab preference:', e);
    }
  }, [mainTab]);

  // 3. Parameters State
  const [params, setParams] = useState<TrayParams>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_PARAMS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to parse saved parameters:', e);
    }
    return DEFAULT_PARAMS;
  });

  const [viewOptions, setViewOptions] = useState<ViewOptions>({
    sectors: true,
    heads: false,
    rings: true,
    labels: true,
  });

  // Modal & Toast states
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [customPresets, setCustomPresets] = useState<RecipePreset[]>(() => {
    try {
      const saved = localStorage.getItem('hmi-tray-custom-presets');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load custom presets:', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('hmi-tray-custom-presets', JSON.stringify(customPresets));
    } catch (e) {
      console.warn('Failed to save custom presets:', e);
    }
  }, [customPresets]);

  const handleSaveCustomPreset = (title: string, description: string) => {
    const newPreset: RecipePreset = {
      id: `custom-recipe-${Date.now()}`,
      name: title,
      nameFr: title,
      description: description,
      descriptionFr: description,
      tag: lang === 'ar' ? 'مخصصة 🌟' : 'Personnalisée 🌟',
      tagFr: 'Personnalisée 🌟',
      params: { ...params },
    };
    setCustomPresets((prev) => [newPreset, ...prev]);
    showToast(lang === 'ar' ? 'تم حفظ الوصفة / المقال بنجاح' : 'Article / Recette enregistré avec succès');
  };

  const [toast, setToast] = useState<{ message: string | null; type: 'success' | 'error' }>({
    message: null,
    type: 'success',
  });

  // 4. Computed Model & Timeline
  const model = useMemo(() => buildModel(params), [params]);
  const timeline = useMemo(
    () => buildTimeline(model, params.timing),
    [model, params.timing]
  );

  // 5. Simulation State
  const [simTimeMs, setSimTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(params.speed || 1);
  const lastTimeRef = useRef<number>(0);

  const simState = useMemo(() => {
    if (simTimeMs <= 0) return null;
    return stateAt(simTimeMs, timeline, model);
  }, [simTimeMs, timeline, model]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: null, type: 'success' });
    }, 2800);
  }, []);

  // Save params to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
    } catch (e) {
      console.warn('Failed to save parameters:', e);
    }
  }, [params]);

  // Simulation Loop
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(100, now - lastTimeRef.current);
      lastTimeRef.current = now;

      setSimTimeMs((prev) => {
        const next = prev + dt * speed;
        if (next >= timeline.total) {
          setIsPlaying(false);
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#2563eb', '#38bdf8', '#059669'],
          });
          showToast(t.simStatusDone);
          return timeline.total;
        }
        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, speed, timeline.total, showToast, t.simStatusDone]);

  // Parameter updates
  const handleUpdateParams = (updated: Partial<TrayParams>) => {
    setParams((prev) => ({ ...prev, ...updated }));
    setIsPlaying(false);
    setSimTimeMs(0);
  };

  const handleAutoCalculateSpacing = () => {
    if (params.layers <= 1) {
      showToast(lang === 'ar' ? 'طبقة واحدة فقط — لا حاجة لحساب التباعد.' : 'Une seule couche — pas d\'espacement nécessaire.', 'error');
      return;
    }
    // D1 (قطر أول حلقة) = قطر الصينية ناقص الهامش
    const d1 = params.trayD - params.margin;
    const targetDLast = params.rLast;
    // التباعد المتساوي التام بين محيط أول طبقة ومحيط آخر طبقة
    const calculatedSpacing = (d1 - targetDLast) / (params.layers - 1);

    if (calculatedSpacing <= 0) {
      showToast(
        lang === 'ar'
          ? 'قطر آخر حلقة المستهدف أكبر من أو يساوي قطر الطبقة الأولى D₁.'
          : 'Le diamètre de fin est supérieur ou égal au diamètre D₁.',
        'error'
      );
      return;
    }

    const radialDelta = calculatedSpacing / 2;
    if (radialDelta < params.tool) {
      showToast(
        lang === 'ar'
          ? `تنبيه: تباعد القطر (${calculatedSpacing.toFixed(1)} مم) يعطي مسافة شعاعية (${radialDelta.toFixed(1)} مم) أقل من قطر الأداة (${params.tool} مم)، قد يحدث تداخل!`
          : `Avertissement: course radiale (${radialDelta.toFixed(1)} mm) < diamètre outil (${params.tool} mm) !`,
        'error'
      );
    }

    const rounded = Math.round(calculatedSpacing * 10) / 10;
    handleUpdateParams({
      spacing: rounded,
      spacingDisplay: params.spacingU === 'cm' ? Number((rounded / 10).toFixed(1)) : rounded,
    });
    showToast(
      lang === 'ar'
        ? `تم ضبط تباعد القطر تلقائياً: ${rounded} مم (حركة السيرفو الشعاعية: ${(rounded / 2).toFixed(1)} مم)`
        : `Espacement automatique ajusté : ${rounded} mm (Course radiale : ${(rounded / 2).toFixed(1)} mm)`
    );
  };

  const handleApplyPreset = (preset: RecipePreset) => {
    handleUpdateParams(preset.params);
    showToast(
      lang === 'ar'
        ? `تم تطبيق الوصفة: ${preset.name}`
        : `Recette appliquée : ${preset.name}`
    );
  };

  const handleResetDefault = () => {
    localStorage.removeItem(STORAGE_KEY);
    setParams(DEFAULT_PARAMS);
    setIsPlaying(false);
    setSimTimeMs(0);
    showToast(
      lang === 'ar'
        ? 'تمت استعادة الإعدادات المصنعية الافتراضية'
        : 'Paramètres d\'usine restaurés'
    );
  };

  // Simulation controls
  const handleTogglePlay = () => {
    if (model.hasErr) {
      showToast(
        lang === 'ar'
          ? 'يرجى معالجة الأخطاء الهندسية والتداخل أولاً قبل التشغيل.'
          : 'Veuillez corriger les erreurs de collision avant le démarrage.',
        'error'
      );
      return;
    }
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (simTimeMs >= timeline.total) {
      setSimTimeMs(0);
    }
    setIsPlaying(true);
  };

  const handleResetSim = () => {
    setIsPlaying(false);
    setSimTimeMs(0);
  };

  const handleStepNext = () => {
    setIsPlaying(false);
    const nextFire = timeline.acts.find(
      (a) => a.type === 'fire' && a.t0 + a.d > simTimeMs + 1e-4
    );
    setSimTimeMs(nextFire ? nextFire.t0 + nextFire.d : timeline.total);
  };

  const handleStepPrev = () => {
    setIsPlaying(false);
    let prevFire: (typeof timeline.acts)[0] | null = null;
    for (const a of timeline.acts) {
      if (a.type === 'fire' && a.t0 + a.d < simTimeMs - 1e-4) {
        prevFire = a;
      }
    }
    setSimTimeMs(prevFire ? prevFire.t0 + prevFire.d : 0);
  };

  // Exports
  const handleExportJson = () => {
    if (model.hasErr) {
      showToast(
        lang === 'ar'
          ? 'تعذر التصدير: يحتوي التصميم على أخطاء تداخل هندسية.'
          : 'Export impossible : collisions détectées.',
        'error'
      );
      return;
    }
    const jsonStr = generatePlcJson(params, model, timeline.total);
    downloadFile(
      `tray_recipe_D${params.trayD}mm_${model.totalPts}holes.json`,
      jsonStr,
      'application/json'
    );
    showToast(
      lang === 'ar'
        ? 'تم تصدير ملف TouchWin PLC JSON بنجاح'
        : 'Fichier TouchWin PLC JSON exporté avec succès'
    );
  };

  const handleExportCsv = () => {
    if (model.hasErr) {
      showToast(
        lang === 'ar'
          ? 'تعذر التصدير: يحتوي التصميم على أخطاء تداخل هندسية.'
          : 'Export impossible : collisions détectées.',
        'error'
      );
      return;
    }
    const csvStr = generateCsvPoints(model);
    downloadFile(
      `tray_points_D${params.trayD}mm.csv`,
      csvStr,
      'text/csv;charset=utf-8'
    );
    showToast(
      lang === 'ar'
        ? 'تم تصدير جدول نقاط الحفر CSV بنجاح'
        : 'Fichier des points CSV exporté avec succès'
    );
  };

  const handleDeleteCustomPreset = (presetId: string) => {
    setCustomPresets((prev) => prev.filter((p) => p.id !== presetId));
    showToast(lang === 'ar' ? 'تم حذف القالب بنجاح' : 'Article supprimé avec succès');
  };

  const handleExportPresets = () => {
    const dataStr = JSON.stringify(customPresets);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presets_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast(lang === 'ar' ? 'تم تصدير القوالب' : 'Préréglages exportés');
  };

  const handleImportPresets = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setCustomPresets((prev) => [...prev, ...imported]);
        showToast(lang === 'ar' ? 'تم استيراد القوالب' : 'Préréglages importés');
      } catch (err) {
        showToast(lang === 'ar' ? 'خطأ في استيراد الملف' : 'Erreur importation', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      dir="ltr"
      className={`app-container bg-[#f1f4f9] text-[#191c21] transition-all ${
        lang === 'ar' ? 'font-[var(--font-cairo)]' : 'font-[var(--font-sans)]'
      }`}
    >
      {/* 1. Header (Always LTR layout as requested, respecting mobile notch safe-area) */}
      <Header
        model={model}
        lang={lang}
        t={t}
        onToggleLang={toggleLanguage}
        onOpenQr={() => setIsQrScannerOpen(true)}
        onExportJson={handleExportJson}
        onExportCsv={handleExportCsv}
        onResetDefault={handleResetDefault}
      />

      {/* 2. Main Executive Content Container (Scrolls independently within 100dvh) */}
      <main className="flex-1 overflow-y-auto overscroll-contain max-w-[1600px] w-full mx-auto p-3 sm:p-4 md:p-6 pb-6 transition-all">
        {/* TAB 1: AUTOMATIC GUIDE (المحاكي الآلي وتصميم الصينية) */}
        {mainTab === 'auto' && (
          <div className="flex flex-col gap-5 max-w-[1600px] w-full mx-auto">
            {/* Title Header Card */}
            <div className="oneui-card p-4 sm:p-6 bg-gradient-to-r from-white to-[#f8fafc] border border-[#e2e8f0]/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-50 text-[#2563eb] border border-blue-200 flex items-center justify-center shadow-xs shrink-0">
                  <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base md:text-lg font-bold text-[#0f172a] truncate">
                    {t.autoTitle}
                  </h2>
                  <p className="text-xs text-[#64748b] truncate">
                    {t.autoSubtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] xl:grid-cols-[410px_1fr] gap-4 md:gap-6 items-start">
            {/* Sidebar Column: Parameters */}
            <aside className="w-full">
              <ParametersPanel
                params={params}
                model={model}
                t={t}
                lang={lang}
                onChange={handleUpdateParams}
                onAutoCalculateSpacing={handleAutoCalculateSpacing}
              />
            </aside>

            {/* Main Stage Column: Canvas Stage + Controls + Validation KPIs */}
            <AutomaticSimulatorSection
              model={model}
              state={simState}
              options={viewOptions}
              onChangeOptions={setViewOptions}
              currentTimeMs={simTimeMs}
              totalTimeMs={timeline.total}
              isPlaying={isPlaying}
              speed={speed}
              onTogglePlay={handleTogglePlay}
              onReset={handleResetSim}
              onStepNext={handleStepNext}
              onStepPrev={handleStepPrev}
              onScrubTime={(ms) => {
                setIsPlaying(false);
                setSimTimeMs(ms);
              }}
              onChangeSpeed={(spd) => {
                setSpeed(spd);
                handleUpdateParams({ speed: spd });
              }}
              onOpenSaveModal={() => setIsSaveModalOpen(true)}
              onOpenQr={() => setIsQrOpen(true)}
              params={params}
              totalCycleTimeMs={timeline.total}
              t={t}
              lang={lang}
            />
          </div>
        </div>
      )}

        {/* TAB 2: MANUAL MODE (الوضع اليدوي / Mode Manuel) */}
        {mainTab === 'manual' && (
          <ManualModePage
            params={params}
            model={model}
            t={t}
            lang={lang}
            onChangeParams={handleUpdateParams}
            onShowToast={showToast}
          />
        )}

        {/* TAB 3: ARTICLE & RECIPES (قائمة الوصفات وشاشات الآلة TouchWin) */}
        {mainTab === 'article' && (
            <ArticleRecipesPage
              params={params}
              model={model}
              t={t}
              lang={lang}
              onApplyPreset={handleApplyPreset}
              onDeletePreset={handleDeleteCustomPreset}
              onExportPresets={handleExportPresets}
              onImportPresets={handleImportPresets}
              onOpenQr={() => setIsQrOpen(true)}
              customPresets={customPresets}
            />
        )}
      </main>

      {/* 3. Docked Floating Bottom Navigation Bar (3 Tabs: Automatic Guide, Manual, Article) */}
      <BottomNavBar
        currentTab={mainTab}
        onChangeTab={setMainTab}
        t={t}
      />

      {/* 4. Modals & Notifications */}
      <QrCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        params={params}
        model={model}
        totalCycleTimeMs={timeline.total}
      />

      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        t={t}
        lang={lang}
      />

      <SaveArticleModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveCustomPreset}
        t={t}
        lang={lang}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: null, type: 'success' })}
      />
    </div>
  );
}
