import { useEffect, useState } from 'react'
import {
  AlertTriangle, ArrowRight, ChevronRight, ExternalLink, HandHeart, Home, MapPin,
  Phone, ShieldCheck, Users, X,
} from 'lucide-react'
import { Badge, Card } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import RequestAssistancePage from './RequestAssistancePage'
import MyRequestsPage from './MyRequestsPage'
import ReliefCentresPage from './ReliefCentresPage'

const input = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200'

const SAFETY_TIPS = [
  'Move to higher ground early. Do not wait for water to reach you.',
  'Never walk, swim or drive through floodwater.',
  'Keep your phone charged and save the emergency number 108.',
  'Keep documents, medicines and water in a waterproof bag.',
  'Follow official alerts from your district administration.',
]

const timeAgo = (iso) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`
  return `${Math.round(mins / 1440)} day(s) ago`
}

const fromRow = (r) => {
  const latestDelivery = (r.allocations || [])
    .flatMap((allocation) => allocation.deliveries || [])
    .sort((left, right) => new Date(right.updated_at) - new Date(left.updated_at))[0]
  const status = latestDelivery?.status || r.status
  return {
    id: r.request_code,
    type: r.needs?.length ? r.needs.map((need) => need.category).join(', ') : r.category,
    sub: r.medical_type, people: r.people_affected,
    supplies: (r.needs || []).flatMap((need) => (need.items || []).map((item) => {
      const resource = Array.isArray(item.resource) ? item.resource[0] : item.resource
      return `${resource?.name || 'Supply'}: ${Number(item.requested_quantity).toLocaleString()} ${resource?.unit || 'units'}`
    })),
    location: r.location_text, status: ({
      submitted: 'Pending', acknowledged: 'Pending', assigned: 'Assigned',
      in_progress: 'Preparing', preparing: 'Preparing', loading: 'Loading',
      en_route: 'En route', fulfilled: 'Delivered', delivered: 'Delivered',
      cancelled: 'Cancelled',
    })[status] || status, time: timeAgo(r.created_at),
  }
}

/* ---------- UI pieces ---------- */

function ActionCard({ icon: Icon, tint, title, text, extra, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl border border-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 ${tint.bg}`}
    >
      <div className="flex items-center gap-4">
        <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-white shadow-lg ${tint.icon}`}>
          <Icon size={30} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-extrabold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-sm text-slate-600">{text}</p>
          {extra && <div className="mt-2">{extra}</div>}
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition group-hover:translate-x-1 ${tint.arrow}`}>
          <ArrowRight size={20} aria-hidden="true" />
        </span>
      </div>
    </button>
  )
}

