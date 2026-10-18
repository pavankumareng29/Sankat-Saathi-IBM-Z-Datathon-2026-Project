import { useState } from 'react'
import {
  Check, Droplets, HeartPulse, HelpCircle, LoaderCircle, LocateFixed, MapPin, Minus, Pill,
  Package, Phone, Plus, Send, Stethoscope, Syringe, User, X, AlertCircle,
} from 'lucide-react'

const CATEGORIES = [
  { id: 'Medical', icon: HeartPulse, hint: 'Medicines, first aid', grad: 'from-rose-500 to-pink-500', tone: 'bg-rose-50 text-rose-600', soft: 'bg-rose-50 border-rose-200', ring: 'ring-rose-300' },
  { id: 'Food', icon: Package, hint: 'Ration kits, essentials', grad: 'from-amber-500 to-orange-500', tone: 'bg-amber-50 text-amber-700', soft: 'bg-amber-50 border-amber-200', ring: 'ring-amber-300' },
  { id: 'Water', icon: Droplets, hint: 'Drinking water', grad: 'from-sky-500 to-blue-600', tone: 'bg-sky-50 text-sky-600', soft: 'bg-sky-50 border-sky-200', ring: 'ring-sky-300' },
  { id: 'Other', icon: HelpCircle, hint: 'Anything else', grad: 'from-slate-500 to-slate-700', tone: 'bg-slate-100 text-slate-600', soft: 'bg-slate-50 border-slate-200', ring: 'ring-slate-300' },
]

const MEDICAL_OPTIONS = [
  ['Tablets / Medicines', Pill],
  ['Bandages / First Aid', Syringe],
  ['Both', Stethoscope],
  ['Other Medical Supplies', HelpCircle],
]

const DETAILS = {
  Medical: {
    label: 'Medicine / supply details (optional)',
    placeholder: 'Medicine names, tablets, bandages, first-aid items and quantities',
  },
  Food: { label: 'Food details (optional)', placeholder: 'Type of food needed and quantity' },
  Water: { label: 'Drinking water details (optional)', placeholder: 'Drinking water needed and quantity (e.g. 20 litres)' },
  Other: { label: 'Describe the assistance needed', placeholder: 'Tell us what you need' },
}

const input =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100'
const inputError = '!border-rose-500 focus:!ring-rose-100'
const initialForm = { categories: [], medicalType: '', detailsByCategory: {}, people: '', phone: '', name: '', location: '', coords: null }

const FieldError = ({ id, message }) =>
  message ? (
    <p id={id} role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-rose-600">
      <AlertCircle size={15} aria-hidden="true" /> {message}
    </p>
  ) : null

