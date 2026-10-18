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
/*  Theme styles: entrance, float, sheen, ken-burns                    */
/* ------------------------------------------------------------------ */

const THEME_CSS = `
@keyframes ss-fade-up { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
@keyframes ss-card-in { from { opacity: 0; transform: translateY(26px) scale(.97) } to { opacity: 1; transform: none } }
@keyframes ss-float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
@keyframes ss-kb { from { transform: scale(1) translate3d(0, 0, 0) } to { transform: scale(1.08) translate3d(-1.2%, -1%, 0) } }
@keyframes ss-glow { 0%, 100% { opacity: .45; transform: scale(1) } 50% { opacity: .8; transform: scale(1.1) } }
@keyframes ss-sheen { 0% { transform: translateX(-130%) skewX(-18deg) } 55%, 100% { transform: translateX(260%) skewX(-18deg) } }
@keyframes ss-shift { 0%, 100% { background-position: 0% 50% } 50% { background-position: 100% 50% } }
@keyframes ss-shake { 0%, 100% { transform: translateX(0) } 20%, 60% { transform: translateX(-5px) } 40%, 80% { transform: translateX(5px) } }
@keyframes ss-pop { 0% { transform: scale(.4); opacity: 0 } 70% { transform: scale(1.12) } 100% { transform: scale(1); opacity: 1 } }

.ss-view { animation: ss-fade-up .45s cubic-bezier(.22, 1, .36, 1) both }
.ss-in { opacity: 0; animation: ss-fade-up .7s cubic-bezier(.22, 1, .36, 1) forwards }
.ss-card { animation: ss-card-in .75s cubic-bezier(.22, 1, .36, 1) .1s both }
.ss-float { animation: ss-float 5s ease-in-out infinite }
.ss-kb { animation: ss-kb 28s ease-in-out infinite alternate }
.ss-glow { animation: ss-glow 9s ease-in-out infinite }
.ss-shake { animation: ss-shake .4s ease-in-out }
.ss-pop { animation: ss-pop .5s cubic-bezier(.22, 1, .36, 1) both }
.ss-grad-text { background-size: 200% 200%; animation: ss-shift 7s ease-in-out infinite }
.ss-btn::after {
  content: ''; position: absolute; inset: 0; width: 38%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent);
  animation: ss-sheen 3.8s ease-in-out infinite; pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .ss-view, .ss-in, .ss-card, .ss-float, .ss-kb, .ss-glow, .ss-shake, .ss-pop, .ss-grad-text, .ss-btn::after { animation: none !important }
  .ss-in { opacity: 1 }
}
`

const delay = (ms) => ({ animationDelay: `${ms}ms` })

/* ------------------------------------------------------------------ */
/*  Background: photo at /public/auth-bg.jpg, gradient as fallback     */
/* ------------------------------------------------------------------ */

