
import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { DAYS_TR, LESSON_HOURS } from '../constants';
import { TeacherSchedule } from '../types';

const Schedule: React.FC = () => {
  const getTodayTr = () => {
    const day = new Date().getDay();
    if (day === 0 || day === 6) return DAYS_TR[0];
    return DAYS_TR[day - 1];
  };

  const [selectedDay, setSelectedDay] = useState<string>(getTodayTr());
  const [searchTerm, setSearchTerm] = useState('');
  const [weeklySchedule, setWeeklySchedule] = useState<TeacherSchedule[]>([]);

  useEffect(() => {
    const data = localStorage.getItem('weekly_schedule');
    if (data) setWeeklySchedule(JSON.parse(data));
  }, []);

  const filteredSchedule = useMemo(() => {
    return weeklySchedule
      .filter(t => t.teacherName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'tr'));
  }, [weeklySchedule, searchTerm]);

  return (
    <Layout title="NİS" subtitle={`${selectedDay.toUpperCase()} AKIŞI`} icon="calendar_view_day">
      {/* SABİT ÜST ALAN: GÜNLER VE ARAMA (Yapışkan) */}
      <div className="sticky top-0 z-40 bg-[#f8fafc] px-5 pt-4 pb-4 space-y-4 shadow-[0_10px_15px_-10px_rgba(0,0,0,0.05)]">
        {/* Day Selector Container */}
        <section className="bg-white/70 backdrop-blur-md rounded-[24px] p-1.5 flex gap-1 overflow-x-auto no-scrollbar shadow-sm border border-slate-200/50">
          {DAYS_TR.map(d => (
            <button 
              key={d} 
              onClick={() => setSelectedDay(d)} 
              className={`flex-1 px-3 py-2.5 rounded-[18px] text-[10px] font-black whitespace-nowrap transition-all uppercase tracking-tighter ${
                selectedDay === d ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400'
              }`}
            >
              {d}
            </button>
          ))}
        </section>

        {/* Search Bar Container */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Öğretmen ismiyle ara..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-white border-none rounded-[28px] py-4.5 pl-14 pr-6 text-xs text-slate-700 placeholder-slate-300 shadow-sm focus:ring-4 focus:ring-blue-50 outline-none transition-all" 
          />
          <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 text-xl">person_search</span>
        </div>
      </div>

      {/* KAYDIRILABİLİR LİSTE ALANI */}
      <div className="px-5 py-4 space-y-6 pb-32">
        {filteredSchedule.length > 0 ? filteredSchedule.map((t, idx) => (
          <div key={idx} className="bg-white rounded-[40px] p-7 shadow-sm border border-slate-100 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-[900] text-slate-900 tracking-tight uppercase">{t.teacherName}</h3>
              <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-blue-100/50">
                {selectedDay}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {LESSON_HOURS.map((hour, hIdx) => {
                const lesson = t.schedule[selectedDay]?.[hIdx];
                const isFree = !lesson || lesson === "" || lesson.toUpperCase() === "BOŞ";
                
                return (
                  <div key={hour.id} className={`flex flex-col items-center justify-center py-4 px-1 rounded-[24px] border transition-all duration-500 ${
                    isFree 
                    ? 'bg-emerald-50 border-emerald-100 shadow-sm' 
                    : 'bg-slate-50 border-slate-100'
                  }`}>
                    <span className={`text-[8px] font-black mb-1.5 uppercase tracking-tighter transition-colors ${
                      isFree ? 'text-emerald-500' : 'text-slate-400'
                    }`}>
                      {hIdx + 1}. SAAT
                    </span>
                    <span className={`text-[11px] font-black text-center truncate w-full uppercase transition-colors px-1 ${
                      isFree ? 'text-emerald-700' : 'text-slate-800'
                    }`}>
                      {isFree ? 'BOŞ' : lesson}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )) : (
          <div className="bg-white rounded-[48px] p-16 text-center border border-dashed border-slate-200 flex flex-col items-center gap-5">
            <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center">
               <span className="material-symbols-outlined text-slate-200 text-6xl">person_search</span>
            </div>
            <div className="space-y-2">
               <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Kayıt Bulunamadı</p>
               <p className="text-[11px] text-slate-400 italic font-medium">Lütfen sistem ayarlarından ders programı yükleyin.</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Schedule;
