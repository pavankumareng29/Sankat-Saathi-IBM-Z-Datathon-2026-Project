export function AdminPageHeader({ title, subtitle, action }) {
  return (
    <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 text-sm font-semibold text-sky-700">SankatSaathi · Admin workspace</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-slate-500">{subtitle}</p>
      </div>
      {action}
    </header>
  )
}

export function AdminMetric({ label, value, detail, tone = 'sky' }) {
  const tones = {
    sky: 'bg-sky-50 text-sky-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {detail && <p className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone] || tones.sky}`}>{detail}</p>}
    </article>
  )
}

export function AdminPanel({ title, description, children, action }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {(title || action) && (
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            {title && <h2 className="font-bold text-slate-900">{title}</h2>}
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function StatusTag({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    sky: 'bg-sky-100 text-sky-700',
  }

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>{children}</span>
}

export function DemoNotice() {
  return (
    <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Demo data is shown here. Connect this page to your API or database when the backend is ready.
    </p>
  )
}

export const tableClass = 'w-full min-w-[640px] text-left text-sm'
export const tableHeadClass = 'border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400'
export const tableRowClass = 'border-b border-slate-100 last:border-0'
