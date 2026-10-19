import { useEffect, useRef, useState } from 'react'
import { Bell, Box, Building2, Check, CircleUserRound, ClipboardList, LayoutDashboard, LogOut, Menu, Radio, Route, Truck, X } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import BrandLogo from './components/BrandLogo'
import { getDashboardData } from './services/reliefApi'
import { getNotifications } from './services/notificationsApi'
import { supabase } from './services/supabase'
import AuthPage from './pages/AuthPage'
import OverviewPage from './pages/OverviewPage'
import RequestsPage from './pages/RequestsPage'
import InventoryPage from './pages/InventoryPage'
import AllocationPage from './pages/AllocationPage'
import DeliveriesPage from './pages/DeliveriesPage'
import CitizenPortal from './pages/CitizenPortal'
import AdminPortal from './pages/AdminPortal'

const NAV = {
  citizen: [['Overview', LayoutDashboard], ['Request Assistance', ClipboardList], ['My Requests', Radio], ['Relief Centres', Building2], ['Profile', CircleUserRound]],
  ngo: [['Overview', LayoutDashboard], ['Requests', ClipboardList], ['Inventory', Box], ['Allocation AI', Route], ['Deliveries', Truck]],
  admin: [['Overview', LayoutDashboard], ['Incidents', Radio], ['NGO Partners', Building2], ['Relief Centres', Box], ['System Reports', Route]],
}
const ROLE_LABEL = { citizen: 'Citizen / Public', ngo: 'NGO operator', admin: 'Platform admin' }

