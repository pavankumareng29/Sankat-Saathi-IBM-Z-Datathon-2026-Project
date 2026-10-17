import { useState } from 'react'
import {
  HeartPulse,
  Utensils,
  Droplets,
  HelpCircle,
  MapPin,
  LoaderCircle,
  Navigation,
  Phone,
  User,
  Users,
  Send,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  PhoneCall,
  Activity
} from 'lucide-react'

const CATEGORIES = [
  {
    id: 'Medical',
    label: 'Medical',
    subtitle: 'Doctor, medicines, first aid',
    icon: HeartPulse,
    bgActive: 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm ring-2 ring-rose-400/30',
    bgIdle: 'border-rose-100 hover:border-rose-300 hover:bg-rose-50/50 text-slate-800 bg-white',
    iconBadge: 'bg-rose-100 text-rose-600',
  },
  {
    id: 'Food',
    label: 'Food',
    subtitle: 'Cooked food, rations',
    icon: Utensils,
    bgActive: 'bg-amber-50 border-amber-500 text-amber-800 shadow-sm ring-2 ring-amber-400/30',
    bgIdle: 'border-amber-100 hover:border-amber-300 hover:bg-amber-50/50 text-slate-800 bg-white',
    iconBadge: 'bg-amber-100 text-amber-600',
  },
  {
    id: 'Water',
    label: 'Water',
    subtitle: 'Drinking water, water supply',
    icon: Droplets,
    bgActive: 'bg-sky-50 border-sky-500 text-sky-800 shadow-sm ring-2 ring-sky-400/30',
    bgIdle: 'border-sky-100 hover:border-sky-300 hover:bg-sky-50/50 text-slate-800 bg-white',
    iconBadge: 'bg-sky-100 text-sky-600',
  },
  {
    id: 'Other',
    label: 'Other',
    subtitle: 'Rescue, transport, supplies',
    icon: HelpCircle,
    bgActive: 'bg-purple-50 border-purple-500 text-purple-800 shadow-sm ring-2 ring-purple-400/30',
    bgIdle: 'border-purple-100 hover:border-purple-300 hover:bg-purple-50/50 text-slate-800 bg-white',
    iconBadge: 'bg-purple-100 text-purple-600',
  },
]

const MEDICAL_OPTIONS = [
  { id: 'Tablets / Medicines', label: 'Tablets / Medicines' },
  { id: 'Bandages / First Aid', label: 'Bandages / First Aid' },
  { id: 'Both', label: 'Both Tablets & First Aid' },
  { id: 'Other Medical Supplies', label: 'Other Medical Supplies' },
]

const DETAILS = {
  Medical: {
    label: 'Medicine & prescription details (optional)',
    placeholder: 'Specific medicines, critical conditions, bandages, or required first-aid kits…',
  },
  Food: {
    label: 'Food & ration details (optional)',
    placeholder: 'E.g., Ready-to-eat packets, dry rations, baby food, vegetarian requirements…',
  },
  Water: {
    label: 'Drinking water details (optional)',
    placeholder: 'Estimated quantity needed (e.g., 20 litres, packaged drinking bottles)…',
  },
  Other: {
    label: 'Describe the assistance needed *',
    placeholder: 'Explain your emergency in detail (e.g., trapped by flooding, elderly evacuation)…',
  },
}

const initialForm = {
  category: '',
  medicalType: '',
  details: '',
  people: '',
  phone: '',
  name: '',
  location: '',
  coords: null,
}

