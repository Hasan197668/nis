
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '../components/Layout';
import { MOCK_TEACHERS, LESSON_HOURS, DAYS_TR } from '../constants';
import { TeacherSchedule, DutyAssignment, SubstitutionRecord } from '../types';
import * as htmlToImage from 'html-to-image';

interface SubstitutionPlan {
  [lessonId: string]: {
    [absentTeacherId: string]: string | null; 
  };
}

const EXCUSE_OPTIONS = [
  'Raporlu',
  'Sevkli',
  'İzinli',
  'Görevli İzinli',
  'Dış Görev'
];

const Substitute: React.FC = () => {
  const reportRef = useRef<HTMLDivElement>(null);
  
  const getTodayTr = () => {
    const day = new Date().getDay();
    if (day === 0 || day === 6) return DAYS_TR[0];
    return DAYS_TR[day - 1];
  };

  const getWeekNumber = (d: Date) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const getFormattedDateForDay = (dayName: string, offset: number) => {
    const today = new Date();
    const dayNames = DAYS_TR;
    const targetDayIdx = dayNames.indexOf(dayName); 
    
    const currentDay = today.getDay(); 
    const distanceToMonday = (currentDay === 0 ? 6 : currentDay - 1);
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday + (offset * 7));
    
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + targetDayIdx);
    
    return targetDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const [selectedDay, setSelectedDay] = useState<string>(getTodayTr());
  const [weekOffset, setWeekOffset] = useState(0); 
  const [searchTerm, setSearchTerm] = useState('');
  const [subSearchTerm, setSubSearchTerm] = useState(''); 
  const [absentTeacherIds, setAbsentTeacherIds] = useState<string[]>([]);
  const [absentReasons, setAbsentReasons] = useState<{[id: string]: string}>({});
  const [manualOnDutyIds, setManualOnDutyIds] = useState<string[]>([]);
  const [manualNotOnDutyIds, setManualNotOnDutyIds] = useState<string[]>([]);
  const [editingExcuseId, setEditingExcuseId] = useState<string | null>(null);
  const [editingSubAssignment, setEditingSubAssignment] = useState<{lessonId: string, absentId: string} | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<TeacherSchedule[]>([]);
  const [dutySchedule, setDutySchedule] = useState<DutyAssignment[]>([]);
  const [plan, setPlan] = useState<SubstitutionPlan>({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMode, setShareMode] = useState<'text' | 'graphic'>('graphic');
  const [isDownloading, setIsDownloading] = useState(false);
  const [historicalStats, setHistoricalStats] = useState<{[name: string]: number}>({});

  const schoolName = localStorage.getItem('school_name') || 'AKSARAY ŞEHİT ÖNDER GÜZEL KIZ ANADOLU İMAM HATİP LİSESİ';

  useEffect(() => {
    const scheduleData = localStorage.getItem('weekly_schedule');
    const dutyData = localStorage.getItem('duty_schedule');
    const historyData = localStorage.getItem('substitution_history');
    if (scheduleData) setWeeklySchedule(JSON.parse(scheduleData));
    if (dutyData) setDutySchedule(JSON.parse(dutyData));
    if (historyData) {
      try {
        const history: SubstitutionRecord[] = JSON.parse(historyData);
        const counts: {[name: string]: number} = {};
        history.forEach(rec => counts[rec.substituteTeacherName] = (counts[rec.substituteTeacherName] || 0) + 1);
        setHistoricalStats(counts);
      } catch (e: unknown) {
        console.error("Error parsing history data", e);
      }
    }
  }, []);

  const currentDisplayedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + (weekOffset * 7));
    return d;
  }, [weekOffset]);

  const currentWeekNumber = useMemo(() => getWeekNumber(currentDisplayedDate), [currentDisplayedDate]);
  const isThisWeek = weekOffset === 0;

  const teachersWithMetadata = useMemo(() => {
    const allNames = new Set<string>();
    weeklySchedule.forEach(s => allNames.add(s.teacherName.toUpperCase()));
    dutySchedule.forEach(d => allNames.add(d.teacherName.toUpperCase()));
    if (allNames.size === 0) MOCK_TEACHERS.forEach(t => allNames.add(t.name.toUpperCase()));

    const dayDutyAssignments = dutySchedule.filter(d => 
      d.day.toLocaleLowerCase('tr-TR') === selectedDay.toLocaleLowerCase('tr-TR')
    );
    const uniqueLocations = Array.from(new Set(dayDutyAssignments.map(d => d.location))).sort();

    return Array.from(allNames).map(name => {
      const mockInfo = MOCK_TEACHERS.find(t => t.name.toUpperCase() === name);
      const scheduleRecord = weeklySchedule.find(s => s.teacherName.toUpperCase() === name);
      const originalDuty = dayDutyAssignments.find(d => d.teacherName.toUpperCase() === name);
      
      let isActuallyOnDuty = !!originalDuty;
      if (manualOnDutyIds.includes(name)) isActuallyOnDuty = true;
      if (manualNotOnDutyIds.includes(name)) isActuallyOnDuty = false;

      let rotatedLocation = isActuallyOnDuty ? (originalDuty?.location || 'EK NÖBETÇİ') : undefined;
      
      if (originalDuty && isActuallyOnDuty && uniqueLocations.length > 0) {
        const originalLocIdx = uniqueLocations.indexOf(originalDuty.location);
        const rotatedIdx = (originalLocIdx + currentWeekNumber) % uniqueLocations.length;
        rotatedLocation = uniqueLocations[rotatedIdx];
      }

      return {
        id: name,
        name: name,
        initials: name.split(' ').map(n => n[0]).join('').slice(0, 2),
        isOnDuty: isActuallyOnDuty,
        dutyLocation: rotatedLocation,
        dailySchedule: scheduleRecord?.schedule[selectedDay] || Array(8).fill(""),
        substituteCount: (mockInfo?.substituteCount || 0) + (historicalStats[name] || 0)
      };
    }).sort((a, b) => {
      if (a.isOnDuty && !b.isOnDuty) return -1;
      if (!a.isOnDuty && b.isOnDuty) return 1;
      return a.name.localeCompare(b.name, 'tr');
    });
  }, [selectedDay, weeklySchedule, dutySchedule, historicalStats, currentWeekNumber, manualOnDutyIds, manualNotOnDutyIds]);

  const onDutyTeachers = useMemo(() => teachersWithMetadata.filter(t => t.isOnDuty), [teachersWithMetadata]);
  
  const filteredTeachers = useMemo(() => {
    if (!searchTerm) return teachersWithMetadata;
    return teachersWithMetadata.filter(t => t.name.includes(searchTerm.toUpperCase()));
  }, [teachersWithMetadata, searchTerm]);

  const toggleAbsent = (id: string) => {
    if (absentTeacherIds.includes(id)) {
      setAbsentTeacherIds(prev => prev.filter(tid => tid !== id));
      const newReasons = { ...absentReasons };
      delete newReasons[id];
      setAbsentReasons(newReasons);
    } else {
      setAbsentTeacherIds(prev => [...prev, id]);
      setEditingExcuseId(id); 
    }
  };

  const toggleOnDutyStatus = (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    if (currentStatus) {
      setManualOnDutyIds(prev => prev.filter(mid => mid !== id));
      setManualNotOnDutyIds(prev => Array.from(new Set([...prev, id])));
    } else {
      setManualNotOnDutyIds(prev => prev.filter(mid => mid !== id));
      setManualOnDutyIds(prev => Array.from(new Set([...prev, id])));
    }
  };

  const handleReasonSelect = (id: string, reason: string) => {
    setAbsentReasons(prev => ({ ...prev, [id]: reason }));
    setEditingExcuseId(null);
  };

  const executePlanning = () => {
    const newPlan: SubstitutionPlan = {};
    const totalLoadCounter: { [teacherId: string]: number } = {};
    onDutyTeachers.forEach(t => totalLoadCounter[t.id] = 0);

    LESSON_HOURS.forEach(lesson => {
      newPlan[lesson.id] = {};
      const assignmentsThisHour: { [teacherId: string]: number } = {};
      const absentDuringThisHour = absentTeacherIds.filter(tid => {
        const t = teachersWithMetadata.find(tm => tm.id === tid);
        return t && (t.dailySchedule[lesson.index] || "") !== "";
      });

      absentDuringThisHour.forEach(absentId => {
        let available = onDutyTeachers
          .filter(t => t.id !== absentId && t.dailySchedule[lesson.index] === "" && (assignmentsThisHour[t.id] || 0) === 0)
          .sort((a, b) => (a.substituteCount + totalLoadCounter[a.id]) - (b.substituteCount + totalLoadCounter[b.id]));

        if (available.length > 0) {
          const selectedSub = available[0];
          newPlan[lesson.id][absentId] = selectedSub.id;
          totalLoadCounter[selectedSub.id]++;
          assignmentsThisHour[selectedSub.id] = (assignmentsThisHour[selectedSub.id] || 0) + 1;
          return;
        }
        newPlan[lesson.id][absentId] = null;
      });
    });

    setPlan(newPlan);
  };

  const handleManualSubChange = (lessonId: string, absentId: string, newSubId: string | null) => {
    setPlan(prev => ({
      ...prev,
      [lessonId]: {
        ...prev[lessonId],
        [absentId]: newSubId
      }
    }));
    setEditingSubAssignment(null);
    setSubSearchTerm('');
  };

  const saveAndShare = () => {
    const records: SubstitutionRecord[] = [];
    const date = currentDisplayedDate.toISOString().split('T')[0];
    const timestamp = Date.now();
    Object.entries(plan).forEach(([lessonId, assignments]) => {
      const lesson = LESSON_HOURS.find(l => l.id === lessonId);
      Object.entries(assignments).forEach(([absentId, subId]) => {
        if (typeof subId === 'string' && subId !== '') {
          records.push({ 
            id: `${timestamp}-${lessonId}-${absentId}`, 
            date, 
            day: selectedDay, 
            lessonLabel: lesson?.label || 'Ders', 
            absentTeacherName: absentId, 
            substituteTeacherName: subId, 
            timestamp 
          });
        }
      });
    });
    const existing: SubstitutionRecord[] = JSON.parse(localStorage.getItem('substitution_history') || '[]');
    localStorage.setItem('substitution_history', JSON.stringify([...existing, ...records]));
    setShowShareModal(true);
  };

  const downloadImage = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await htmlToImage.toPng(reportRef.current, { 
        quality: 1.0, 
        pixelRatio: 3, 
        backgroundColor: '#ffffff',
        width: 1200,
        height: reportRef.current.scrollHeight
      });
      const link = document.createElement('a');
      link.download = `NIS_Rapor_${selectedDay}_${getFormattedDateForDay(selectedDay, weekOffset).replace(/\./g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: unknown) { 
      const msg = err instanceof Error ? err.message : 'Hata oluştu.';
      alert(msg); 
    }
    finally { setIsDownloading(false); }
  };

  const formatTeacherShortName = (name: string) => {
    const p = name.trim().split(' ');
    if (p.length < 2) return name;
    const initial = p[0].charAt(0).toUpperCase();
    const lastName = p[p.length - 1].toUpperCase();
    return `${initial}. ${lastName}`;
  };

  const formatTeacherFullName = (name: string) => {
    return name.toUpperCase();
  };

  const getShareText = (): string => {
    const prefix = localStorage.getItem('msg_prefix') || '[NİS]';
    let msg = `📢 *${prefix}* - *${selectedDay.toUpperCase()}* (${getFormattedDateForDay(selectedDay, weekOffset)})\n\n`;
    Object.entries(plan).forEach(([lessonId, assignments]) => {
      const lesson = LESSON_HOURS.find(l => l.id === lessonId);
      const hourLines = Object.entries(assignments).map(([absId, subId]) => {
        const reason = absentReasons[absId];
        const reasonText = reason ? ` - ${reason}` : '';
        const teacherMeta = teachersWithMetadata.find(tm => tm.id === absId);
        const lessonName = teacherMeta?.dailySchedule[lesson?.index || 0] || 'Ders';
        
        return `🔸 *${lessonName}* (${absId}${reasonText}) ➔ ${subId || 'BOŞ'}`;
      });
      if (hourLines.length > 0) msg += `⏰ *${lesson?.label}*\n${hourLines.join('\n')}\n`; 
    });
    return msg;
  };

  const ScheduleBar = ({ schedule }: { schedule: string[] }) => (
    <div className="flex gap-[2px] w-full h-[4px] mt-2 rounded-full overflow-hidden bg-slate-100/50">
      {schedule.map((lesson, idx) => {
        const isFree = !lesson || lesson === "" || lesson.toUpperCase() === "BOŞ";
        return (
          <div 
            key={idx} 
            className={`flex-1 transition-all duration-500 ${isFree ? 'bg-emerald-400' : 'bg-slate-200'}`}
          />
        );
      })}
    </div>
  );

  return (
    <Layout title="İkame İşlemleri" subtitle={`${selectedDay.toUpperCase()} PLANI`} icon="fact_check">
      <div className="px-5 py-6 space-y-8 pb-32">
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GÜNLÜK NÖBETÇİLER VE ROTASYON</h2>
            
            <div className="flex items-center gap-2 bg-white rounded-full px-2 py-1 shadow-sm border border-slate-100">
               <button 
                 onClick={() => setWeekOffset(prev => prev - 1)}
                 className="w-8 h-8 rounded-full hover:bg-slate-50 active:scale-90 transition-all flex items-center justify-center text-slate-400"
               >
                 <span className="material-symbols-outlined text-lg">chevron_left</span>
               </button>
               <div className="flex flex-col items-center min-w-[60px]">
                  <span className="text-[9px] font-black text-blue-600 leading-none">{currentWeekNumber}. HAFTA</span>
                  {isThisWeek && <span className="text-[7px] font-bold text-slate-300 uppercase mt-0.5">BU HAFTA</span>}
               </div>
               <button 
                 onClick={() => setWeekOffset(prev => prev + 1)}
                 className="w-8 h-8 rounded-full hover:bg-slate-50 active:scale-90 transition-all flex items-center justify-center text-slate-400"
               >
                 <span className="material-symbols-outlined text-lg">chevron_right</span>
               </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {onDutyTeachers.map(t => (
                <div key={t.id} className="bg-white rounded-[32px] p-5 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[110px] animate-in fade-in zoom-in-95 duration-500">
                    <div>
                      <p className="text-[12px] font-extrabold text-slate-800 uppercase mb-1 leading-tight tracking-tight">{t.name}</p>
                      <ScheduleBar schedule={t.dailySchedule} />
                    </div>
                    <div className="mt-4">
                      <span className="text-[8px] text-blue-600 font-black bg-blue-50/80 px-3 py-1.5 rounded-xl uppercase tracking-tight border border-blue-100/50">
                        {t.dutyLocation}
                      </span>
                    </div>
                </div>
            ))}
            {onDutyTeachers.length === 0 && (
              <div className="col-span-2 py-12 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
                <span className="material-symbols-outlined text-slate-200 text-4xl mb-2">event_busy</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">NÖBETÇİ ATANMAMIŞ</p>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white/50 backdrop-blur-xl rounded-[24px] p-1.5 flex gap-1 overflow-x-auto no-scrollbar border border-slate-200/50">
          {DAYS_TR.map(d => (
            <button key={d} onClick={() => { setSelectedDay(d); setPlan({}); setAbsentTeacherIds([]); setAbsentReasons({}); setManualOnDutyIds([]); setManualNotOnDutyIds([]); }} className={`flex-1 px-4 py-3 rounded-[18px] text-[10px] font-black transition-all uppercase whitespace-nowrap ${selectedDay === d ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-400'}`}>{d}</button>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GELMEYEN ÖĞRETMEN SEÇİMİ</h2>
            <div className="flex items-center gap-1">
               <span className="material-symbols-outlined text-[10px] text-blue-500">shield_person</span>
               <span className="text-[8px] font-bold text-blue-500 uppercase italic">Simgeye dokunarak Nöbetçi yap</span>
            </div>
          </div>
          <div className="relative group">
            <input type="text" placeholder="Öğretmen ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border-none rounded-[28px] py-5 pl-14 pr-6 text-sm shadow-sm focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-300" />
            <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">person_search</span>
          </div>
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl max-h-[400px] overflow-y-auto no-scrollbar divide-y divide-slate-50">
             {filteredTeachers.map(t => (
               <div 
                 key={t.id} 
                 onClick={() => toggleAbsent(t.id)} 
                 className={`p-5 flex flex-col cursor-pointer transition-all duration-500 ${absentTeacherIds.includes(t.id) ? 'bg-rose-50/40' : 'active:bg-slate-50'}`}
               >
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <button 
                      onClick={(e) => toggleOnDutyStatus(e, t.id, t.isOnDuty)}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-[11px] transition-all shadow-sm relative ${t.isOnDuty ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-slate-100 text-slate-400'}`}
                     >
                        {t.initials}
                        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${t.isOnDuty ? 'bg-emerald-400 scale-100' : 'bg-slate-300 scale-0'} transition-all`}>
                          <span className="material-symbols-outlined text-[10px] text-white font-black">done</span>
                        </div>
                     </button>
                     <div>
                       <div className="flex items-center gap-2">
                         <p className={`text-[13px] font-black uppercase transition-colors tracking-tight ${absentTeacherIds.includes(t.id) ? 'text-rose-700' : 'text-slate-800'}`}>{t.name}</p>
                         {absentTeacherIds.includes(t.id) && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); setEditingExcuseId(editingExcuseId === t.id ? null : t.id); }}
                             className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center active:scale-90 transition-all"
                           >
                             <span className="material-symbols-outlined text-[14px] text-slate-400">more_horiz</span>
                           </button>
                         )}
                       </div>
                       <div className="w-32">
                        <ScheduleBar schedule={t.dailySchedule} />
                       </div>
                     </div>
                   </div>
                   {absentTeacherIds.includes(t.id) && !editingExcuseId && (
                     <span className="material-symbols-outlined text-rose-600 text-2xl animate-in zoom-in fill-[1]">check_circle</span>
                   )}
                 </div>
                 
                 {editingExcuseId === t.id && (
                   <div className="mt-5 grid grid-cols-2 gap-3 animate-in slide-in-from-top-4 duration-500 p-4 bg-blue-50/50 rounded-[28px] border border-blue-100" onClick={(e) => e.stopPropagation()}>
                     <p className="col-span-2 text-[9px] font-black text-blue-800 text-center uppercase tracking-widest mb-1">MAZERET SEÇİN</p>
                     {EXCUSE_OPTIONS.map(opt => (
                       <button 
                         key={opt}
                         onClick={() => handleReasonSelect(t.id, opt)}
                         className={`py-3 px-4 rounded-2xl text-[10px] font-black uppercase shadow-sm active:scale-90 transition-all text-center leading-tight ${absentReasons[t.id] === opt ? 'bg-blue-600 text-white' : 'bg-white border border-blue-100 text-blue-900'}`}
                       >
                         {opt}
                       </button>
                     ))}
                     <button onClick={() => setEditingExcuseId(null)} className="col-span-2 bg-slate-200/80 py-3 rounded-2xl text-[10px] font-black uppercase text-slate-600 mt-1 active:scale-95 transition-all">KAPAT</button>
                   </div>
                 )}

                 {absentTeacherIds.includes(t.id) && absentReasons[t.id] && !editingExcuseId && (
                   <div className="mt-3 ml-[60px]">
                     <span className="text-[9px] font-black text-rose-500 bg-rose-100/50 px-3 py-1.5 rounded-full uppercase tracking-tight border border-rose-200/30">
                       DURUM: {absentReasons[t.id]}
                     </span>
                   </div>
                 )}
               </div>
             ))}
          </div>
        </section>

        <button onClick={executePlanning} disabled={absentTeacherIds.length === 0} className={`w-full py-5 rounded-[28px] font-black text-sm tracking-widest shadow-2xl transition-all active:scale-95 ${absentTeacherIds.length === 0 ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-200'}`}>İKAME PLANI OLUŞTUR</button>

        {Object.keys(plan).length > 0 && (
          <section className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <div className="flex items-center justify-between px-1">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GÜNLÜK ATAMALAR</h2>
                <div className="flex items-center gap-1">
                   <span className="material-symbols-outlined text-[10px] text-emerald-500">edit</span>
                   <span className="text-[8px] font-bold text-emerald-500 uppercase italic">Düzenlemek için karta dokunun</span>
                </div>
             </div>
             <div className="space-y-4">
              {LESSON_HOURS.map(lesson => {
                const hourAssignments = plan[lesson.id] || {};
                const items = Object.entries(hourAssignments);
                if (items.length === 0) return null;
                return (
                  <div key={lesson.id} className="space-y-3">
                    <div className="flex items-center gap-3 px-1"><span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">{lesson.label}</span><span className="flex-1 h-px bg-slate-100"></span></div>
                    {items.map(([absId, subId]) => {
                      const teacherMeta = teachersWithMetadata.find(tm => tm.id === absId);
                      const lessonName = teacherMeta?.dailySchedule[lesson.index] || 'Ders';
                      return (
                        <div key={absId} className="relative">
                          <div 
                            onClick={() => setEditingSubAssignment({ lessonId: lesson.id, absentId: absId })}
                            className={`p-5 rounded-[32px] border shadow-md flex flex-col gap-2 transition-all cursor-pointer active:scale-[0.98] ${subId ? 'bg-white border-slate-100' : 'bg-amber-100 border-amber-300 ring-2 ring-amber-400/20'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">{lessonName}</span>
                                <span className="text-[12px] font-extrabold text-slate-800 uppercase tracking-tight">{absId}</span>
                                {absentReasons[absId] && (
                                  <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter opacity-80 mt-1">{absentReasons[absId]}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`material-symbols-outlined text-2xl animate-float ${subId ? 'text-blue-200' : 'text-amber-500'}`}>{subId ? 'arrow_forward' : 'warning'}</span>
                                <div className="text-right">
                                  <span className={`text-[12px] block font-black uppercase tracking-tight ${subId ? 'text-blue-600' : 'text-amber-700 underline decoration-wavy underline-offset-4'}`}>
                                    {subId || 'BOŞ KALDI'}
                                  </span>
                                  {subId && (
                                    <span className="text-[8px] font-bold text-slate-300 uppercase">İKAME GÖREVLİSİ</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Manuel İkame Değiştirme Menüsü */}
                          {editingSubAssignment?.lessonId === lesson.id && editingSubAssignment?.absId === absId && (
                             <div className="mt-4 p-6 bg-slate-50 rounded-[32px] border border-slate-200 animate-in slide-in-from-top-4 duration-500 space-y-4 shadow-inner">
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">İLKAME ÖĞRETMEN SEÇİMİ</p>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{lesson.label}</span>
                                  </div>
                                  <div className="relative">
                                    <input 
                                      type="text" 
                                      placeholder="Öğretmen ara..." 
                                      value={subSearchTerm}
                                      onChange={(e) => setSubSearchTerm(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-[10px] font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                                    />
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg">search</span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto no-scrollbar py-2">
                                   {teachersWithMetadata
                                     .filter(t => t.id !== absId && (t.name.includes(subSearchTerm.toUpperCase())))
                                     .map(t => {
                                        const isAlreadyAssignedInThisHour = Object.values(plan[lesson.id] || {}).includes(t.id);
                                        const hasOwnLesson = t.dailySchedule[lesson.index] !== "" && t.dailySchedule[lesson.index] !== "BOŞ";
                                        const isConflict = isAlreadyAssignedInThisHour || hasOwnLesson;

                                        return (
                                          <button 
                                            key={t.id}
                                            onClick={() => handleManualSubChange(lesson.id, absId, t.id)}
                                            className={`w-full border py-4 px-5 rounded-2xl text-[11px] font-black uppercase shadow-sm active:scale-95 transition-all text-left flex justify-between items-center ${
                                              isConflict 
                                              ? 'bg-slate-100 border-slate-200 text-slate-300' 
                                              : t.isOnDuty 
                                                ? 'bg-blue-50 border-blue-200 text-blue-900 ring-1 ring-blue-100/50' 
                                                : 'bg-white border-slate-100 text-slate-700'
                                            }`}
                                          >
                                            <div className="flex flex-col">
                                              <span>{t.name}</span>
                                              <span className="text-[8px] opacity-60 font-bold">YÜK: {t.substituteCount} SAAT</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {hasOwnLesson && <span className="material-symbols-outlined text-[14px] text-amber-500">school</span>}
                                              <span className={`text-[8px] font-bold px-2 py-1 rounded-lg ${
                                                isConflict 
                                                ? 'bg-slate-200 text-slate-400' 
                                                : t.isOnDuty ? 'bg-blue-600 text-white' : 'bg-emerald-50 text-emerald-600'
                                              }`}>
                                                 {isAlreadyAssignedInThisHour ? 'BAŞKA İKAMEDE' : hasOwnLesson ? 'KENDİ DERSİ VAR' : t.isOnDuty ? 'NÖBETÇİ' : 'MÜSAİT'}
                                              </span>
                                            </div>
                                          </button>
                                        );
                                     })
                                   }
                                   <button 
                                     onClick={() => handleManualSubChange(lesson.id, absId, null)}
                                     className="w-full bg-rose-50 border border-rose-100 py-4 px-5 rounded-2xl text-[11px] font-black uppercase text-rose-700 shadow-sm active:scale-95 transition-all text-center mt-2"
                                   >
                                     BOŞ BIRAK (GÖREVDEN AL)
                                   </button>
                                   <button 
                                     onClick={() => { setEditingSubAssignment(null); setSubSearchTerm(''); }}
                                     className="w-full bg-slate-200 py-4 px-5 rounded-2xl text-[11px] font-black uppercase text-slate-600 active:scale-95 transition-all"
                                   >
                                     VAZGEÇ / KAPAT
                                   </button>
                                </div>
                             </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
             </div>
             <button onClick={saveAndShare} className="w-full bg-emerald-500 text-white py-5 rounded-[28px] font-black text-sm shadow-xl uppercase tracking-widest active:scale-95 transition-all mt-6 shadow-emerald-100">KAYDET VE PAYLAŞ</button>
          </section>
        )}
      </div>

      {showShareModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-[1000px] rounded-[48px] overflow-hidden flex flex-col max-h-[92vh] shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                 <div className="flex bg-white/80 rounded-2xl p-1.5 border border-slate-200">
                    <button onClick={() => setShareMode('graphic')} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${shareMode === 'graphic' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>TABLO GÖRÜNÜMÜ</button>
                    <button onClick={() => setShareMode('text')} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${shareMode === 'text' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>METİN GÖRÜNÜMÜ</button>
                 </div>
                 <button onClick={() => setShowShareModal(false)} className="w-11 h-11 rounded-full bg-white border border-slate-100 flex items-center justify-center active:scale-90 transition-all shadow-sm">
                    <span className="material-symbols-outlined text-slate-400">close</span>
                 </button>
              </div>
              
              <div className="flex-1 overflow-auto p-8 bg-[#f8fafc] flex flex-col items-center no-scrollbar">
                 {shareMode === 'graphic' ? (
                    <div className="w-full flex flex-col items-center gap-8">
                      <div className="w-full flex justify-center overflow-x-auto py-6">
                        <div ref={reportRef} className="bg-white p-14 shadow-2xl border border-slate-100 rounded-lg overflow-hidden" style={{ width: '1200px', minWidth: '1200px' }}>
                            <div className="text-center mb-12">
                              <h1 className="text-3xl font-black uppercase tracking-[0.25em] text-[#0f172a] mb-3">{schoolName}</h1>
                              <div className="inline-block relative">
                                <h2 className="text-lg font-extrabold text-slate-600 uppercase tracking-[0.2em] border-b-4 border-blue-600 pb-2 px-10">
                                  {selectedDay.toUpperCase()} GÜNLÜK İKAME ÇİZELGESİ
                                </h2>
                                <p className="text-[14px] font-black text-blue-500 mt-4 tracking-widest uppercase">TARİH: {getFormattedDateForDay(selectedDay, weekOffset)}</p>
                              </div>
                            </div>

                            <div className="mb-16">
                              <div className="bg-[#1e293b] text-white px-6 py-3 inline-block mb-0 text-[13px] font-black uppercase tracking-tight rounded-tr-2xl">1. NÖBETÇİ ÖĞRETMEN GÖREV DAĞILIMI</div>
                              <table className="w-full border-collapse border-[2.5px] border-slate-900 text-[12px]" style={{ tableLayout: 'fixed' }}>
                                <thead>
                                  <tr className="bg-slate-50">
                                    <th className="border-[2px] border-slate-900 p-4 text-left w-[30%] font-black uppercase tracking-tighter whitespace-nowrap text-[15px]">NÖBETÇİ İSİM / MEVKİ</th>
                                    {LESSON_HOURS.map(h => (
                                      <th key={h.id} className="border-[2px] border-slate-900 p-4 text-center font-black uppercase tracking-tighter whitespace-nowrap text-[15px]">{h.label}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {onDutyTeachers.map(t => (
                                    <tr key={t.id} className="h-24">
                                      <td className="border-[2px] border-slate-900 p-4 font-black uppercase bg-white whitespace-nowrap overflow-hidden text-ellipsis">
                                        <div className="text-slate-900 text-[18px] tracking-tighter leading-none">{formatTeacherFullName(t.name)}</div>
                                        <div className="text-[13px] text-blue-600 font-extrabold mt-1.5 tracking-tight">({t.dutyLocation})</div>
                                      </td>
                                      {LESSON_HOURS.map(h => {
                                        const assignmentsAtHour = plan[h.id] || {};
                                        const substitutedTeacherId = Object.keys(assignmentsAtHour).find(absId => assignmentsAtHour[absId] === t.id);
                                        const absTeacher = teachersWithMetadata.find(tm => tm.id === substitutedTeacherId);
                                        const subLessonName = absTeacher?.dailySchedule[h.index] || '';
                                        const ownLessonName = t.dailySchedule[h.index] && t.dailySchedule[h.index] !== "BOŞ" ? t.dailySchedule[h.index] : null;

                                        return (
                                          <td key={h.id} className={`border-[2px] border-slate-900 p-2 text-center font-extrabold leading-tight ${substitutedTeacherId ? 'bg-white text-blue-900' : (ownLessonName ? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-300')}`}>
                                            {substitutedTeacherId ? (
                                              <div className="flex flex-col gap-1">
                                                <div className="uppercase tracking-tighter whitespace-nowrap text-[14px] font-black text-blue-900 leading-none">{formatTeacherShortName(substitutedTeacherId)}</div>
                                                <div className="text-[11px] opacity-70 font-black text-blue-800 whitespace-nowrap">({subLessonName})</div>
                                              </div>
                                            ) : (
                                              ownLessonName ? (
                                                <div className="text-[13px] font-black text-slate-500 uppercase tracking-tighter whitespace-nowrap leading-none">{ownLessonName}</div>
                                              ) : (
                                                <span className="text-[12px] opacity-30 font-black">-</span>
                                              )
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="mb-10">
                              <div className="bg-[#e11d48] text-white px-6 py-3 inline-block mb-0 text-[13px] font-black uppercase tracking-tight rounded-tr-2xl">2. GELMEYEN ÖĞRETMENLER VE İKAMELERİ</div>
                              <table className="w-full border-collapse border-[2.5px] border-slate-900 text-[12px]" style={{ tableLayout: 'fixed' }}>
                                <thead>
                                  <tr className="bg-slate-50">
                                    <th className="border-[2px] border-slate-900 p-4 text-left w-[30%] font-black uppercase tracking-tighter whitespace-nowrap text-[15px]">GELMEYEN İSİM / MAZERET</th>
                                    {LESSON_HOURS.map(h => (
                                      <th key={h.id} className="border-[2px] border-slate-900 p-4 text-center font-black uppercase tracking-tighter whitespace-nowrap text-[15px]">{h.label}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {absentTeacherIds.map(absId => {
                                    const teacherMeta = teachersWithMetadata.find(tm => tm.id === absId);
                                    return (
                                      <tr key={absId} className="h-24">
                                        <td className="border-[2px] border-slate-900 p-4 font-black uppercase text-rose-900 bg-white whitespace-nowrap overflow-hidden text-ellipsis">
                                           <div className="text-[18px] tracking-tighter leading-none">{formatTeacherFullName(absId)}</div>
                                           <div className="text-[13px] text-rose-500 font-extrabold mt-1.5 tracking-tight italic leading-none">({absentReasons[absId] || 'MAZERETLİ'})</div>
                                        </td>
                                        {LESSON_HOURS.map(h => {
                                          const subId = plan[h.id]?.[absId];
                                          const lessonName = teacherMeta?.dailySchedule[h.index] || '';
                                          const isAssigned = !!subId;

                                          return (
                                            <td key={h.id} className={`border-[2px] border-slate-900 p-2 text-center font-extrabold whitespace-nowrap ${isAssigned ? 'text-slate-900 bg-white' : (lessonName ? 'text-amber-800 bg-amber-50' : 'bg-slate-50 text-slate-300')}`}>
                                              {isAssigned ? (
                                                <div className="flex flex-col gap-1">
                                                  <div className="uppercase tracking-tighter text-[14px] leading-none">{lessonName}</div>
                                                  <div className="text-[11px] font-black text-blue-600">İKM: {formatTeacherShortName(subId)}</div>
                                                </div>
                                              ) : (
                                                lessonName ? (
                                                   <div className="flex flex-col gap-1">
                                                      <div className="uppercase tracking-tighter text-[13px] leading-none">{lessonName}</div>
                                                      <div className="text-[11px] font-black text-rose-600">BOŞ</div>
                                                   </div>
                                                ) : <span className="text-[12px] opacity-30 font-black">-</span>
                                              )}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            <div className="mt-20 flex justify-between items-end border-t-2 border-slate-100 pt-10">
                              <div className="flex flex-col gap-2">
                                <p className="text-[11px] font-black text-slate-400 uppercase italic tracking-[0.2em]">NİS ANTIGRAVITY v2.5 - MOBILE READY REPORT</p>
                                <p className="text-[10px] font-bold text-slate-300 uppercase">OLUŞTURULMA: {new Date().toLocaleString('tr-TR')}</p>
                              </div>
                              <div className="flex flex-col items-center text-center">
                                <p className="text-[14px] font-black uppercase border-b-4 border-slate-900 w-full pb-2 mb-3 tracking-widest">TASDİK OLUNUR</p>
                                <div className="mt-2">
                                  <p className="text-[16px] font-black uppercase text-slate-900 tracking-tighter whitespace-nowrap">{localStorage.getItem('principal_name') || 'MÜDÜR'}</p>
                                  <p className="text-[12px] font-bold uppercase text-slate-900 opacity-60">OKUL MÜDÜRÜ</p>
                                </div>
                              </div>
                            </div>
                        </div>
                      </div>
                      
                      <button onClick={downloadImage} disabled={isDownloading} className="w-full max-w-sm bg-slate-900 text-white py-6 rounded-[32px] font-black text-sm uppercase shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all shadow-slate-200">
                        <span className="material-symbols-outlined text-2xl">{isDownloading ? 'sync' : 'download'}</span>
                        {isDownloading ? 'HAZIRLANIYOR...' : 'ÇİZELGEYİ KAYDET'}
                      </button>
                    </div>
                 ) : (
                    <div className="w-full max-w-2xl space-y-6 animate-in slide-in-from-bottom-12 duration-700">
                      <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm relative">
                        <div className="absolute top-6 right-8 opacity-10">
                           <span className="material-symbols-outlined text-6xl">chat</span>
                        </div>
                        <pre className="text-[11px] font-mono whitespace-pre-wrap text-slate-600 leading-relaxed max-h-[450px] overflow-y-auto no-scrollbar">{getShareText()}</pre>
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(getShareText()); alert('Metin panoya kopyalandı!'); }} className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black text-sm uppercase shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-blue-100">
                        <span className="material-symbols-outlined text-2xl">content_copy</span>
                        METNİ KOPYALA
                      </button>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default Substitute;