function InfoTile({ icon: Icon, tint, label, children, onClick, href }) {
  const body = (
    <>
      <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${tint}`}><Icon size={26} aria-hidden="true" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-800">{label}</p>
        {children}
      </div>
      <ChevronRight size={20} className="shrink-0 text-slate-400" aria-hidden="true" />
    </>
  )
  const cls = 'flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300'
  return href
    ? <a href={href} className={cls}>{body}</a>
    : <button onClick={onClick} className={cls}>{body}</button>
}

function Hero({ onHelp }) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-white shadow-md"
      style={{ backgroundImage: "url('/citizen-hero.jpg'), linear-gradient(135deg,#e0f2fe 0%,#dbeafe 55%,#fef3c7 100%)", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* decorative hills, hidden when a photo is used? no: they blend with the gradient */}
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 w-full" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 200 C150 120 260 170 420 130 C600 85 720 170 900 120 C1040 85 1130 130 1200 100 L1200 300 L0 300Z" fill="#93b6d4" opacity="0.35" />
        <path d="M0 240 C200 190 380 245 600 215 C820 185 1000 245 1200 205 L1200 300 L0 300Z" fill="#5b8db8" opacity="0.35" />
        <path d="M0 270 C300 245 600 285 1200 255 L1200 300 L0 300Z" fill="#3f78a6" opacity="0.4" />
      </svg>
      <svg className="pointer-events-none absolute right-6 top-6 hidden h-28 w-44 md:block" viewBox="0 0 176 112" fill="none" aria-hidden="true">
        <line x1="20" y1="14" x2="150" y2="14" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
        <line x1="85" y1="14" x2="85" y2="26" stroke="#475569" strokeWidth="3" />
        <ellipse cx="85" cy="42" rx="46" ry="18" fill="#334155" />
        <path d="M128 38 L170 30 L170 40 L128 48Z" fill="#334155" />
        <path d="M60 40 Q72 28 96 30 L96 46 L56 48Z" fill="#bae6fd" />
        <line x1="85" y1="60" x2="85" y2="108" stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="85" cy="108" r="3.5" fill="#f97316" />
      </svg>

      <div className="relative p-6 sm:p-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-700">
          <AlertTriangle size={14} aria-hidden="true" /> Emergency help
        </span>
        <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Need Help <span className="text-sky-600">Now?</span>
        </h2>
        <p className="mt-3 max-w-md text-base text-slate-700 sm:text-lg">
          Get immediate assistance from nearby authorities and volunteers.
        </p>
        <button
          onClick={onHelp}
          className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-500 px-6 py-4 text-lg font-extrabold text-white shadow-lg shadow-rose-300 transition hover:from-rose-700 hover:to-red-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-300"
        >
          <AlertTriangle size={22} aria-hidden="true" /> Request Emergency Help <ArrowRight size={20} aria-hidden="true" />
        </button>
        <div className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-slate-900/80 px-4 py-3 text-white backdrop-blur sm:absolute sm:bottom-6 sm:right-6 sm:mt-0">
          <span className="relative flex h-4 w-4"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500" /></span>
          <div className="leading-tight"><p className="text-sm font-semibold">Relief coordination online</p><p className="text-xs text-slate-300">Requests are being reviewed</p></div>
        </div>
      </div>
    </section>
  )
}

function SafetyBanner({ open, onToggle }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white"><ShieldCheck size={28} aria-hidden="true" /></div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Stay Safe, Stay Informed</h3>
            <p className="text-sm text-slate-600">Follow official updates and safety guidelines during the disaster.</p>
          </div>
        </div>
        <button onClick={onToggle} aria-expanded={open} className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-700 hover:bg-sky-100">
          {open ? 'Hide Safety Guidelines' : 'View Safety Guidelines'} {open ? <X size={16} /> : <ExternalLink size={16} />}
        </button>
      </div>
      {open && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {SAFETY_TIPS.map((t) => (
            <li key={t} className="flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-sm text-slate-700"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-sky-600" aria-hidden="true" />{t}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ---------- Page ---------- */

export default function CitizenPortal({ active = 'Overview', notify = () => {}, goTo = () => {} }) {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [requestError, setRequestError] = useState('')
  const [centresCount, setCentresCount] = useState(0)
  const [openCentresCount, setOpenCentresCount] = useState(0)
  const [safetyOpen, setSafetyOpen] = useState(false)
  const [profile, setProfile] = useState({
    name: user?.name || '', phone: user?.phone || '', email: user?.email || '', address: user?.address || '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // Load this citizen's saved requests
  useEffect(() => {
    let cancelled = false
    if (!user) {
      setLoadingRequests(false)
      return () => { cancelled = true }
    }
    const loadRequests = () => supabase.from('assistance_requests')
      .select('id, request_code, category, medical_type, people_affected, location_text, status, created_at, needs:assistance_request_needs(category, medical_type, items:assistance_request_need_items(requested_quantity, resource:resource_catalog(name, unit))), allocations:allocations!allocations_request_id_fkey(deliveries:deliveries!deliveries_allocation_id_fkey(status, updated_at))')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setRequestError(`Could not load your requests: ${error.message}`)
        else {
          setRequestError('')
          setRequests((data || []).map(fromRow))
        }
        setLoadingRequests(false)
      })
    loadRequests()
    const channel = supabase.channel(`citizen-requests-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'assistance_requests',
        filter: `requester_id=eq.${user.id}`,
      }, loadRequests)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deliveries',
      }, loadRequests)
      .subscribe()
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [user])

  useEffect(() => {
    let cancelled = false
    supabase.from('relief_centres')
      .select('id, status')
      .then(({ data, error }) => {
        if (cancelled || error) return
        setCentresCount(data.length)
        setOpenCentresCount(data.filter((centre) => centre.status === 'open').length)
      })
    return () => { cancelled = true }
  }, [])

  // Resolves only when the request is really saved; throws otherwise
  const addRequest = async (p) => {
    const { data, error } = await supabase.rpc('create_assistance_request_with_items', {
      p_needs: p.needs,
      p_people_affected: p.peopleAffected,
      p_contact_name: p.name || user.name,
      p_contact_phone: p.phone || user.phone,
      p_location_text: p.location,
      p_latitude: p.coords?.lat ?? null,
      p_longitude: p.coords?.lng ?? null,
    })
    if (error) throw new Error(`We could not save your request: ${error.message}`)
    setRequests((prev) => [fromRow(data), ...prev])
    return data.request_code
  }

  const latest = requests[0]
  const pageTitle = active === 'Overview' ? 'Citizen Portal' : active
  const saveProfile = async () => {
    setSavingProfile(true)
    const { error } = await supabase.from('profiles').update({
      name: profile.name.trim(),
      phone: profile.phone.trim(),
      address: profile.address.trim() || null,
    }).eq('id', user.id)
    setSavingProfile(false)
    if (error) notify(`Could not save profile: ${error.message}`)
    else notify('Profile saved.')
  }

  return (
    <div className="space-y-5 rounded-3xl bg-gradient-to-b from-sky-50 via-white to-slate-50 p-4 shadow-xl sm:p-6">
      {/* Slim emergency strip on inner pages */}
      {active !== 'Overview' && active !== 'Request Assistance' && (
        <button
          onClick={() => goTo('Request Assistance')}
          className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-500 px-5 py-3.5 text-left font-bold text-white shadow-md hover:from-rose-700 hover:to-red-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-300"
        >
          <span className="flex items-center gap-3"><AlertTriangle size={22} aria-hidden="true" /> Need help now? Request emergency help</span>
          <ArrowRight size={20} aria-hidden="true" />
        </button>
      )}

      {active !== 'Overview' && active !== 'Request Assistance' && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">Citizen Portal</p>
          <h1 className="text-3xl font-extrabold text-slate-900">{pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">Request emergency assistance and track relief supplies.</p>
        </div>
      )}

      {active === 'Overview' && (
        <>
          <Hero onHelp={() => goTo('Request Assistance')} />

          <div className="grid gap-5 lg:grid-cols-2">
            <ActionCard
              icon={HandHeart} onClick={() => goTo('Request Assistance')}
              tint={{ bg: 'bg-gradient-to-br from-sky-50 to-blue-50', icon: 'bg-gradient-to-br from-sky-500 to-blue-600', arrow: 'bg-sky-100 text-sky-700' }}
              title="Request Help" text="Medical help, food, drinking water or other assistance."
            />
            <ActionCard
              icon={MapPin} onClick={() => goTo('My Requests')}
              tint={{ bg: 'bg-gradient-to-br from-emerald-50 to-teal-50', icon: 'bg-gradient-to-br from-emerald-600 to-teal-600', arrow: 'bg-emerald-100 text-emerald-700' }}
              title="Track My Request"
              text={requests.length ? `You have ${requests.length} request${requests.length === 1 ? '' : 's'}.` : 'Check the status of your submitted requests.'}
              extra={latest && <span className="flex items-center gap-2 text-xs text-slate-500">Latest: {latest.type} <Badge value={latest.status} /></span>}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <InfoTile icon={Phone} tint="bg-rose-50 text-rose-600" label="Emergency Hotline" href="tel:108">
              <p className="text-3xl font-extrabold text-rose-600">108</p>
              <p className="text-xs text-slate-500">Tap to call</p>
            </InfoTile>
            <InfoTile icon={Home} tint="bg-sky-50 text-sky-600" label="Relief Centres" onClick={() => goTo('Relief Centres')}>
              <p className="flex items-baseline gap-2"><span className="text-3xl font-extrabold text-slate-900">{centresCount}</span><span className="text-sm text-slate-500">{openCentresCount} open now</span></p>
            </InfoTile>
            <InfoTile icon={Users} tint="bg-violet-50 text-violet-600" label="Available Resources" onClick={() => goTo('Relief Centres')}>
              <p className="text-sm text-slate-500">Food, Water, Medicine and more</p>
              <p className="text-xs font-semibold text-sky-700">Find a centre near you</p>
            </InfoTile>
          </div>

          <SafetyBanner open={safetyOpen} onToggle={() => setSafetyOpen((o) => !o)} />
        </>
      )}

      {active === 'Request Assistance' && <RequestAssistancePage addRequest={addRequest} notify={notify} goTo={goTo} />}

      {active === 'My Requests' && (loadingRequests
        ? <Card><p className="text-slate-500">Loading your requests…</p></Card>
        : <>{requestError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{requestError}</p>}<MyRequestsPage requests={requests} goTo={goTo} /></>)}

      {active === 'Relief Centres' && <ReliefCentresPage notify={notify} />}

      {active === 'Profile' && (
        <Card>
          <div className="mb-6 flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-2xl font-extrabold text-white">
              {(profile.name || '?').trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{profile.name || 'Your name'}</p>
              <p className="text-sm text-slate-500">Citizen / Public</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="pf-name" className="mb-1.5 block text-sm font-semibold text-slate-700">Full name</label>
              <input id="pf-name" className={input} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="pf-phone" className="mb-1.5 block text-sm font-semibold text-slate-700">Phone</label>
              <input id="pf-phone" type="tel" className={input} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </div>
            <div>
              <label htmlFor="pf-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
              <input id="pf-email" className={`${input} bg-slate-50 text-slate-500`} value={profile.email} readOnly />
            </div>
            <div>
              <label htmlFor="pf-address" className="mb-1.5 block text-sm font-semibold text-slate-700">Address</label>
              <input id="pf-address" className={input} placeholder="Area, city" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
            </div>
          </div>
          <button disabled={savingProfile} onClick={saveProfile} className="mt-5 rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700 disabled:opacity-60">{savingProfile ? 'Saving…' : 'Save profile'}</button>
        </Card>
      )}
    </div>
  )
}