function loadReadNotificationIds(storageKey) {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

function loadDismissedNotificationIds(storageKey) {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export default function App() {
  const { user, logout, loading, recovering } = useAuth()
  const [data, setData] = useState(null)
  const [dataError, setDataError] = useState('')
  const [active, setActive] = useState('Overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [notificationData, setNotificationData] = useState({ userId: null, items: [] })
  const [notificationErrorData, setNotificationErrorData] = useState({ userId: null, message: '' })
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [, setReadStateVersion] = useState(0)
  const [, setDismissedStateVersion] = useState(0)
  const notificationContainerRef = useRef(null)

  const readStorageKey = user ? `sankat-saathi:read-notifications:${user.id}` : ''
  const dismissedStorageKey = user ? `sankat-saathi:dismissed-notifications:${user.id}` : ''
  const readNotificationIds = user ? loadReadNotificationIds(readStorageKey) : []
  const dismissedNotificationIds = user ? loadDismissedNotificationIds(dismissedStorageKey) : []
  const notifications = notificationData.userId === user?.id ? notificationData.items : []
  const notificationError = notificationErrorData.userId === user?.id ? notificationErrorData.message : ''
  const visibleNotifications = notifications.filter((item) => !dismissedNotificationIds.includes(item.id))

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setData(null)
    setDataError('')
    getDashboardData(user)
      .then((dashboardData) => { if (!cancelled) setData(dashboardData) })
      .catch((error) => { if (!cancelled) setDataError(error.message) })
    return () => { cancelled = true }
  }, [user])
  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    let refreshTimer
    const refreshDashboard = () => {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        getDashboardData(user)
          .then((dashboardData) => {
            if (cancelled) return
            setData(dashboardData)
            setDataError('')
          })
          .catch((error) => {
            if (!cancelled) setDataError(error.message)
          })
      }, 250)
    }
    const channel = supabase.channel(`dashboard-sync-${user.id}`)
    for (const table of ['assistance_requests', 'inventory', 'allocations', 'allocation_items', 'deliveries']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refreshDashboard)
    }
    channel.subscribe()
    return () => {
      cancelled = true
      window.clearTimeout(refreshTimer)
      supabase.removeChannel(channel)
    }
  }, [user])
  useEffect(() => { setActive('Overview'); setNotice(''); setMenuOpen(false) }, [user?.id])
  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    const refreshNotifications = () => {
      getNotifications(user)
        .then((items) => {
          if (cancelled) return
          setNotificationData({ userId: user.id, items })
          setNotificationErrorData({ userId: user.id, message: '' })
        })
        .catch((error) => {
          if (cancelled) return
          setNotificationErrorData({ userId: user.id, message: error.message })
        })
    }

    refreshNotifications()
    const intervalId = window.setInterval(refreshNotifications, 30000)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [user, readStorageKey])

  useEffect(() => {
    if (!notificationsOpen) return undefined
    const closeOnOutsidePointer = (event) => {
      if (!notificationContainerRef.current?.contains(event.target)) setNotificationsOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setNotificationsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [notificationsOpen])

  const markNotificationsRead = (ids) => {
    const currentIds = loadReadNotificationIds(readStorageKey)
    const nextIds = [...new Set([...currentIds, ...ids])].slice(-500)
    localStorage.setItem(readStorageKey, JSON.stringify(nextIds))
    setReadStateVersion((version) => version + 1)
  }
  const dismissNotification = (id) => {
    const currentIds = loadDismissedNotificationIds(dismissedStorageKey)
    const nextIds = [...new Set([...currentIds, id])].slice(-500)
    localStorage.setItem(dismissedStorageKey, JSON.stringify(nextIds))
    setDismissedStateVersion((version) => version + 1)
  }
  const unreadCount = visibleNotifications.filter((item) => !readNotificationIds.includes(item.id)).length

  if (loading) return <div className="grid min-h-screen place-items-center text-slate-500">Loading…</div>
  if (!user || recovering) return <AuthPage recovering={recovering} />
  if (!data && dataError) return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="max-w-lg rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
        <p className="font-semibold text-rose-800">Could not load relief coordination data</p>
        <p className="mt-2 text-sm text-slate-600">{dataError}</p>
        <button onClick={() => { setDataError(''); setData(null); getDashboardData(user).then(setData).catch((error) => setDataError(error.message)) }} className="mt-4 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white">Retry</button>
      </div>
    </div>
  )
  if (!data) return <div className="grid min-h-screen place-items-center text-slate-500">Loading relief coordination data…</div>

  const role = user.role
  const pageProps = { data, notify: setNotice, goTo: setActive }
  const ngoPages = {
    Overview: <OverviewPage {...pageProps} />, Requests: <RequestsPage {...pageProps} />, Inventory: <InventoryPage {...pageProps} />,
    'Allocation AI': <AllocationPage {...pageProps} />, Deliveries: <DeliveriesPage {...pageProps} />,
  }
  const content = role === 'citizen' ? <CitizenPortal {...pageProps} active={active} />
    : role === 'admin' ? <AdminPortal {...pageProps} active={active} />
    : ngoPages[active]

  return (
    <div className={`min-h-screen ${role === 'citizen' ? 'bg-[#1c567b]' : 'bg-slate-100'}`}>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
            <BrandLogo size="small" />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:block">● Live coordination</span>
            <div className="relative" ref={notificationContainerRef}>
              <button
                className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                aria-expanded={notificationsOpen}
                aria-haspopup="dialog"
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <section
                  role="dialog"
                  aria-label="Notifications"
                  className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Notifications</h2>
                      <p className="text-xs text-slate-500">{unreadCount ? `${unreadCount} unread` : 'You are all caught up'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markNotificationsRead(visibleNotifications.map((item) => item.id))}
                          className="rounded-lg px-2 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        aria-label="Close notifications"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  {notificationError && (
                    <div role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-800">
                      {notificationError}
                    </div>
                  )}
                  <div className="max-h-[min(26rem,65vh)] overflow-y-auto">
                    {visibleNotifications.length === 0 && !notificationError ? (
                      <p className="px-4 py-10 text-center text-sm text-slate-500">No recent updates for your account.</p>
                    ) : visibleNotifications.map((item) => {
                      const isUnread = !readNotificationIds.includes(item.id)
                      return (
                        <div
                          key={item.id}
                          className={`flex items-start gap-1 border-b border-slate-100 pr-2 transition hover:bg-slate-50 ${isUnread ? 'bg-sky-50/70' : ''}`}
                        >
                          <button
                            onClick={() => {
                              markNotificationsRead([item.id])
                              setActive(item.page)
                              setMenuOpen(false)
                              setNotice('')
                              setNotificationsOpen(false)
                            }}
                            className="flex min-w-0 flex-1 gap-3 px-4 py-3 text-left"
                          >
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isUnread ? 'bg-sky-600' : 'bg-transparent'}`} />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-2">
                                <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                                <span className="shrink-0 text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
                              </span>
                              <span className="mt-1 block text-xs leading-relaxed text-slate-600">{item.message}</span>
                              {!isUnread && <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-slate-400"><Check size={11} /> Read</span>}
                            </span>
                          </button>
                          <button
                            onClick={() => dismissNotification(item.id)}
                            aria-label={`Clear notification: ${item.title}`}
                            title="Clear notification"
                            className="mt-2 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[10px] text-slate-500">Updates refresh automatically while this page is open.</p>
                </section>
              )}
            </div>
            <div className="hidden items-center gap-2 border-l pl-3 sm:flex">
              <CircleUserRound className="text-sky-700" />
              <div className="leading-tight"><p className="text-xs font-semibold text-slate-800">{user.name}</p><p className="text-[10px] text-slate-500">{ROLE_LABEL[role]}</p></div>
            </div>
            <button onClick={logout} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"><LogOut size={15} /> Logout</button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px]">
        <aside className={`${menuOpen ? 'fixed inset-x-0 top-16 z-20 block bg-white p-4 shadow-xl' : 'hidden'} w-full border-r border-slate-200 bg-white lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-64px)] lg:w-64 lg:p-5`}>
          <nav className="space-y-1">
            {NAV[role].map(([label, Icon]) => (
              <button key={label} onClick={() => { setActive(label); setMenuOpen(false); setNotice(''); setNotificationsOpen(false) }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active === label ? 'bg-sky-600 text-white shadow-lg shadow-sky-200' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon size={18} />{label}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-xl border border-slate-200 p-3 sm:hidden">
            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-500">{ROLE_LABEL[role]}</p>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-900 p-4 text-white">
            <Radio size={18} className="mb-4 text-sky-300" />
            <p className="text-xs text-slate-300">Emergency hotline</p>
            <p className="mt-1 text-lg font-bold">108</p>
            <button onClick={() => setNotice('Control room notified. A responder will contact you shortly.')} className="mt-3 w-full rounded-lg bg-white/10 py-2 text-xs font-semibold">Contact control room</button>
          </div>
        </aside>

        <main className={`min-h-[calc(100vh-4rem)] min-w-0 flex-1 p-4 sm:p-6 lg:p-8 ${role === 'ngo' ? 'bg-slate-100' : ''}`}>
          {notice && (
            <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={17} /></button>
            </div>
          )}
          {content}
        </main>
      </div>
    </div>
  )
}