function SceneBackdrop() {
  return (
    <div className="fixed inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="ss-kb absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('/auth-bg.jpg'), linear-gradient(160deg,#eaf4fc 0%,#bcd9ef 35%,#5f93bf 70%,#1d4a74 100%)",
        }}
      />
      {/* soft light glows */}
      <div className="ss-glow absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-amber-200/30 blur-[90px]" />
      <div className="ss-glow absolute right-[10%] top-[8%] h-80 w-80 rounded-full bg-sky-200/30 blur-[90px]" style={delay(2500)} />
      {/* readability scrims */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-[#06223d]/55 lg:bg-gradient-to-r lg:from-white/20 lg:via-transparent lg:to-[#0b3558]/40" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#06223d]/55 to-transparent lg:w-[68%]" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared UI atoms                                                    */
/* ------------------------------------------------------------------ */

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition duration-200 placeholder:text-slate-500 hover:border-slate-400 disabled:cursor-not-allowed'

function Field({ id, label, error, icon: Icon, trailing, ...props }) {
  return (
    <div className="group">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</label>
      <div className="relative">
        {Icon && <Icon size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-sky-600" />}
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`${inputCls} ${Icon ? 'pl-11' : ''} ${trailing ? 'pr-12' : ''} ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100' : 'focus:border-sky-500 focus:ring-4 focus:ring-sky-100'}`}
          {...props}
        />
        {trailing}
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className="ss-shake mt-1.5 flex items-start gap-1.5 text-sm font-medium text-rose-600">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{error}
        </p>
      )}
    </div>
  )
}

function EyeToggle({ show, onToggle }) {
  return (
    <button
      type="button" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'}
      className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
    >
      {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
    </button>
  )
}

const Submit = ({ busy, children }) => (
  <button
    type="submit" disabled={busy}
    className="ss-btn group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-900/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/35 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/60 active:translate-y-0 active:scale-[.99] disabled:pointer-events-none disabled:opacity-70"
  >
    {busy && <LoaderCircle className="animate-spin" size={20} aria-hidden="true" />} {children}
    {!busy && <ArrowRight size={18} className="absolute right-4 transition-transform duration-200 group-hover/btn:translate-x-1" aria-hidden="true" />}
  </button>
)

const Banner = ({ tone, children }) => children ? (
  <div
    role="alert"
    className={`${tone === 'error' ? 'ss-shake' : 'ss-view'} flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
  >
    {tone === 'error'
      ? <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      : <CircleCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
    <span>{children}</span>
  </div>
) : null

const LinkBtn = ({ onClick, children }) => (
  <button
    type="button" onClick={onClick}
    className="rounded font-semibold text-blue-700 underline-offset-2 transition hover:text-blue-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
  >
    {children}
  </button>
)

const OrDivider = () => (
  <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-slate-500" aria-hidden="true">
    <span className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-300" /> or <span className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-300" />
  </div>
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
      <OrDivider />
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
        <legend className="mb-1.5 text-sm font-semibold text-slate-800">I am registering as</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {[['citizen', 'Citizen / Public', User], ['ngo', 'NGO operator', Building2]].map(([id, label, Icon]) => (
            <label
              key={id}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center text-sm font-semibold transition duration-200 focus-within:ring-2 focus-within:ring-sky-400 ${form.role === id ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50'}`}
            >
              <input type="radio" name="role" className="sr-only" checked={form.role === id} onChange={() => set({ role: id })} />
              <Icon size={16} className={form.role === id ? 'text-sky-600' : 'text-slate-500'} aria-hidden="true" /> {label}
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
      <p className="flex items-center justify-center gap-1.5 text-center text-xs font-medium text-slate-600">
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
        <span className="ss-pop grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
          <CircleCheck size={30} aria-hidden="true" />
        </span>
        <Banner tone="ok">If an account exists for {email}, a reset link has been sent. Open it on this device.</Banner>
        <p className="text-center text-sm"><LinkBtn onClick={() => go('login')}>Back to log in</LinkBtn></p>
      </div>
    </div>
  )
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
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

const TITLES = { login: 'Welcome Back', register: 'Create your account', forgot: 'Reset your password', recovery: 'Set a new password' }
const SUBTITLES = {
  login: 'Log in to continue to Sankat Saathi and help build safer communities.',
  register: 'Join the relief network in minutes.',
  forgot: "We'll email you a secure reset link.",
  recovery: 'Choose a strong new password.',
}

/* ------------------------------------------------------------------ */
/*  Left marketing panel (desktop). Every text sits on solid/glass     */
/*  surfaces so it never blends into the photo.                        */
/* ------------------------------------------------------------------ */

const FEATURES = [
  { icon: Users, title: 'Request Help', text: 'Report and get assistance', tint: 'bg-blue-100 text-blue-600' },
  { icon: Package, title: 'Coordinate Resources', text: 'Efficient allocation', tint: 'bg-emerald-100 text-emerald-600' },
  { icon: ShieldCheck, title: 'Support Communities', text: 'Safer and stronger together', tint: 'bg-orange-100 text-orange-500' },
]

function MarketingPanel() {
  return (
    <section className="hidden flex-col justify-between self-stretch py-6 lg:flex">
      <div className="ss-in self-start rounded-2xl bg-white/85 p-2 shadow-lg shadow-slate-900/10 ring-1 ring-white backdrop-blur-md">
        <BrandLogo size="small" />
      </div>

      <div className="max-w-2xl">
        <span className="ss-in mb-5 inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[.14em] text-slate-800 shadow-sm" style={delay(120)}>
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-70" />
            <span className="relative h-2 w-2 rounded-full bg-sky-500" />
          </span>
          Disaster response · Community relief
        </span>

        <h2 className="ss-in text-5xl font-extrabold leading-[1.08] tracking-tight text-[#0b1b3a] drop-shadow-[0_2px_10px_rgba(255,255,255,.55)] xl:text-6xl" style={delay(220)}>
          Together for a<br />
          <span className="ss-grad-text bg-gradient-to-r from-blue-700 via-sky-500 to-cyan-500 bg-clip-text text-transparent">Safer Tomorrow</span>
        </h2>

        <p className="ss-in mt-5 max-w-lg rounded-2xl bg-white/70 px-5 py-3.5 text-base font-medium leading-relaxed text-slate-900 shadow-sm ring-1 ring-white/70 backdrop-blur-md xl:text-lg" style={delay(340)}>
          Connecting people, resources and real-time information to support communities during disasters.
        </p>

        <ul className="mt-8 grid max-w-2xl grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, text, tint }, i) => (
            <li key={title} className="ss-in" style={delay(460 + i * 120)}>
              <div
                className="ss-float h-full rounded-2xl bg-white/90 p-4 shadow-lg shadow-slate-900/10 ring-1 ring-white transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl"
                style={delay(i * 700)}
              >
                <span className={`mb-3 grid h-12 w-12 place-items-center rounded-xl ${tint}`}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <p className="text-sm font-bold leading-tight text-[#0b1b3a]">{title}</p>
                <p className="mt-1 text-xs font-medium leading-snug text-slate-600">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="ss-in inline-flex items-center gap-3 self-start rounded-2xl bg-slate-900/70 px-5 py-3 text-base font-semibold leading-snug text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md" style={delay(900)}>
        <span className="h-9 w-1 rounded-full bg-gradient-to-b from-sky-300 to-orange-300" aria-hidden="true" />
        No One Faces<br />Disaster Alone.
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Page shell                                                         */
/* ------------------------------------------------------------------ */

export default function AuthPage({ recovering = false }) {
  const [state, setState] = useState({ view: 'login' })
  const go = (view, extra = {}) => setState({ view, ...extra })
  const view = recovering ? 'recovery' : state.view

  return (
    <div className="relative isolate min-h-[100dvh] overflow-x-hidden bg-[#bcd9ef] font-['Plus_Jakarta_Sans',ui-sans-serif,system-ui,sans-serif]">
      <style>{THEME_CSS}</style>
      {/* If your app already loads this webfont, you can delete the three links below */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <SceneBackdrop />

      <div className="relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-[90rem] grid-cols-1 items-center gap-8 px-4 py-6 sm:px-8 sm:py-10 lg:grid-cols-[1.15fr_.85fr] lg:gap-12 lg:px-12 lg:py-8">
        <MarketingPanel />

        <section className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-[28rem] lg:justify-self-end">
          <div className="ss-card relative overflow-hidden rounded-3xl border border-white bg-white shadow-[0_30px_90px_-20px_rgba(8,40,80,.6)] ring-1 ring-slate-900/10">
            {/* accent bar */}
            <div className="ss-grad-text h-1.5 w-full bg-gradient-to-r from-blue-700 via-sky-400 to-orange-400" aria-hidden="true" />
            <div className="p-5 sm:p-8">
              <div className="mb-5 flex justify-center">
                <BrandLogo size="medium" />
              </div>

              <div className="mb-6 text-center">
                <h1 className="text-2xl font-extrabold tracking-tight text-[#0b1b3a] sm:text-[1.7rem]">{TITLES[view]}</h1>
                <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-relaxed text-slate-700">{SUBTITLES[view]}</p>
              </div>

              <div key={view} className="ss-view">
                {view === 'login' && <LoginView key="l" go={go} email={state.email} notice={state.notice} />}
                {view === 'register' && <RegisterView key="r" go={go} />}
                {view === 'forgot' && <ForgotView key="f" go={go} email={state.email} />}
                {view === 'recovery' && <RecoveryView key="rec" />}
              </div>
            </div>
          </div>

          <p className="ss-in mx-auto mt-5 flex w-fit items-center justify-center gap-1.5 rounded-full bg-white/85 px-4 py-2 text-center text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-white backdrop-blur-md lg:bg-slate-900/60 lg:text-white lg:ring-white/10" style={delay(600)}>
            <ShieldCheck size={13} aria-hidden="true" /> Encrypted &amp; secure · SankatSaathi Disaster Response
          </p>
          <p className="ss-in mx-auto mt-3 w-fit rounded-full bg-slate-900/70 px-4 py-2 text-center text-sm font-semibold text-white backdrop-blur-md lg:hidden" style={delay(700)}>
            No One Faces Disaster Alone.
          </p>
        </section>
      </div>
    </div>
  )
}