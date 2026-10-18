export default function PageHeader({ title, subtitle, children }) {
  return (
    <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-600">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}
