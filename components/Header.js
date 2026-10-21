'use client';

import useStore from '@/lib/store';
import NotificationPanel from './NotificationPanel';

export default function Header() {
  const currentUser = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);

  if (!currentUser) return null;

  return (
    <header className="glass border-b border-surface-200/10 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold gradient-text">Agenda de Entregas</h1>
              <p className="text-xs text-surface-200/30">Sistema de programación</p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            {/* Notificaciones */}
            <NotificationPanel />

            {/* Perfil */}
            <div className="flex items-center gap-3 ml-2 pl-3 border-l border-surface-200/10">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white leading-tight">{currentUser.name}</p>
                <p className="text-xs text-surface-200/40">{currentUser.email}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-primary-500/20">
                {currentUser.avatar}
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-xl hover:bg-danger-500/10 text-surface-200/40 hover:text-danger-400 transition-all duration-200"
                title="Cerrar sesión"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
