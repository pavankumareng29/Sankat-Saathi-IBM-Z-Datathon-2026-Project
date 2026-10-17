import { useState } from 'react'
import {
  ArrowRight,
  Building2,
  CircleCheck,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  TriangleAlert,
  User,
  Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { requestPasswordReset, validatePassword } from '../services/authApi'
import BrandLogo from '../components/BrandLogo'

/* ------------------------------------------------------------------ */
/*  Theme styles: storm scene (rain, lightning, waves, motion)         */
/*  Pure CSS — safe to move into your global stylesheet if you prefer  */
/* ------------------------------------------------------------------ */

const THEME_CSS = `
@keyframes ss-rain-a { to { background-position: 0 320px } }
@keyframes ss-rain-b { to { background-position: 0 260px } }
@keyframes ss-flash {
  0%, 86%, 89.6%, 100% { opacity: 0 }
  86.5% { opacity: .65 } 87% { opacity: .08 } 87.6% { opacity: .45 }
  88.2% { opacity: 0 } 89% { opacity: .22 } 89.3% { opacity: 0 }
}
@keyframes ss-wave { to { transform: translateX(-50%) } }
@keyframes ss-bob {
  0%, 100% { transform: translateY(0) rotate(-1.6deg) }
  50% { transform: translateY(-7px) rotate(1.4deg) }
}
@keyframes ss-heli { from { transform: translateX(-16px) } to { transform: translateX(18px) } }
@keyframes ss-glow {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: .55 }
  50% { transform: translate3d(2%, -3%, 0) scale(1.08); opacity: .85 }
}
@keyframes ss-fade-up {
  from { opacity: 0; transform: translateY(14px) }
  to { opacity: 1; transform: translateY(0) }
}
.ss-rain-a {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='320'%3E%3Cg stroke='%23bae6fd' stroke-width='1.2' stroke-linecap='round'%3E%3Cpath stroke-opacity='.38' d='M22 8 L19 27'/%3E%3Cpath stroke-opacity='.28' d='M70 84 L67 103'/%3E%3Cpath stroke-opacity='.34' d='M118 160 L115 179'/%3E%3Cpath stroke-opacity='.22' d='M40 210 L37 228'/%3E%3Cpath stroke-opacity='.24' d='M148 40 L145 58'/%3E%3Cpath stroke-opacity='.3' d='M96 260 L93 279'/%3E%3Cpath stroke-opacity='.2' d='M6 130 L3 148'/%3E%3C/g%3E%3C/svg%3E");
  background-size: 160px 320px;
  animation: ss-rain-a .85s linear infinite;
}
.ss-rain-b {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='260'%3E%3Cg stroke='%23e0f2fe' stroke-width='1' stroke-linecap='round'%3E%3Cpath stroke-opacity='.3' d='M30 12 L28 26'/%3E%3Cpath stroke-opacity='.2' d='M84 70 L82 86'/%3E%3Cpath stroke-opacity='.26' d='M140 130 L138 146'/%3E%3Cpath stroke-opacity='.18' d='M60 180 L58 194'/%3E%3Cpath stroke-opacity='.2' d='M180 40 L178 54'/%3E%3Cpath stroke-opacity='.22' d='M110 220 L108 236'/%3E%3C/g%3E%3C/svg%3E");
  background-size: 200px 260px;
  animation: ss-rain-b .5s linear infinite;
}
.ss-flash {
  background: radial-gradient(ellipse at 78% 10%, rgba(240,249,255,.9) 0%, rgba(186,230,253,.3) 20%, transparent 55%);
  opacity: 0;
  animation: ss-flash 11s linear infinite;
}
.ss-wave-a { animation: ss-wave 17s linear infinite }
.ss-wave-b { animation: ss-wave 11s linear infinite reverse }
.ss-wave-c { animation: ss-wave 8s linear infinite }
.ss-boat { animation: ss-bob 4.5s ease-in-out infinite }
.ss-heli { animation: ss-heli 9s ease-in-out infinite alternate }
.ss-glow { animation: ss-glow 12s ease-in-out infinite }
.ss-view { animation: ss-fade-up .45s cubic-bezier(.22, 1, .36, 1) both }
@media (prefers-reduced-motion: reduce) {
  .ss-rain-a, .ss-rain-b, .ss-flash, .ss-wave-a, .ss-wave-b, .ss-wave-c, .ss-boat, .ss-heli, .ss-glow, .ss-view { animation: none }
  .ss-flash { opacity: 0 }
}
`

/* ------------------------------------------------------------------ */
/*  Decorative scene pieces                                            */
/* ------------------------------------------------------------------ */

const FEATURES = [
  { icon: Users, title: 'Request Help' },
  { icon: Package, title: 'Coordinate Resources' },
  { icon: ShieldCheck, title: 'Support Communities' },
]

function SceneRain() {
  return (
    <>
      <div className="ss-rain-a pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="ss-rain-b pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
    </>
  )
}

function SceneLightning() {
  return <div className="ss-flash pointer-events-none absolute inset-0" aria-hidden="true" />
}

function SceneWaves() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 overflow-hidden sm:h-28" aria-hidden="true">
      <svg viewBox="0 0 2880 200" preserveAspectRatio="none" className="ss-wave-a absolute bottom-0 left-0 h-full w-[200%]">
        <path d="M0 80 C240 140 480 20 720 60 C960 100 1200 30 1440 80 C1680 140 1920 20 2160 60 C2400 100 2640 30 2880 80 L2880 200 L0 200 Z" fill="rgba(125,211,252,.18)" />
      </svg>
      <svg viewBox="0 0 2880 200" preserveAspectRatio="none" className="ss-wave-b absolute bottom-0 left-0 h-full w-[200%]">
        <path d="M0 120 C240 60 480 170 720 130 C960 90 1200 160 1440 120 C1680 60 1920 170 2160 130 C2400 90 2640 160 2880 120 L2880 200 L0 200 Z" fill="rgba(14,116,144,.5)" />
      </svg>
      <svg viewBox="0 0 2880 200" preserveAspectRatio="none" className="ss-wave-c absolute bottom-0 left-0 h-full w-[200%]">
        <path d="M0 150 C240 110 480 190 720 160 C960 130 1200 190 1440 150 C1680 110 1920 190 2160 160 C2400 130 2640 190 2880 150 L2880 200 L0 200 Z" fill="rgba(6,26,45,.92)" />
      </svg>
    </div>
  )
}

