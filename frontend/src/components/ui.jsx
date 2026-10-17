const badgeColor = {
  Pending: 'bg-amber-100 text-amber-700',
  Assigned: 'bg-sky-100 text-sky-700',
  'On the way': 'bg-indigo-100 text-indigo-700',
  Delivered: 'bg-emerald-100 text-emerald-700',
  Open: 'bg-emerald-100 text-emerald-700',
  Full: 'bg-rose-100 text-rose-700',
}

export const Badge = ({ value }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColor[value] || 'bg-slate-100 text-slate-600'}`}>{value}</span>
)

export const Card = ({ title, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    {title && <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>}
    {children}
  </div>
)