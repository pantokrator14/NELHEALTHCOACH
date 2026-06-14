'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Obtener conteo de no leídas
  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await apiClient.getUnreadNotificationCount();
      if (result.success) {
        setUnreadCount(result.count);
      }
    } catch {
      // Silencioso — el dashboard funciona sin notificaciones
    }
  }, []);

  // Obtener lista de notificaciones
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiClient.getNotifications(1, 10);
      if (result.success) {
        setNotifications(result.data);
      }
    } catch {
      // Silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar conteo al montar
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Abrir/cerrar dropdown
  const toggleDropdown = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      await fetchNotifications();
    }
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Marcar una notificación como leída y navegar
  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) {
      try {
        await apiClient.markNotificationAsRead(notif._id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );
      } catch {
        // Silencioso
      }
    }

    setIsOpen(false);

    if (notif.link) {
      router.push(notif.link);
    }
  };

  // Marcar todas como leídas
  const handleMarkAllRead = async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // Silencioso
    }
  };

  // Formatear fecha relativa
  const timeAgo = (dateStr: string): string => {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHour < 24) return `Hace ${diffHour}h`;
    if (diffDay < 7) return `Hace ${diffDay}d`;
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      // Existentes
      new_client: '🎉',
      payment_received: '💰',
      session_scheduled: '📹',
      session_reminder: '⏰',
      session_paid: '✅',
      trial_ending: '⚠️',
      trial_expired: '❌',
      ai_recommendations_ready: '🤖',
      // Retiros bancarios
      payout_initiated: '🏦',
      payout_paid: '💵',
      payout_failed: '🚫',
      // Moderación de contenido
      recipe_approved: '🍽️',
      recipe_rejected: '🍽️',
      exercise_approved: '🏋️',
      exercise_rejected: '🏋️',
      // Cuenta
      password_changed: '🔑',
      email_changed: '✉️',
    };
    return icons[type] || '🔔';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón campana con badge */}
      <button
        onClick={toggleDropdown}
        className="relative w-full px-4 py-3 rounded-lg hover:bg-yellow-600 transition-all duration-200 flex items-center group"
        aria-label="Notificaciones"
      >
        <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center mr-3 group-hover:bg-white group-hover:text-yellow-600 transition-colors relative">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <span className="font-medium">Notificaciones</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[70vh] flex flex-col">
          {/* Header del dropdown */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <h3 className="text-sm font-semibold text-gray-800">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-yellow-600 hover:text-yellow-800 font-medium transition-colors"
              >
                Marcar todo leído
              </button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <span className="text-sm">No hay notificaciones</span>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notif) => (
                  <button
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left px-4 py-3 hover:bg-amber-50 transition-colors flex items-start gap-3 ${
                      !notif.read ? 'bg-amber-50/50' : ''
                    }`}
                  >
                    <span className="text-lg shrink-0 mt-0.5">
                      {getTypeIcon(notif.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm ${
                          !notif.read ? 'font-semibold text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>
                    {!notif.read && (
                      <span className="w-2 h-2 bg-red-500 rounded-full shrink-0 mt-2" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