function RescueBoat({ className = '' }) {
  return (
    <svg viewBox="0 0 260 120" className={className} aria-hidden="true">
      {/* crew: heads + orange rescue vests */}
      <circle cx="78" cy="44" r="9" fill="#0a2238" />
      <path d="M64 74 L64 58 C64 51 70 47 78 47 C86 47 92 51 92 58 L92 74 Z" fill="#0a2238" />
      <rect x="67" y="52" width="22" height="15" rx="5" fill="#f97316" />
      <circle cx="116" cy="40" r="9" fill="#0a2238" />
      <path d="M102 74 L102 55 C102 48 108 44 116 44 C124 44 130 48 130 55 L130 74 Z" fill="#0a2238" />
      <rect x="105" y="49" width="22" height="15" rx="5" fill="#fb923c" />
      <circle cx="152" cy="46" r="8" fill="#0a2238" />
      <path d="M140 74 L140 59 C140 53 145 49 152 49 C159 49 164 53 164 59 L164 74 Z" fill="#0a2238" />
      <rect x="142" y="54" width="20" height="14" rx="5" fill="#f97316" />
      {/* console + antenna */}
      <rect x="176" y="44" width="26" height="30" rx="5" fill="#0a2238" />
      <rect x="181" y="50" width="12" height="8" rx="2" fill="#7dd3fc" opacity=".8" />
      <rect x="206" y="30" width="3" height="44" rx="1.5" fill="#0a2238" />
      <circle cx="207.5" cy="28" r="4.5" fill="#fb923c">
        <animate attributeName="opacity" values="1;.25;1" dur="1.4s" repeatCount="indefinite" />
      </circle>
      {/* hull */}
      <path d="M16 72 L244 72 L220 104 C214 111 205 115 193 115 L67 115 C55 115 45 111 39 104 Z" fill="#0b2a44" />
      <path d="M16 72 L244 72 L236 84 L24 84 Z" fill="#f97316" />
    </svg>
  )
}