function Section({ step, title, subtitle, done, children }) {
  return (
    <section className="rise rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold transition ${done ? 'bg-emerald-500 text-white' : 'bg-sky-100 text-sky-700'}`}>
          {done ? <Check size={18} aria-hidden="true" /> : step}
        </span>
        <div>
          <h2 className="text-lg font-extrabold leading-tight text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function IconInput({ icon: Icon, error, className = '', ...props }) {
  return (
    <div className="relative">
      <Icon size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input {...props} className={`${input} pl-11 ${error ? inputError : ''} ${className}`} />
    </div>
  )
}

export default function RequestAssistancePage({ addRequest, notify, goTo }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }))
    setErrors((e) => {
      const next = { ...e }
      Object.keys(patch).forEach((k) => delete next[k])
      if ('detailsByCategory' in patch) delete next.details
      return next
    })
  }

  const chooseCategory = (category) => {
    const categories = form.categories.includes(category)
      ? form.categories.filter((item) => item !== category)
      : [...form.categories, category]
    update({
      categories,
      ...(category === 'Medical' && !categories.includes('Medical') ? { medicalType: '' } : {}),
    })
    setErrors((current) => {
      const next = { ...current }
      delete next.category
      if (category === 'Medical') delete next.medicalType
      if (category === 'Other') delete next.details
      return next
    })
  }

  const changePeople = (delta) => {
    const next = Math.max(1, (Number(form.people) || 0) + delta)
    update({ people: String(next) })
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return notify('Location is not supported on this device. Please type it.')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        update({ location: `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, coords: { lat: latitude, lng: longitude } })
        setLocating(false)
      },
      () => { setLocating(false); notify('Could not get location. Please type it.') },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const validate = () => {
    const e = {}
    if (!form.categories.length) e.category = 'Please choose at least one type of help you need.'
    if (form.categories.includes('Medical') && !form.medicalType) e.medicalType = 'Please choose the medical help you need.'
    if (form.categories.includes('Other') && !form.detailsByCategory.Other?.trim()) e.details = 'Please describe the assistance you need.'
    const people = Number(form.people)
    if (!form.people || !Number.isInteger(people) || people < 1) e.people = 'Enter how many people are affected (1 or more).'
    if (!form.location.trim()) e.location = 'Please add your location or tap "Use my current location".'
    if (form.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a phone number with at least 10 digits.'
    return e
  }

  const submit = async (ev) => {
    ev.preventDefault()
    setSubmitError('')
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) {
      document.getElementById(`field-${Object.keys(found)[0]}`)?.focus?.()
      return
    }

    const payload = {
      needs: form.categories.map((category) => ({
        category,
        medicalType: category === 'Medical' ? form.medicalType : null,
        details: form.detailsByCategory[category]?.trim() || null,
      })),
      peopleAffected: Number(form.people),
      location: form.location.trim(),
      coords: form.coords,
      phone: form.phone.trim(),
      name: form.name.trim(),
    }

    setSubmitting(true)
    try {
      const id = await addRequest(payload) // resolves only when the request is actually saved
      setForm(initialForm)
      notify(`Request ${id} was saved. A responder will contact you.`)
      goTo('My Requests')
    } catch (err) {
      setSubmitError(err?.message || 'We could not send your request. Please try again, or call the emergency hotline 108.')
    } finally {
      setSubmitting(false)
    }
  }

  // Progress (display only)
  const step1 = form.categories.length > 0 && (!form.categories.includes('Medical') || !!form.medicalType)
  const step2 = Number(form.people) >= 1 && !!form.location.trim()
  const step3 = form.phone.replace(/\D/g, '').length >= 10
  const doneCount = [step1, step2, step3].filter(Boolean).length

  const summary = step1
    ? `${form.categories.join(', ')}${form.medicalType ? ` · ${form.medicalType}` : ''}${form.people ? ` · ${form.people} ${Number(form.people) === 1 ? 'person' : 'people'}` : ''}`
    : 'Choose what you need to get started'
  const selectedCategories = CATEGORIES.filter(({ id }) => form.categories.includes(id))

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-5xl space-y-4">
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        .rise { animation: rise .35s ease-out both }
        @media (prefers-reduced-motion: reduce) { .rise { animation: none } }
      `}</style>

      <header className="rise">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Citizen support</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Request Assistance</h1>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">Tell us what you need so help can reach you.</p>
      </header>

      {/* Progress header */}
      <div className="rise relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-800 via-blue-700 to-sky-700 p-4 text-white shadow-lg shadow-sky-900/15 sm:p-5">
        <div className="pointer-events-none absolute -right-8 -top-20 h-52 w-52 rounded-full border-[24px] border-white/5" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide">
              <AlertCircle size={18} aria-hidden="true" /> Request emergency help
            </p>
            <p className="mt-1 text-xs text-sky-100">Three quick steps. Only what is marked is required.</p>
          </div>
          <a href="tel:108" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-950/25 px-3 py-2 text-xs font-bold ring-1 ring-white/15 transition hover:bg-slate-950/40 sm:text-sm">
            <Phone size={15} aria-hidden="true" /> For urgent danger, call 108
          </a>
        </div>
        <div className="relative mt-5" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={doneCount} aria-label="Form progress">
          <div className="absolute left-4 right-4 top-3.5 h-0.5 bg-white/25 sm:left-8 sm:right-8" />
          <div className="absolute left-4 top-3.5 h-0.5 bg-cyan-200 transition-all duration-500 sm:left-8" style={{ width: `calc((100% - 4rem) * ${doneCount / 3})` }} />
          <div className="relative grid grid-cols-3 gap-2">
            {[
              ['1', 'What you need', step1],
              ['2', 'People & location', step2],
              ['3', 'Send request', step3],
            ].map(([step, label, complete]) => (
              <div key={step} className="flex flex-col items-center gap-1.5 text-center">
                <span className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-extrabold ${complete ? 'border-cyan-100 bg-cyan-100 text-sky-900' : 'border-white/50 bg-sky-800 text-white'}`}>
                  {complete ? <Check size={14} aria-hidden="true" /> : step}
                </span>
                <span className="text-[10px] font-semibold leading-tight text-sky-50 sm:text-xs">{label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[10px] font-semibold text-sky-100">{doneCount} of 3 steps complete</p>
        </div>
      </div>

      {/* Step 1 */}
      <Section step="1" title="What do you need?" subtitle="Select all that apply" done={step1}>
        <fieldset aria-describedby={errors.category ? 'err-category' : undefined}>
          <legend className="sr-only">Type of assistance</legend>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CATEGORIES.map(({ id, icon: Icon, hint, tone, soft, ring }) => {
              const on = form.categories.includes(id)
              return (
                <label
                  key={id}
                  className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition focus-within:ring-4 ${ring} ${
                    on ? `${soft} shadow-sm ring-2` : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    id={id === 'Medical' ? 'field-category' : undefined}
                    type="checkbox" name="category" value={id} checked={on}
                    onChange={() => chooseCategory(id)} className="sr-only"
                  />
                  {on && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white"><Check size={14} aria-hidden="true" /></span>}
                  <span className={`grid h-12 w-12 place-items-center rounded-xl ${tone}`}><Icon size={25} aria-hidden="true" /></span>
                  <span className="text-base font-extrabold text-slate-900">{id}</span>
                  <span className="text-xs text-slate-500">{hint}</span>
                </label>
              )
            })}
          </div>
        </fieldset>
        <FieldError id="err-category" message={errors.category} />

        {form.categories.includes('Medical') && (
          <fieldset className="rise mt-6" aria-describedby={errors.medicalType ? 'err-medical' : undefined}>
            <legend className="mb-2.5 text-sm font-bold text-slate-700">What kind of medical help?</legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {MEDICAL_OPTIONS.map(([opt, Icon], i) => {
                const on = form.medicalType === opt
                return (
                  <label key={opt} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-sm font-semibold transition focus-within:ring-4 focus-within:ring-rose-200 ${on ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                    <input
                      id={i === 0 ? 'field-medicalType' : undefined}
                      type="radio" name="medicalType" value={opt} checked={on}
                      onChange={() => update({ medicalType: opt })} className="sr-only"
                    />
                    <Icon size={20} aria-hidden="true" className={on ? 'text-rose-600' : 'text-slate-400'} />
                    <span className="flex-1">{opt}</span>
                    {on && <Check size={18} className="text-rose-600" aria-hidden="true" />}
                  </label>
                )
              })}
            </div>
            <FieldError id="err-medical" message={errors.medicalType} />
          </fieldset>
        )}

        {form.categories.filter((category) => DETAILS[category]).map((category) => {
          const detailsCfg = DETAILS[category]
          const value = form.detailsByCategory[category] || ''
          const fieldId = category === 'Other' ? 'field-details' : `field-details-${category.toLowerCase()}`
          return (
            <div key={category} className="rise mt-6">
              <label htmlFor={fieldId} className="mb-1.5 block text-sm font-bold text-slate-700">{detailsCfg.label}</label>
              <textarea
                id={fieldId} rows={3} maxLength={500} value={value} placeholder={detailsCfg.placeholder}
                aria-invalid={category === 'Other' && !!errors.details}
                aria-describedby={category === 'Other' && errors.details ? 'err-details' : undefined}
                onChange={(e) => update({ detailsByCategory: { ...form.detailsByCategory, [category]: e.target.value } })}
                className={`${input} resize-none ${category === 'Other' && errors.details ? inputError : ''}`}
              />
              <div className="flex items-start justify-between gap-3">
                {category === 'Other' && <FieldError id="err-details" message={errors.details} />}
                <span className="ml-auto mt-1.5 text-xs text-slate-400">{value.length}/500</span>
              </div>
            </div>
          )
        })}
      </Section>

      {/* Step 2 */}
      <Section step="2" title="How many people, and where?" subtitle="So responders can find you" done={step2}>
        <label htmlFor="field-people" className="mb-2 block text-sm font-bold text-slate-700">Number of people affected</label>
        <div className="flex max-w-sm items-stretch gap-2">
          <button type="button" onClick={() => changePeople(-1)} aria-label="Decrease people" className="grid w-12 place-items-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 active:scale-95">
            <Minus size={18} />
          </button>
          <input
            id="field-people" type="number" inputMode="numeric" min="1" step="1" placeholder="e.g. 4"
            value={form.people} aria-invalid={!!errors.people} aria-describedby={errors.people ? 'err-people' : undefined}
            onChange={(e) => update({ people: e.target.value })}
            className={`${input} text-center text-lg font-extrabold ${errors.people ? inputError : ''}`}
          />
          <button type="button" onClick={() => changePeople(1)} aria-label="Increase people" className="grid w-12 place-items-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 active:scale-95">
            <Plus size={18} />
          </button>
        </div>
        <FieldError id="err-people" message={errors.people} />

        <div className="mt-5">
          <p className="mb-2 text-sm font-bold text-slate-700">Your location</p>
          <button
            type="button" onClick={useMyLocation} disabled={locating}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 font-bold text-sky-800 transition hover:bg-sky-100 active:scale-[0.99] disabled:opacity-80"
          >
            {locating
              ? <><LoaderCircle className="animate-spin" size={20} aria-hidden="true" /> Finding location…</>
              : <><LocateFixed size={20} aria-hidden="true" /> Use my current location</>}
          </button>

          {form.coords && (
            <div className="rise mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
              <span className="flex items-center gap-2"><Check size={16} aria-hidden="true" /> GPS location captured</span>
              <button type="button" onClick={() => update({ location: '', coords: null })} aria-label="Clear location" className="rounded-lg p-1 hover:bg-emerald-100"><X size={16} /></button>
            </div>
          )}

          <div className="my-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> or type it <span className="h-px flex-1 bg-slate-200" />
          </div>
          <label htmlFor="field-location" className="sr-only">Location</label>
          <IconInput
            icon={MapPin} id="field-location" placeholder="Area, street or landmark" value={form.location} error={errors.location}
            aria-invalid={!!errors.location} aria-describedby={errors.location ? 'err-location' : undefined}
            onChange={(e) => update({ location: e.target.value, coords: null })}
          />
          <FieldError id="err-location" message={errors.location} />
        </div>
      </Section>

      {/* Step 3 */}
      <Section step="3" title="How can we reach you?" subtitle="A responder may call to confirm" done={step3}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="field-phone" className="mb-1.5 block text-sm font-bold text-slate-700">Phone number <span className="text-rose-500">*</span></label>
            <IconInput
              icon={Phone} id="field-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number"
              value={form.phone} error={errors.phone} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'err-phone' : undefined}
              onChange={(e) => update({ phone: e.target.value })}
            />
            <FieldError id="err-phone" message={errors.phone} />
          </div>
          <div>
            <label htmlFor="field-name" className="mb-1.5 block text-sm font-bold text-slate-700">Name <span className="font-normal text-slate-400">(optional)</span></label>
            <IconInput icon={User} id="field-name" autoComplete="name" placeholder="Your name" value={form.name} onChange={(e) => update({ name: e.target.value })} />
          </div>
        </div>
      </Section>

      {submitError && (
        <div role="alert" className="rise flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> {submitError}
        </div>
      )}

      {/* Submit bar */}
      <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:p-4">
        <div className="mb-3 flex items-center gap-2 px-1 text-sm">
          {selectedCategories.map(({ id, icon: Icon, grad }) => (
            <span key={id} className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white ${grad}`}>
              <Icon size={15} aria-hidden="true" />
            </span>
          ))}
          <p className="truncate font-semibold text-slate-700">{summary}</p>
        </div>
        <button
          type="submit" disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 py-3.5 text-base font-extrabold text-white shadow-md shadow-rose-200 transition hover:from-red-700 hover:to-rose-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting
            ? <><LoaderCircle className="animate-spin" size={22} aria-hidden="true" /> SENDING…</>
            : <><Send size={20} aria-hidden="true" /> SEND HELP REQUEST</>}
        </button>
        <p className="mt-2 text-center text-xs text-slate-500">
          Life in immediate danger? Call <a href="tel:108" className="font-bold text-rose-600 underline">108</a> now.
        </p>
      </div>
    </form>
  )
}