const FieldError = ({ id, message }) =>
  message ? (
    <p id={id} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
      <AlertCircle size={14} className="shrink-0" />
      {message}
    </p>
  ) : null

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
      if ('category' in patch) {
        delete next.medicalType
        delete next.details
      }
      return next
    })
  }

  const chooseCategory = (category) => {
    if (category === form.category) return
    update({ category, medicalType: '', details: '' })
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      return notify('Location is not supported on this device. Please type it.')
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        update({
          location: `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          coords: { lat: latitude, lng: longitude },
        })
        setLocating(false)
      },
      () => {
        setLocating(false)
        notify('Could not get location. Please type it.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const validate = () => {
    const e = {}
    if (!form.category) e.category = 'Please choose the type of help you need.'
    if (form.category === 'Medical' && !form.medicalType) e.medicalType = 'Please choose the medical help you need.'
    if (form.category === 'Other' && !form.details.trim()) e.details = 'Please describe the assistance you need.'
    const people = Number(form.people)
    if (!form.people || !Number.isInteger(people) || people < 1) e.people = 'Enter how many people are affected (1 or more).'
    if (!form.location.trim()) e.location = 'Please add your location or tap "Use my current location".'
    if (form.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid phone number with at least 10 digits.'
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
      category: form.category,
      medicalType: form.category === 'Medical' ? form.medicalType : null,
      details: form.details.trim(),
      peopleAffected: Number(form.people),
      location: form.location.trim(),
      coords: form.coords,
      phone: form.phone.trim(),
      name: form.name.trim(),
    }

    setSubmitting(true)
    try {
      const id = await addRequest(payload)
      setForm(initialForm)
      notify(`Request ${id} was saved. A responder will contact you.`)
      goTo('My Requests')
    } catch (err) {
      setSubmitError(err?.message || 'We could not send your request. Please try again, or call the emergency hotline 108.')
    } finally {
      setSubmitting(false)
    }
  }

  const detailsCfg = DETAILS[form.category]

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-12">
      {/* Top Hero / Banner matching reference */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-r from-sky-900 via-[#103d61] to-[#0c2f4d] p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-200 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              Citizen Portal • Live Coordination
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl">
              Request Assistance
            </h1>
            <p className="text-sm font-medium text-sky-100/90 sm:text-base">
              Tell us what you need and we&apos;ll connect you with nearby relief teams, emergency supplies, and first responders.
            </p>
          </div>

          {/* Quick Location / Helpline Badge */}
          <div className="flex flex-col gap-2.5 sm:flex-row md:flex-col md:items-end">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500 text-white shadow-sm">
                <Navigation size={18} />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-semibold uppercase text-sky-200">Current Status</p>
                <p className="text-xs font-bold text-white">
                  {form.coords ? 'GPS Location Locked' : 'Ready for Request'}
                </p>
              </div>
            </div>

            <a
              href="tel:108"
              className="group flex items-center justify-between gap-3 rounded-2xl border border-rose-400/40 bg-rose-600/20 px-4 py-2.5 text-rose-100 transition hover:bg-rose-600/30"
            >
              <div className="flex items-center gap-2">
                <PhoneCall size={16} className="text-rose-400 group-hover:animate-pulse" />
                <span className="text-xs font-bold">Emergency Hotline:</span>
              </div>
              <span className="rounded-lg bg-rose-500 px-2.5 py-0.5 text-xs font-black text-white">108</span>
            </a>
          </div>
        </div>

        {/* Subtle decorative background watermarks */}
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-10 left-1/3 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl" />
      </div>

      <form onSubmit={submit} noValidate className="space-y-6">
        {/* Step 1: What do you need? */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:shadow-md sm:p-8">
          <div className="mb-6 flex items-start gap-3.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-extrabold text-white shadow-sm">
              1
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">What do you need?</h2>
              <p className="text-xs font-medium text-slate-500 sm:text-sm">Select the primary type of emergency assistance required.</p>
            </div>
          </div>

          <fieldset aria-describedby={errors.category ? 'err-category' : undefined}>
            <legend className="sr-only">Type of assistance</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CATEGORIES.map(({ id, label, subtitle, icon: Icon, bgActive, bgIdle, iconBadge }) => {
                const isSelected = form.category === id
                return (
                  <label
                    key={id}
                    className={`group relative flex cursor-pointer items-center justify-between rounded-2xl border-2 p-4 transition-all duration-150 ${
                      isSelected ? bgActive : bgIdle
                    }`}
                  >
                    <input
                      id={id === 'Medical' ? 'field-category' : undefined}
                      type="radio"
                      name="category"
                      value={id}
                      checked={isSelected}
                      onChange={() => chooseCategory(id)}
                      className="sr-only"
                    />

                    <div className="flex items-center gap-3.5">
                      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${iconBadge} transition-transform group-hover:scale-105`}>
                        <Icon size={24} />
                      </div>
                      <div className="text-left">
                        <span className="block text-base font-bold text-slate-900">{label}</span>
                        <span className="block text-[11px] font-medium text-slate-500">{subtitle}</span>
                      </div>
                    </div>

                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${isSelected ? 'bg-sky-600 text-white' : 'text-slate-300 group-hover:text-slate-500'}`}>
                      {isSelected ? <CheckCircle2 size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </label>
                )
              })}
            </div>
          </fieldset>
          <FieldError id="err-category" message={errors.category} />

          {/* Medical Sub-category Selection */}
          {form.category === 'Medical' && (
            <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/40 p-4 sm:p-5">
              <fieldset aria-describedby={errors.medicalType ? 'err-medical' : undefined}>
                <legend className="mb-3 text-sm font-bold text-slate-800">
                  What kind of medical help is required?
                </legend>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {MEDICAL_OPTIONS.map((opt, i) => {
                    const isMedSelected = form.medicalType === opt.id
                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                          isMedSelected
                            ? 'border-rose-500 bg-rose-100/70 text-rose-900 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50/50'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <input
                            id={i === 0 ? 'field-medicalType' : undefined}
                            type="radio"
                            name="medicalType"
                            value={opt.id}
                            checked={isMedSelected}
                            onChange={() => update({ medicalType: opt.id })}
                            className="h-4 w-4 accent-rose-600"
                          />
                          {opt.label}
                        </span>
                      </label>
                    )
                  })}
                </div>
                <FieldError id="err-medical" message={errors.medicalType} />
              </fieldset>
            </div>
          )}

          {/* Details Textarea */}
          {detailsCfg && (
            <div className="mt-5">
              <label htmlFor="field-details" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                {detailsCfg.label}
              </label>
              <textarea
                id="field-details"
                rows={3}
                value={form.details}
                placeholder={detailsCfg.placeholder}
                aria-invalid={!!errors.details}
                aria-describedby={errors.details ? 'err-details' : undefined}
                onChange={(e) => update({ details: e.target.value })}
                className={`w-full rounded-2xl border bg-slate-50/40 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 ${
                  errors.details ? 'border-rose-500 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-400/20' : 'border-slate-200'
                }`}
              />
              <FieldError id="err-details" message={errors.details} />
            </div>
          )}
        </div>

        {/* Step 2: How many people, and where? */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:shadow-md sm:p-8">
          <div className="mb-6 flex items-start gap-3.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-extrabold text-white shadow-sm">
              2
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">How many people, and where?</h2>
              <p className="text-xs font-medium text-slate-500 sm:text-sm">Provide details so responders can allocate right-sized supplies.</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Number of people affected */}
            <div>
              <label htmlFor="field-people" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Number of people affected *
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <Users size={18} />
                </div>
                <input
                  id="field-people"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  placeholder="e.g. 4"
                  value={form.people}
                  aria-invalid={!!errors.people}
                  aria-describedby={errors.people ? 'err-people' : undefined}
                  onChange={(e) => update({ people: e.target.value })}
                  className={`w-full rounded-2xl border bg-slate-50/40 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 ${
                    errors.people ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
              </div>
              <FieldError id="err-people" message={errors.people} />
            </div>

            {/* Location Section */}
            <div className="space-y-3 pt-2">
              <label htmlFor="field-location" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Location Details *
              </label>

              {/* High-visibility Action Button for GPS */}
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 active:scale-[0.99] disabled:opacity-70"
              >
                {locating ? (
                  <LoaderCircle className="animate-spin text-white" size={18} />
                ) : (
                  <MapPin size={18} className="text-sky-200 transition-transform group-hover:scale-110" />
                )}
                <span>{locating ? 'Detecting your GPS coordinates…' : 'Use my current location'}</span>
              </button>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <Navigation size={18} />
                </div>
                <input
                  id="field-location"
                  placeholder="…or type your area, building landmark, or street name"
                  value={form.location}
                  aria-invalid={!!errors.location}
                  aria-describedby={errors.location ? 'err-location' : undefined}
                  onChange={(e) => update({ location: e.target.value, coords: null })}
                  className={`w-full rounded-2xl border bg-slate-50/40 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 ${
                    errors.location ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
              </div>
              <FieldError id="err-location" message={errors.location} />
            </div>
          </div>
        </div>

        {/* Step 3: How can we reach you? */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:shadow-md sm:p-8">
          <div className="mb-6 flex items-start gap-3.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-extrabold text-white shadow-sm">
              3
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">How can we reach you?</h2>
              <p className="text-xs font-medium text-slate-500 sm:text-sm">Rescue teams will reach out directly through this contact number.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="field-phone" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Phone number *
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <Phone size={18} />
                </div>
                <input
                  id="field-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? 'err-phone' : undefined}
                  onChange={(e) => update({ phone: e.target.value })}
                  className={`w-full rounded-2xl border bg-slate-50/40 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 ${
                    errors.phone ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
              </div>
              <FieldError id="err-phone" message={errors.phone} />
            </div>

            <div>
              <label htmlFor="field-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Your name <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <User size={18} />
                </div>
                <input
                  id="field-name"
                  autoComplete="name"
                  placeholder="Contact person name"
                  value={form.name}
                  onChange={(e) => update({ name: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/40 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {submitError && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 shadow-sm"
          >
            <ShieldAlert size={20} className="shrink-0 text-rose-600" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Submit Action */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-sky-600 py-4 text-base font-black tracking-wide text-white shadow-lg shadow-sky-600/25 transition-all hover:bg-sky-700 hover:shadow-xl active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-75 sm:py-5 sm:text-lg"
          >
            {submitting ? (
              <>
                <LoaderCircle className="animate-spin" size={22} aria-hidden="true" />
                TRANSMITTING REQUEST…
              </>
            ) : (
              <>
                <Send size={20} aria-hidden="true" />
                Submit Request
              </>
            )}
          </button>
          <p className="mt-2.5 text-center text-xs font-medium text-slate-400">
            For critical life-threatening situations, dial <a href="tel:108" className="font-bold text-rose-600 underline">108</a> immediately.
          </p>
        </div>
      </form>
    </div>
  )
}