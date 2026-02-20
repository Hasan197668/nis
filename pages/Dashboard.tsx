
import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { SubstitutionRecord } from '../types';

const Dashboard: React.FC = () => {
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

  return (
    <Layout title="İstatistikler" subtitle="Görev Dağılım Analizi" icon="analytics">
      <div className="px-5 py-6 space-y-6 pb-24">
        {/* Toggle Switch */}
        <div className="bg-white/50 p-1.5 rounded-2xl flex gap-1 border border-slate-200/50">
          <button 
            onClick={() => setPeriod('weekly')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              period === 'weekly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'
            }`}
          >
            Haftalık
          </button>
          <button 
            onClick={() => setPeriod('monthly')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              period === 'monthly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'
            }`}
          >
            Aylık
          </button>
        </div>

        {/* Hero Stat */}
        <section className="bg-indigo-900 rounded-[32px] p-6 text-white shadow-2xl shadow-indigo-100 flex flex-col justify-between h-40 relative overflow-hidden">
           <div className="absolute -right-4 -bottom-4 opacity-10">
              <span className="material-symbols-outlined text-[160px]">bar_chart</span>
           </div>
           <div className="relative z-10 flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Toplam İkame</span>
              <span className="material-symbols-outlined text-indigo-400">trending_up</span>
           </div>
           <div className="relative z-10 flex items-baseline gap-2">
              <span className="text-5xl font-black">{stats.total}</span>
              <span className="text-xs font-bold text-indigo-300 uppercase">Ders Saati</span>
           </div>
        </section>

        {/* Top 10 List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600 text-sm">workspace_premium</span>
              GÖREV SIRALAMASI
            </h2>
          </div>
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
            {stats.ranking.length > 0 ? stats.ranking.slice(0, 10).map((item, idx) => (
              <div key={item.name} className="p-4 flex items-center justify-between active:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${
                    idx === 0 ? 'bg-amber-100 text-amber-700' : 
                    idx === 1 ? 'bg-slate-100 text-slate-600' :
                    idx === 2 ? 'bg-orange-50 text-orange-700' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-[11px] uppercase truncate max-w-[150px]">{item.name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{idx === 0 ? 'LİDER' : 'EĞİTMEN'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-indigo-600 leading-none">{item.count}</p>
                  <p className="text-[9px] text-slate-400 font-black uppercase">GÖREV</p>
                </div>
              </div>
            )) : (
              <div className="p-12 text-center text-slate-400 text-xs italic flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-4xl opacity-20">history</span>
                Henüz kayıtlı bir görev verisi bulunmuyor.
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Dashboard;
