import { useEffect, useState } from 'react'
import { Bell, Box, Building2, CircleUserRound, ClipboardList, Droplets, LayoutDashboard, LogOut, Menu, Radio, Route, Truck, X } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import { getDashboardData } from './services/reliefApi'
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

export default function App() {
  const { user, logout, loading, recovering } = useAuth()
  const [data, setData] = useState(null)
  const [active, setActive] = useState('Overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => { if (user) getDashboardData().then(setData) }, [user])
  useEffect(() => { setActive('Overview'); setNotice(''); setMenuOpen(false) }, [user?.id])

  if (loading) return <div className="grid min-h-screen place-items-center text-slate-500">Loading…</div>
if (!user || recovering) return <AuthPage recovering={recovering} />
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
    <div className="min-h-screen bg-[#1c567b]">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white"><Droplets size={21} fill="currentColor" /></div>
              <span className="text-lg font-extrabold text-slate-900">Sankat<span className="text-sky-600">Saathi</span></span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:block">● Live coordination</span>
            <button className="relative rounded-full p-2 text-slate-500" aria-label="Notifications"><Bell size={20} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" /></button>
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
              <button key={label} onClick={() => { setActive(label); setMenuOpen(false); setNotice('') }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active === label ? 'bg-sky-600 text-white shadow-lg shadow-sky-200' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon size={18} />{label}
                {role === 'ngo' && label === 'Requests' && <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">148</span>}
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

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
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