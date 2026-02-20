
import React from 'react';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  icon?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title, subtitle, showBack, icon }) => {
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: 'Akış', icon: 'grid_view' },
    { path: '/substitute', label: 'İkame', icon: 'auto_awesome' },
    { path: '/settings', label: 'Sistem', icon: 'tune' },
  ];

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-[#f8fafc] shadow-[0_0_100px_rgba(0,0,0,0.1)] relative overflow-hidden">
      {/* Dynamic Header */}
      <header className="glass sticky top-0 z-[100] border-b border-slate-100/50 pt-safe">
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBack && (
              <button 
                onClick={() => navigate(-1)} 
                className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-blue-600 active:scale-90 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-xl">arrow_back_ios_new</span>
              </button>
            )}
            <div className="space-y-0.5">
              <h1 className="text-2xl font-[900] tracking-tighter text-slate-900 leading-none">NİS</h1>
              {subtitle && <p className="text-[9px] text-blue-600 font-extrabold uppercase tracking-[0.2em] mt-1">{subtitle}</p>}
            </div>
          </div>
          <div className="w-12 h-12 rounded-[20px] bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-100/50 animate-float">
            <span className="material-symbols-outlined text-2xl">{icon || 'school'}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-32 animate-in fade-in duration-1000">
        {children}
      </main>

      {/* Flutter-Style Bottom Nav */}
      <nav className="glass border-t border-slate-100 fixed bottom-0 left-0 right-0 max-w-md mx-auto z-[150] px-4 pb-safe-offset-4 pt-3">
        <div className="flex justify-around items-center px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex flex-col items-center gap-1.5 transition-all duration-500 px-4 py-2 rounded-2xl relative ${
                  isActive ? 'text-blue-600' : 'text-slate-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`material-symbols-outlined text-[28px] transition-all duration-500 ${isActive ? 'scale-110 fill-[1] translate-y-[-2px]' : ''}`}>
                    {item.icon}
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute -top-1 w-1 h-1 rounded-full bg-blue-600 animate-pulse"></div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
      
      {/* Background Decor */}
      <div className="fixed -bottom-24 -left-24 w-64 h-64 bg-blue-50/50 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="fixed -top-24 -right-24 w-64 h-64 bg-indigo-50/50 rounded-full blur-[100px] pointer-events-none -z-10"></div>
    </div>
  );
};

export default Layout;
