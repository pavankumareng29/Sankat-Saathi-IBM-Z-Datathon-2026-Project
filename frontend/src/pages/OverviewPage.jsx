import { AlertTriangle, ArrowRight, ChevronRight, ClipboardList, Droplets, Route, Truck, Users } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Panel from '../components/Panel'

/* tone + priority styling — data-driven, with safe fallbacks */
const TONES = {
  amber:   { icon: Droplets,      chip: 'bg-amber-100/80 text-amber-700', dot: 'bg-amber-400' },
  emerald: { icon: Users,         chip: 'bg-teal-100/80 text-teal-700',   dot: 'bg-teal-500' },
  rose:    { icon: AlertTriangle, chip: 'bg-rose-100/80 text-rose-700',   dot: 'bg-rose-400' },
  sky:     { icon: Truck,         chip: 'bg-sky-100/80 text-sky-700',     dot: 'bg-sky-400' },
}

const PRIORITY = {
  Critical: { pill: 'bg-rose-50 text-rose-700 ring-rose-200/70',    dot: 'bg-rose-400' },
  High:     { pill: 'bg-amber-50 text-amber-800 ring-amber-200/70', dot: 'bg-amber-400' },
  Medium:   { pill: 'bg-stone-100 text-stone-600 ring-stone-300/60', dot: 'bg-stone-400' },
}

const partOfDay = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function OverviewPage({ data, goTo }) {
  return (
    <>
      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        .rise { animation: riseIn .55s cubic-bezier(.22,.68,.35,1) both }
        @media (prefers-reduced-motion: reduce) { .rise { animation: none } }
      `}</style>

      <PageHeader
        title={`${partOfDay()}, Command.`}
        subtitle="Live status across requests, allocation and field logistics."
      >
        <button
          onClick={() => goTo('Requests')}
          className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_-12px_rgba(28,25,23,0.55)] transition hover:bg-stone-700 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
        >
          <ClipboardList size={16} /> Create relief request
        </button>
      </PageHeader>

      {/* --- stat cards --- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((s, i) => {
          const tone = TONES[s.tone] || TONES.sky
          const Icon = tone.icon
          return (
            <article
              key={s.label}
              style={{ animationDelay: `${i * 70}ms` }}
              className="rise rounded-2xl border border-stone-200/70 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-[0_14px_28px_-18px_rgba(28,25,23,0.35)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="pt-1 text-[11px] font-bold uppercase tracking-[0.09em] text-stone-600">{s.label}</span>
                <span className={`rounded-lg p-2 ${tone.chip}`}><Icon size={17} strokeWidth={2.2} /></span>
              </div>
              <b className="mt-3 block text-[28px] leading-none tracking-tight text-stone-900 tabular-nums">{s.value}</b>
              <span className="mt-3 flex items-center gap-1.5 text-xs font-medium text-stone-600">
                <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                {s.change}
              </span>
            </article>
          )
        })}
      </div>

      {/* --- requests + allocation --- */}
      <div className="rise mt-7 grid gap-6 xl:grid-cols-[1.35fr_.85fr]" style={{ animationDelay: '140ms' }}>
        <Panel title="Priority requests">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                  <th className="pb-3 font-semibold">Area</th>
                  <th className="pb-3 font-semibold">Need</th>
                  <th className="pb-3 font-semibold">People</th>
                  <th className="pb-3 font-semibold">Priority</th>
                </tr>
              </thead>
              <tbody>
                {data.requests.map((r) => {
                  const p = PRIORITY[r.priority] || PRIORITY.Medium
                  return (
                    <tr key={r.id} className="border-b border-stone-100 transition-colors last:border-0 hover:bg-stone-50/70">
                      <td className="py-3.5 pr-4">
                        <b className="font-semibold text-stone-900">{r.area}</b>
                        <small className="mt-0.5 block font-mono text-[11px] text-stone-400">{r.id}</small>
                      </td>
                      <td className="pr-4 text-stone-600">{r.need}</td>
                      <td className="pr-4 tabular-nums text-stone-600">{r.people}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${p.pill}`}>
                          <span className={`h-1 w-1 rounded-full ${p.dot}`} />
                          {r.priority}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => goTo('Requests')}
            className="group mt-4 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-teal-800 transition-colors hover:text-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
          >
            View all requests
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </Panel>

        <Panel title="Allocation intelligence">
          <div className="space-y-3">
            {data.allocations.map((a) => (
              <article
                key={a.zone}
                className="rounded-xl border border-stone-200/70 bg-stone-50/60 p-4 transition-colors hover:border-stone-300 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-3">
                  <b className="text-sm font-semibold text-stone-900">{a.zone}</b>
                  <span className="font-mono text-xs font-semibold text-teal-700">{a.confidence}% match</span>
                </div>
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-stone-200/80">
                  <div
                    className="h-full rounded-full bg-teal-600/80 transition-[width] duration-500"
                    style={{ width: `${Math.max(0, Math.min(100, a.confidence))}%` }}
                  />
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-stone-600">{a.action}</p>
              </article>
            ))}
          </div>
          <button
            onClick={() => goTo('Allocation AI')}
            className="group mt-4 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-teal-800 transition-colors hover:text-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
          >
            Review allocations
            <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </Panel>
      </div>

      {/* --- route banner --- */}
      <section
        className="rise relative mt-7 overflow-hidden rounded-2xl bg-stone-900 p-6 text-white sm:p-7"
        style={{ animationDelay: '240ms' }}
      >
        <span
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />
        <svg aria-hidden viewBox="0 0 340 160" fill="none" className="absolute bottom-0 right-0 hidden h-full w-[320px] text-teal-300/60 md:block">
          <path d="M-12 132 C 58 122, 92 38, 168 62 S 296 26, 352 58" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 7" />
          <circle cx="168" cy="62" r="3.5" fill="currentColor" />
          <circle cx="168" cy="62" r="9" stroke="currentColor" strokeOpacity="0.45" />
        </svg>
        <div className="relative">
          <div className="flex items-center gap-2 text-teal-300">
            <Route size={16} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Route intelligence</span>
          </div>
          <p className="mt-3 max-w-xl text-xl font-semibold leading-snug tracking-tight">
            Today&rsquo;s routes already avoid <span className="text-teal-300">9 road closures</span> across the network.
          </p>
          <button
            onClick={() => goTo('Deliveries')}
            className="group mt-5 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-white/15 transition hover:bg-white/20 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
          >
            Open delivery tracking
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>
    </>
  )
}