function RescueHeli({ className = '' }) {
  return (
    <svg viewBox="0 0 170 80" className={className} aria-hidden="true">
      <line x1="40" y1="12" x2="156" y2="12" stroke="#0a2740" strokeWidth="3.5" strokeLinecap="round" opacity=".95" />
      <line x1="56" y1="18" x2="140" y2="18" stroke="#0a2740" strokeWidth="2.5" strokeLinecap="round" opacity=".55" />
      <rect x="94" y="9" width="7" height="14" rx="3" fill="#0a2740" />
      <ellipse cx="100" cy="38" rx="30" ry="15" fill="#17456b" />
      <path d="M126 34 L160 27 L160 40 Z" fill="#17456b" />
      <rect x="154" y="15" width="5" height="16" rx="2.5" fill="#17456b" />
      <circle cx="82" cy="35" r="8" fill="#9fd9f6" opacity=".9" />
      <line x1="76" y1="56" x2="120" y2="56" stroke="#0a2740" strokeWidth="3" strokeLinecap="round" />
      <line x1="84" y1="51" x2="84" y2="56" stroke="#0a2740" strokeWidth="2.5" />
      <line x1="110" y1="51" x2="110" y2="56" stroke="#0a2740" strokeWidth="2.5" />
      <circle cx="70" cy="46" r="4.5" fill="#fde68a">
        <animate attributeName="opacity" values="1;.3;1" dur="1.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

function ScenePins() {
  return (
    <div className="absolute right-[3.5%] top-[28%] hidden flex-col items-center gap-14 xl:flex" aria-hidden="true">
      <span className="relative flex h-3.5 w-3.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-60" />
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white/80 bg-cyan-400 shadow-[0_0_18px_rgba(103,232,249,.9)]" />
      </span>
      <span className="h-14 border-l-2 border-dashed border-cyan-200/40" />
      <MapPin size={26} className="animate-pulse text-cyan-300 drop-shadow-[0_0_12px_rgba(103,232,249,.9)]" />
    </div>
  )
}

function SceneBackdrop() {
  return (
    <div className="fixed inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-[#082742] via-[#11496e] to-[#0a3252]" />
      <div className="ss-glow absolute -left-[12%] top-[25%] h-[34rem] w-[34rem] rounded-full bg-cyan-300/10 blur-[100px]" />
      <div className="ss-glow absolute right-[4%] top-[9%] h-[28rem] w-[28rem] rounded-full bg-sky-300/10 blur-[90px]" />
      {/* storm clouds */}
      <div className="absolute -top-24 left-[4%] h-72 w-[560px] rounded-full bg-[#1b5a86]/45 blur-3xl" />
      <div className="absolute top-6 right-[6%] h-64 w-[500px] rounded-full bg-[#12466e]/70 blur-3xl" />
      <div className="absolute top-28 left-[34%] h-56 w-[440px] rounded-full bg-[#0e3a5f]/80 blur-3xl" />
      {/* warm horizon glow */}
      <div className="absolute left-[2%] top-[44%] h-[360px] w-[640px] rounded-full bg-amber-500/20 blur-3xl" />
      <div className="absolute left-[16%] top-[54%] h-[220px] w-[380px] rounded-full bg-orange-400/15 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(7,27,46,.12)_0%,transparent_44%,rgba(4,18,31,.35)_100%)]" />
      <svg className="pointer-events-none absolute inset-x-0 bottom-20 h-[56%] w-full opacity-45" viewBox="0 0 1440 460" preserveAspectRatio="xMidYMax slice" fill="none">
        <path d="M0 290 42 248l18 12 18-34 28 32 18-15 35 44 26-20 32 23 24-28 18 17 28-38 25 30 23-13 26 33 25-22 35 26 30-38 28 32 33-13 24 22 26-31 24 21 31-45 28 33 31-19 23 27 28-35 36 29 25-39 32 35 23-22 30 26 26-32 32 24 25-40 29 27 25-16 27 29 25-33 33 28 23-42 35 30 26-22 28 24 26-37 31 31 26-20 28 27 29-37 35 29 25-24 25 26 29-38 28 33 27-20 27 28 31-40 30 28 25-23 31 26 25-31 35 29 27-20 32 22 28-35 30 27 28-18 31 26 28-33 32 34 22-19 32 20 35-38 26 27 30-20 31 28 28-36 32 30 25-18 30 22 24-30 38 26 22-23 31 22 30-36 33 31 22-18 28 20 28-34 38 29 24-21 27 20 34-33 35 29 23-17 30 24 30-28 35 23 22-21 31 24 30-37 37 30 24-19 29 21 28-31 34 26 28-18 28 22 30-31 42 30V460H0Z" fill="#071e35" />
        <g fill="#06192c">
          <path d="M1010 280h158v91h-158zM992 280l97-73 97 73zM1034 304h37v67h-37zM1100 305h47v32h-47z" />
          <path d="M1188 266h135v105h-135zM1172 266l84-61 84 61zM1208 292h31v79h-31zM1261 292h42v31h-42z" />
          <path d="M945 371c0-33 14-53 32-66 18 13 30 33 30 66h-15c0-19-6-35-15-46-10 11-17 27-17 46z" />
          <path d="M975 320c-14-28-34-41-59-43 11 20 29 34 55 42-17-22-21-43-12-66 14 19 20 39 16 62 9-28 25-45 50-52-4 25-18 44-42 57 25-7 46-5 66 8-23 9-46 7-67-3z" />
          <path d="M1375 371c0-27 10-43 24-54 15 11 24 27 24 54h-12c0-15-5-28-12-37-8 9-13 22-13 37z" />
          <path d="M1397 330c-11-22-26-32-46-34 9 16 23 27 43 34-13-18-16-35-9-53 11 15 15 31 12 50 7-22 20-36 40-42-3 20-14 35-33 46 20-6 36-4 52 6-18 7-36 6-53-2z" />
        </g>
        <path d="M0 364c112-24 180-20 278-2s159 25 270 4 178-27 280-5 181 25 286 0 196-28 326 0v99H0z" fill="#092640" opacity=".88" />
      </svg>
      {/* helicopter searchlight */}
      <div className="absolute left-[28%] top-[12%] h-[520px] w-[220px] rotate-[24deg] bg-gradient-to-b from-amber-200/20 via-amber-100/[.06] to-transparent blur-2xl" />
      <RescueHeli className="ss-heli absolute left-[31%] top-[6%] hidden w-44 md:block xl:w-48" />
      <ScenePins />
      <SceneRain />
      <SceneLightning />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(2,12,22,.5)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#04121f]/15 to-[#04121f]/50" />
      <svg className="pointer-events-none absolute bottom-0 left-0 h-72 w-[55%] opacity-[.12]" viewBox="0 0 720 360" fill="none" aria-hidden="true">
        <path d="M-30 356C80 270 145 322 232 248s152-57 207-126S574 31 742 8" stroke="#bae6fd" strokeWidth="1.2" />
        <path d="M-30 378C80 292 145 344 232 270s152-57 207-126S574 53 742 30" stroke="#bae6fd" strokeWidth="1.2" />
        <path d="M-30 400C80 314 145 366 232 292s152-57 207-126S574 75 742 52" stroke="#bae6fd" strokeWidth="1.2" />
        <path d="M-30 422C80 336 145 388 232 314s152-57 207-126S574 97 742 74" stroke="#bae6fd" strokeWidth="1.2" />
      </svg>
      <RescueBoat className="ss-boat absolute bottom-[5.5rem] left-[5%] z-[1] hidden w-52 drop-shadow-[0_18px_28px_rgba(0,0,0,.5)] lg:block xl:w-60" />
      <SceneWaves />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared UI atoms                                                    */
/* ------------------------------------------------------------------ */

const inputCls = 'w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white disabled:cursor-not-allowed'

function Field({ id, label, error, icon: Icon, trailing, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        {Icon && <Icon size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />}
        <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
          className={`${inputCls} ${Icon ? 'pl-11' : ''} ${trailing ? 'pr-12' : ''} ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100' : 'focus:border-sky-500 focus:ring-4 focus:ring-sky-100'}`}
          {...props} />
        {trailing}
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-rose-600">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{error}
        </p>
      )}
    </div>
  )
}

function EyeToggle({ show, onToggle }) {
  return (
    <button type="button" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'}
      className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
      {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
    </button>
  )
}

const Submit = ({ busy, children }) => (
  <button type="submit" disabled={busy}
    className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 py-3.5 text-base font-bold text-white shadow-lg shadow-sky-900/30 transition hover:from-sky-500 hover:to-blue-600 hover:shadow-xl hover:shadow-sky-900/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/60 active:scale-[.99] disabled:pointer-events-none disabled:opacity-70">
    {busy && <LoaderCircle className="animate-spin" size={20} aria-hidden="true" />} {children}
    {!busy && <ArrowRight size={18} className="absolute right-4" aria-hidden="true" />}
  </button>
)

const Banner = ({ tone, children }) => children ? (
  <div role="alert"
    className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
    {tone === 'error'
      ? <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      : <CircleCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
    <span>{children}</span>
  </div>
) : null

const LinkBtn = ({ onClick, children }) => (
  <button type="button" onClick={onClick}
    className="rounded font-semibold text-sky-700 underline-offset-2 transition hover:text-sky-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
    {children}
  </button>
)

/* ------------------------------------------------------------------ */
/*  Views (auth logic unchanged)                                       */
/* ------------------------------------------------------------------ */

function LoginView({ go, email: initialEmail, notice }) {
  const { login } = useAuth()
  const [email, setEmail] = useState(initialEmail || '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return setError('Enter your email and password.')
    setBusy(true); setError('')
    try { await login(email, password) } catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Banner tone="ok">{notice}</Banner>
      <Banner tone="error">{error}</Banner>
      <Field id="login-email" label="Email" type="email" autoComplete="email" icon={Mail} placeholder="you@example.com"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field id="login-password" label="Password" type={showPw ? 'text' : 'password'} autoComplete="current-password" icon={Lock} placeholder="Enter your password"
        value={password} onChange={(e) => setPassword(e.target.value)}
        trailing={<EyeToggle show={showPw} onToggle={() => setShowPw((s) => !s)} />} />
      <div className="text-right text-sm"><LinkBtn onClick={() => go('forgot', { email })}>Forgot password?</LinkBtn></div>
      <Submit busy={busy}>Log in</Submit>
      <p className="text-center text-sm text-slate-600">New here? <LinkBtn onClick={() => go('register')}>Create an account</LinkBtn></p>
    </form>
  )
}

function RegisterView({ go }) {
  const { register } = useAuth()
  const [form, setForm] = useState({ role: 'citizen', name: '', email: '', phone: '', organisation: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setErrors({}) }

  const submit = async (e) => {
    e.preventDefault()
    const v = {}
    if (!form.name.trim()) v.name = 'Enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) v.email = 'Enter a valid email.'
    if (form.phone.replace(/\D/g, '').length < 10) v.phone = 'Enter a phone number with at least 10 digits.'
    if (form.role === 'ngo' && !form.organisation.trim()) v.organisation = 'Enter your organisation name.'
    const pw = validatePassword(form.password)
    if (pw) v.password = pw
    if (form.confirm !== form.password) v.confirm = 'Passwords do not match.'
    setErrors(v)
    if (Object.keys(v).length) return
    setBusy(true); setError('')
    try {
      await register(form)
    } catch (err) {
      setBusy(false)
      if (err.code === 'ACCOUNT_EXISTS') go('login', { email: form.email, notice: 'You are already registered. Please log in.' })
      else if (err.code === 'CONFIRM_EMAIL') go('login', { email: form.email, notice: err.message })
      else setError(err.message)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Banner tone="error">{error}</Banner>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-slate-700">I am registering as</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {[['citizen', 'Citizen / Public', User], ['ngo', 'NGO operator', Building2]].map(([id, label, Icon]) => (
            <label key={id}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center text-sm font-semibold transition focus-within:ring-2 focus-within:ring-sky-400 ${form.role === id ? 'border-sky-500 bg-gradient-to-b from-sky-50 to-cyan-50 text-sky-800 shadow-sm shadow-sky-200' : 'border-slate-300 bg-slate-100/60 text-slate-500 hover:border-sky-300 hover:bg-sky-50'}`}>
              <input type="radio" name="role" className="sr-only" checked={form.role === id} onChange={() => set({ role: id })} />
              <Icon size={16} className={form.role === id ? 'text-sky-600' : 'text-slate-400'} aria-hidden="true" /> {label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="reg-name" label="Full name" autoComplete="name" icon={User} placeholder="e.g. Priya Sharma" value={form.name} error={errors.name} onChange={(e) => set({ name: e.target.value })} />
      {form.role === 'ngo' && <Field id="reg-org" label="Organisation" icon={Building2} placeholder="Your team or NGO" value={form.organisation} error={errors.organisation} onChange={(e) => set({ organisation: e.target.value })} />}
      <Field id="reg-email" label="Email" type="email" autoComplete="email" icon={Mail} placeholder="you@example.com" value={form.email} error={errors.email} onChange={(e) => set({ email: e.target.value })} />
      <Field id="reg-phone" label="Phone number" type="tel" inputMode="tel" autoComplete="tel" icon={Phone} placeholder="+91 98765 43210" value={form.phone} error={errors.phone} onChange={(e) => set({ phone: e.target.value })} />
      <Field id="reg-password" label="Password" type={showPw ? 'text' : 'password'} autoComplete="new-password" icon={Lock} placeholder="Create a strong password" value={form.password} error={errors.password} onChange={(e) => set({ password: e.target.value })} trailing={<EyeToggle show={showPw} onToggle={() => setShowPw((s) => !s)} />} />
      <Field id="reg-confirm" label="Confirm password" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" icon={ShieldCheck} placeholder="Repeat your password" value={form.confirm} error={errors.confirm} onChange={(e) => set({ confirm: e.target.value })} trailing={<EyeToggle show={showConfirm} onToggle={() => setShowConfirm((s) => !s)} />} />
      <Submit busy={busy}>Create account</Submit>
      <p className="text-center text-sm text-slate-600">Already registered? <LinkBtn onClick={() => go('login')}>Log in</LinkBtn></p>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
        <ShieldCheck size={13} aria-hidden="true" /> Admin accounts are created by the platform team.
      </p>
    </form>
  )
}

function ForgotView({ go, email: initialEmail }) {
  const [email, setEmail] = useState(initialEmail || '')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email.')
    setBusy(true); setError('')
    try { await requestPasswordReset(email); setSent(true) } catch { setError('Could not send the email. Try again.') }
    setBusy(false)
  }

  if (sent) return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 pb-1 pt-2 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CircleCheck size={30} aria-hidden="true" />
        </span>
        <Banner tone="ok">If an account exists for {email}, a reset link has been sent. Open it on this device.</Banner>
        <p className="text-center text-sm"><LinkBtn onClick={() => go('login')}>Back to log in</LinkBtn></p>
      </div>
    </div>
  )
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
        Enter your registered email and we will send you a reset link.
      </p>
      <Banner tone="error">{error}</Banner>
      <Field id="fp-email" label="Email" type="email" autoComplete="email" icon={Mail} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Submit busy={busy}>Send reset link</Submit>
      <p className="text-center text-sm"><LinkBtn onClick={() => go('login')}>Back to log in</LinkBtn></p>
    </form>
  )
}

function RecoveryView() {
  const { finishRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const pw = validatePassword(password)
    if (pw) return setError(pw)
    setBusy(true); setError('')
    try { await finishRecovery(password) } catch (err) { setError(err.message); setBusy(false) }
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Banner tone="error">{error}</Banner>
      <Field id="rec-pass" label="New password" type={showPw ? 'text' : 'password'} autoComplete="new-password" icon={KeyRound} placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} trailing={<EyeToggle show={showPw} onToggle={() => setShowPw((s) => !s)} />} />
      <Submit busy={busy}>Update password</Submit>
    </form>
  )
}

const TITLES = { login: 'Log in', register: 'Create your account', forgot: 'Reset your password', recovery: 'Set a new password' }
const SUBTITLES = {
  login: 'Access your account to continue',
  register: 'Join the relief network in minutes',
  forgot: "We'll email you a secure reset link",
  recovery: 'Choose a strong new password',
}

/* ------------------------------------------------------------------ */
/*  Page shell                                                         */
/* ------------------------------------------------------------------ */

function MarketingPanel() {
  return (
    <section className="hidden max-w-2xl text-white lg:block">
      <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-cyan-100 backdrop-blur">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
          <span className="relative h-2 w-2 rounded-full bg-emerald-300" />
        </span>
        Disaster response · community relief
      </span>
      <h2 className="text-[2.5rem] font-extrabold leading-[1.08] tracking-tight drop-shadow-sm xl:text-[3.5rem]">
        Together for a<br />
        <span className="bg-gradient-to-r from-sky-200 via-cyan-200 to-amber-100 bg-clip-text text-transparent">Safer Tomorrow</span>
      </h2>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-sky-50/80 xl:text-base">
        Connecting people, resources and real-time information to support communities during disasters.
      </p>
      <ul className="mt-8 grid max-w-lg grid-cols-3 divide-x divide-white/15">
        {FEATURES.map(({ icon: Icon, title }) => (
          <li key={title} className="flex flex-col items-center gap-2 px-3 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/10 text-cyan-100 backdrop-blur">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="text-xs font-semibold leading-snug text-white/90">{title}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function AuthPage({ recovering = false }) {
  const [state, setState] = useState({ view: 'login' })
  const go = (view, extra = {}) => setState({ view, ...extra })
  const view = recovering ? 'recovery' : state.view

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#082742] font-['Plus_Jakarta_Sans',ui-sans-serif,system-ui,sans-serif]">
      <style>{THEME_CSS}</style>
      {/* If your app already loads a webfont, you can delete the links below */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <SceneBackdrop />

      {/* Brand — desktop */}
      <BrandLogo
        size="small"
        className="absolute left-6 top-6 z-20 hidden drop-shadow-xl xl:left-10 xl:top-8 lg:flex"
      />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[90rem] grid-cols-1 items-center gap-10 px-4 py-8 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-12 lg:px-12">
        <MarketingPanel />

        <section className="mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end">
          {/* Brand — mobile */}
          <BrandLogo size="small" className="mx-auto mb-5 drop-shadow-xl lg:hidden" />

          <div className="overflow-hidden rounded-2xl border border-white/80 bg-slate-50/95 shadow-[0_28px_90px_-24px_rgba(0,0,0,.65)] ring-1 ring-slate-900/10 backdrop-blur-xl">
            <div className="p-6 sm:p-7">
              <BrandLogo
                size="medium"
                className="mx-auto mb-6"
              />

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{TITLES[view]}</h1>
              <p className="mb-5 mt-1 text-sm text-slate-500">{SUBTITLES[view]}</p>

              <div key={view} className="ss-view">
                {view === 'login' && <LoginView key="l" go={go} email={state.email} notice={state.notice} />}
                {view === 'register' && <RegisterView key="r" go={go} />}
                {view === 'forgot' && <ForgotView key="f" go={go} email={state.email} />}
                {view === 'recovery' && <RecoveryView key="rec" />}
              </div>
            </div>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs font-medium text-sky-100/50">
            <ShieldCheck size={13} aria-hidden="true" /> Encrypted & secure · SankatSaathi Disaster Response
          </p>
        </section>
      </div>
    </div>
  )
}
