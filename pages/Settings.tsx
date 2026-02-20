
import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import * as XLSX from 'xlsx';
import { DAYS_TR } from '../constants';
import { SchoolSettings, TeacherSchedule, DutyAssignment, SubstitutionRecord } from '../types';

const Settings: React.FC = () => {
  // --- SETTINGS STATE ---
  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: localStorage.getItem('school_name') || 'AKSARAY ŞEHİT ÖNDER GÜZEL KIZ ANADOLU İMAM HATİP LİSESİ',
    principalName: localStorage.getItem('principal_name') || 'MÜDÜR',
    messagePrefix: localStorage.getItem('msg_prefix') || '[NİS İKAME]',
    academicYear: localStorage.getItem('academic_year') || '2025-2026',
    showApprovalFooter: true,
    customFooter: ''
  });

  const [resetConfirm, setResetConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState<'schedule' | 'duty' | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<'schedule' | 'duty' | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // --- ANALYTICS STATE (Moved from Dashboard) ---
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [history, setHistory] = useState<SubstitutionRecord[]>([]);

  useEffect(() => {
    const data = localStorage.getItem('substitution_history');
    if (data) setHistory(JSON.parse(data));
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    
    const filtered = history.filter(item => {
      if (period === 'weekly') return (now - item.timestamp) < oneWeek;
      return (now - item.timestamp) < oneMonth;
    });

    const teacherCounts: { [name: string]: number } = {};
    filtered.forEach(record => {
      teacherCounts[record.substituteTeacherName] = (teacherCounts[record.substituteTeacherName] || 0) + 1;
    });

    return {
      total: filtered.length,
      ranking: Object.entries(teacherCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    };
  }, [history, period]);

  // --- HANDLERS ---
  const saveSettings = () => {
    localStorage.setItem('school_name', settings.schoolName);
    localStorage.setItem('principal_name', settings.principalName);
    localStorage.setItem('msg_prefix', settings.messagePrefix);
    localStorage.setItem('academic_year', settings.academicYear);
    alert('Kurum ayarları başarıyla kaydedildi.');
  };

  const resetStatsOnly = () => {
    localStorage.removeItem('substitution_history');
    setHistory([]);
    setResetConfirm(false);
    alert('İkame istatistikleri başarıyla sıfırlandı.');
  };

  const normalizeName = (name: any): string => {
    if (!name) return "";
    return name.toString().trim().replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR');
  };

  const showSuccess = (type: 'schedule' | 'duty') => {
    setUploadSuccess(type);
    setTimeout(() => setUploadSuccess(null), 3000);
  };

  const handleScheduleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading('schedule');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        const teachersMap = new Map<string, TeacherSchedule>();
        for (let i = 2; i < jsonData.length; i++) {
          const row = jsonData[i];
          const teacherName = normalizeName(row[0]);
          if (!teacherName || teacherName.length < 3) continue;
          const schedule: { [day: string]: string[] } = {};
          DAYS_TR.forEach((day, dayIdx) => {
            const startCol = 1 + (dayIdx * 8);
            const dayLessons = [];
            for (let lessonIdx = 0; lessonIdx < 8; lessonIdx++) {
              dayLessons.push(row[startCol + lessonIdx]?.toString().trim() || "");
            }
            schedule[day] = dayLessons;
          });
          if (!teachersMap.has(teacherName)) teachersMap.set(teacherName, { teacherName, schedule });
        }
        localStorage.setItem('weekly_schedule', JSON.stringify(Array.from(teachersMap.values())));
        showSuccess('schedule');
      } catch (err: unknown) { 
        const msg = err instanceof Error ? err.message : 'Dosya formatı uygun değil.';
        alert('Hata: ' + msg); 
      }
      finally { setIsUploading(null); e.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDutyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading('duty');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        const locations = jsonData[0].slice(1).map(l => l?.toString().trim());
        const dutyAssignments: DutyAssignment[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const dayName = row[0]?.toString().trim();
          if (!dayName) continue;
          locations.forEach((loc, locIdx) => {
            const teacherName = normalizeName(row[locIdx + 1]);
            if (teacherName) dutyAssignments.push({ day: dayName, location: loc || `Bölge ${locIdx + 1}`, teacherName });
          });
        }
        localStorage.setItem('duty_schedule', JSON.stringify(dutyAssignments));
        showSuccess('duty');
      } catch (err: unknown) { 
        const msg = err instanceof Error ? err.message : 'Nöbet dosyası okunamadı.';
        alert('Hata: ' + msg); 
      }
      finally { setIsUploading(null); e.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Layout title="Ayarlar" subtitle="SİSTEM & ANALİZ" icon="tune">
      <div className="px-5 py-6 space-y-8 pb-32">
        
        {/* --- SECTION: ANALYTICS (Moved from Dashboard) --- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600 text-sm">analytics</span>
              İKAME ANALİZİ
            </h2>
            <div className="bg-white/80 p-1 rounded-xl flex gap-1 border border-slate-200/50 shadow-sm scale-90">
              <button 
                onClick={() => setPeriod('weekly')}
                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${
                  period === 'weekly' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                Haftalık
              </button>
              <button 
                onClick={() => setPeriod('monthly')}
                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${
                  period === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                Aylık
              </button>
            </div>
          </div>

          <div className="bg-indigo-900 rounded-[32px] p-6 text-white shadow-2xl shadow-indigo-100 flex flex-col justify-between h-32 relative overflow-hidden">
             <div className="absolute -right-2 -bottom-2 opacity-10">
                <span className="material-symbols-outlined text-[120px]">bar_chart</span>
             </div>
             <div className="relative z-10 flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Toplam İkame Yükü</span>
                <span className="material-symbols-outlined text-indigo-400 text-lg">trending_up</span>
             </div>
             <div className="relative z-10 flex items-baseline gap-2">
                <span className="text-4xl font-black">{stats.total}</span>
                <span className="text-[10px] font-bold text-indigo-300 uppercase">Ders Saati</span>
             </div>
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50 max-h-[300px] overflow-y-auto no-scrollbar">
            {stats.ranking.length > 0 ? stats.ranking.slice(0, 5).map((item, idx) => (
              <div key={item.name} className="p-4 flex items-center justify-between active:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] ${
                    idx === 0 ? 'bg-amber-100 text-amber-700' : 
                    idx === 1 ? 'bg-slate-100 text-slate-600' :
                    idx === 2 ? 'bg-orange-50 text-orange-700' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-[11px] uppercase truncate max-w-[120px]">{item.name}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">{idx === 0 ? 'LİDER' : 'EĞİTMEN'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-md font-black text-indigo-600 leading-none">{item.count}</p>
                  <p className="text-[8px] text-slate-400 font-black uppercase">GÖREV</p>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-slate-400 text-[10px] italic flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-2xl opacity-20">history</span>
                Henüz kayıtlı bir görev verisi bulunmuyor.
              </div>
            )}
          </div>
        </section>

        {/* --- SECTION: SCHOOL SETTINGS --- */}
        <section className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">KURUM BİLGİLERİ</h2>
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 divide-y divide-slate-50 overflow-hidden">
            <div className="p-5 active:bg-slate-50 transition-colors">
              <label className="block text-[9px] font-black text-indigo-600 uppercase mb-2 tracking-wider">Eğitim Dönemi</label>
              <input 
                value={settings.academicYear} 
                onChange={(e) => setSettings({...settings, academicYear: e.target.value})} 
                placeholder="Örn: 2025-2026"
                className="w-full border-none p-0 text-slate-800 focus:ring-0 text-md font-black bg-transparent placeholder:text-slate-200" 
                type="text" 
              />
            </div>
            <div className="p-5 active:bg-slate-50 transition-colors">
              <label className="block text-[9px] font-black text-indigo-600 uppercase mb-2 tracking-wider">Okul Adı</label>
              <input 
                value={settings.schoolName} 
                onChange={(e) => setSettings({...settings, schoolName: e.target.value})} 
                placeholder="Okul ismini giriniz..."
                className="w-full border-none p-0 text-slate-800 focus:ring-0 text-md font-bold bg-transparent placeholder:text-slate-200" 
                type="text" 
              />
            </div>
            <div className="p-5 active:bg-slate-50 transition-colors">
              <label className="block text-[9px] font-black text-indigo-600 uppercase mb-2 tracking-wider">Yetkili</label>
              <input 
                value={settings.principalName} 
                onChange={(e) => setSettings({...settings, principalName: e.target.value})} 
                placeholder="Yetkili ünvanı/ismi..."
                className="w-full border-none p-0 text-slate-800 focus:ring-0 text-md font-bold bg-transparent placeholder:text-slate-200" 
                type="text" 
              />
            </div>
          </div>
          <button 
            onClick={saveSettings} 
            className="w-full bg-[#0f172a] text-white py-4.5 rounded-[22px] font-black text-[11px] uppercase tracking-[2px] shadow-xl active:scale-[0.98] transition-all"
          >
            AYARLARI KAYDET
          </button>
        </section>

        {/* --- SECTION: DATA UPLOAD --- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VERİ YÜKLEME (EXCEL)</h2>
            <button onClick={() => setShowHelp(!showHelp)} className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1">
              YARDIM <span className="material-symbols-outlined text-xs">help</span>
            </button>
          </div>

          {showHelp && (
            <div className="bg-white rounded-[24px] p-5 border border-blue-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                <b>Ders Programı:</b> A sütunu öğretmen, B-AO arası 5 günün 8'er saati.<br/>
                <b>Nöbet Listesi:</b> 1. satır mevkiler, A sütunu gün isimleri.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className={`relative bg-white rounded-[32px] p-6 border transition-all cursor-pointer flex flex-col items-center text-center shadow-sm ${
              uploadSuccess === 'schedule' ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-100 active:bg-slate-50'
            }`}>
              <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleScheduleUpload} />
              <div className={`w-14 h-14 rounded-2xl mb-4 flex items-center justify-center transition-all ${
                uploadSuccess === 'schedule' ? 'bg-emerald-500 text-white' : 'bg-indigo-50 text-indigo-600'
              }`}>
                <span className="material-symbols-outlined text-3xl">
                  {uploadSuccess === 'schedule' ? 'check_circle' : 'calendar_month'}
                </span>
              </div>
              <p className="text-[10px] font-black uppercase text-slate-800 leading-tight">
                {uploadSuccess === 'schedule' ? 'BAŞARILI' : 'DERS PROGRAMI'}
              </p>
            </label>

            <label className={`relative bg-white rounded-[32px] p-6 border transition-all cursor-pointer flex flex-col items-center text-center shadow-sm ${
              uploadSuccess === 'duty' ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-100 active:bg-slate-50'
            }`}>
              <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleDutyUpload} />
              <div className={`w-14 h-14 rounded-2xl mb-4 flex items-center justify-center transition-all ${
                uploadSuccess === 'duty' ? 'bg-emerald-500 text-white' : 'bg-blue-50 text-blue-600'
              }`}>
                <span className="material-symbols-outlined text-3xl">
                  {uploadSuccess === 'duty' ? 'check_circle' : 'shield_person'}
                </span>
              </div>
              <p className="text-[10px] font-black uppercase text-slate-800 leading-tight">
                {uploadSuccess === 'duty' ? 'BAŞARILI' : 'NÖBET LİSTESİ'}
              </p>
            </label>
          </div>
        </section>

        {/* --- SECTION: SYSTEM CLEANING --- */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">SİSTEM TEMİZLİĞİ</h2>
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-6">
            <p className="text-[11px] text-slate-500 font-medium mb-5">Sadece <b>ikame istatistikleri</b> temizlenir. Yüklü programlar silinmez.</p>
            {!resetConfirm ? (
              <button onClick={() => setResetConfirm(true)} className="w-full py-4 rounded-2xl border-2 border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest active:bg-rose-50 transition-colors">İSTATİSTİKLERİ SIFIRLA</button>
            ) : (
              <div className="flex gap-3">
                <button onClick={resetStatsOnly} className="flex-1 py-4 rounded-2xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-100 active:scale-95 transition-all">SİL</button>
                <button onClick={() => setResetConfirm(false)} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">İPTAL</button>
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Settings;
