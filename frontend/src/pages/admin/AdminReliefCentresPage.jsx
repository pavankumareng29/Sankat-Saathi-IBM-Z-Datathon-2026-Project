import { useCallback, useEffect, useMemo, useState } from 'react'
import { LoaderCircle, MapPin, RefreshCw, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'
import { AdminMetric, AdminPageHeader, AdminPanel, StatusTag, tableClass, tableHeadClass, tableRowClass } from './AdminComponents'

const EMPTY_FORM = { name: '', area: '', address: '', phone: '', capacity: '', occupied: '', latitude: '', longitude: '' }
const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100'

const locationDetails = (address = {}) => {
  const locality = address.city || address.town || address.village || address.municipality
    || address.county || address.state_district || address.state || ''
  const area = [...new Set([locality, address.state, address.country].filter(Boolean))].join(', ')
  return { locality, area: (area || address.country || '').slice(0, 200) }
}

const formatCentre = (row) => ({
  ...row,
  status: row.occupied >= row.capacity ? 'full' : row.status,
})

export default function AdminReliefCentresPage() {
  const { user } = useAuth()
  const [centres, setCentres] = useState([])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState([])
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [searchingPlaces, setSearchingPlaces] = useState(false)
  const [placeSearchError, setPlaceSearchError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadCentres = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase.from('relief_centres')
      .select('id, name, area, address, phone, latitude, longitude, capacity, occupied, status, created_at')
      .order('created_at', { ascending: false })
    if (loadError) setError(`Could not load relief centres from Supabase: ${loadError.message}`)
    else setCentres((data || []).map(formatCentre))
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    loadCentres()
  }, [loadCentres])

  useEffect(() => {
    if (placeQuery.trim().length < 3 || selectedPlace?.displayName === placeQuery) {
      setPlaceResults([])
      setSearchingPlaces(false)
      setPlaceSearchError('')
      return undefined
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setSearchingPlaces(true)
      setPlaceSearchError('')
      try {
        const params = new URLSearchParams({
          q: placeQuery.trim(),
          format: 'jsonv2',
          addressdetails: '1',
          limit: '5',
          'accept-language': 'en',
        })
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) throw new Error(`Place search failed (${response.status}). Please try again.`)
        const results = await response.json()
        if (!Array.isArray(results)) throw new Error('Place search returned an unexpected response. Please try again.')
        setPlaceResults(results.map((result) => {
          const details = locationDetails(result.address)
          return {
            id: result.place_id,
            name: result.name || details.locality || result.display_name.split(',')[0],
            displayName: result.display_name,
            area: details.area,
            lat: Number(result.lat),
            lng: Number(result.lon),
          }
        }).filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng)))
      } catch (searchError) {
        if (searchError.name !== 'AbortError') {
          setPlaceResults([])
          setPlaceSearchError(searchError.message || 'Could not search for that place.')
        }
      } finally {
        if (!controller.signal.aborted) setSearchingPlaces(false)
      }
    }, 1100)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [placeQuery, selectedPlace])

  const filteredCentres = useMemo(() => {
    const value = query.trim().toLowerCase()
    return value
      ? centres.filter((centre) => [centre.name, centre.area, centre.status].some((field) => String(field || '').toLowerCase().includes(value)))
      : centres
  }, [centres, query])

  const openCentres = centres.filter((centre) => centre.status === 'open').length
  const totalCapacity = centres.reduce((total, centre) => total + centre.capacity, 0)
  const occupiedPlaces = centres.reduce((total, centre) => total + centre.occupied, 0)

  const addCentre = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!selectedPlace || !Number.isFinite(selectedPlace.lat) || !Number.isFinite(selectedPlace.lng)) {
      setError('Search for the centre location and select a place before saving.')
      return
    }
    setSaving(true)
    const capacity = Number(form.capacity)
    const occupied = Number(form.occupied || 0)
    const { data, error: insertError } = await supabase.from('relief_centres').insert({
      name: form.name.trim(),
      area: form.area.trim(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      capacity,
      occupied,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      status: capacity > 0 && occupied >= capacity ? 'full' : 'open',
      created_by: user.id,
    }).select('id, name, area, address, phone, latitude, longitude, capacity, occupied, status, created_at').single()
    setSaving(false)
    if (insertError) {
      setError(`Could not save relief centre: ${insertError.message}`)
      return
    }
    setCentres((current) => [formatCentre(data), ...current])
    setForm(EMPTY_FORM)
    setPlaceQuery('')
    setSelectedPlace(null)
    setPlaceResults([])
    setFormOpen(false)
    setNotice(`${data.name} was saved to Supabase. It is now available in the citizen relief-centres directory.`)
  }

  return (
    <>
      <AdminPageHeader
        title="Relief centres"
        subtitle="Monitor shelter capacity and availability from the shared Supabase directory."
        action={<button type="button" onClick={() => setFormOpen((open) => !open)} className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700">{formOpen ? 'Cancel' : '+ Add centre'}</button>}
      />
      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      {formOpen && (
        <AdminPanel title="Register relief centre" description="Search for the centre's location and select the correct place. Its address and map position will be filled automatically.">
          <form onSubmit={addCentre} className="grid gap-4 sm:grid-cols-2">
            <div className="relative sm:col-span-2">
              <label htmlFor="centre-place-search" className="text-sm font-medium text-slate-700">Search for the centre location <span className="text-rose-600">*</span></label>
              <div className="relative mt-1.5">
                <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="centre-place-search"
                  type="search"
                  autoComplete="off"
                  value={placeQuery}
                  onChange={(event) => {
                    setPlaceQuery(event.target.value)
                    setSelectedPlace(null)
                    setForm((current) => ({ ...current, area: '', address: '', latitude: '', longitude: '' }))
                  }}
                  className={`${inputClass} pl-10`}
                  placeholder="Search a school, shelter, street, area, or city"
                  aria-expanded={placeResults.length > 0}
                  aria-controls="centre-place-results"
                  aria-autocomplete="list"
                />
                {searchingPlaces && <LoaderCircle size={18} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-sky-700" aria-label="Searching places" />}
              </div>
              <p className="mt-1 text-xs text-slate-500">Place suggestions are provided by OpenStreetMap Nominatim.</p>
              {placeSearchError && <p role="alert" className="mt-2 text-sm text-rose-700">{placeSearchError}</p>}
              {placeQuery.trim().length >= 3 && !selectedPlace && !searchingPlaces && !placeSearchError && placeResults.length === 0 && (
                <p className="mt-2 text-sm text-slate-600">No matching places found. Try a nearby landmark or add the city name.</p>
              )}
              {placeResults.length > 0 && (
                <ul id="centre-place-results" role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                  {placeResults.map((place) => (
                    <li key={place.id} role="option" aria-selected="false">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlace(place)
                          setPlaceQuery(place.displayName)
                          setPlaceResults([])
                          setForm((current) => ({
                            ...current,
                            area: place.area,
                            address: place.displayName.slice(0, 300),
                            latitude: String(place.lat),
                            longitude: String(place.lng),
                          }))
                        }}
                        className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-sky-50 focus:bg-sky-50 focus:outline-none"
                      >
                        <MapPin size={17} className="mt-0.5 shrink-0 text-sky-700" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-900">{place.name}</span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{place.displayName}</span>
                          {place.area && <span className="mt-1 block text-xs font-medium text-sky-800">{place.area}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedPlace && (
                <div className="mt-3 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-emerald-900">Map location selected</p>
                    <p className="mt-0.5 text-emerald-800">{selectedPlace.area || selectedPlace.displayName}</p>
                    <p className="mt-1 text-xs text-emerald-700">This location will be used for the citizen map pin.</p>
                  </div>
                </div>
              )}
            </div>
            <label className="text-sm font-medium text-slate-700">Centre name<input required maxLength={160} className={`${inputClass} mt-1.5`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="text-sm font-medium text-slate-700">City / area<input readOnly required maxLength={200} className={`${inputClass} mt-1.5 read-only:bg-slate-50 read-only:text-slate-700`} value={form.area} placeholder="Filled from selected location" /></label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Selected address<input readOnly maxLength={300} className={`${inputClass} mt-1.5 read-only:bg-slate-50 read-only:text-slate-700`} value={form.address} placeholder="Select a location above to fill the address" /></label>
            <label className="text-sm font-medium text-slate-700">Phone<input type="tel" maxLength={40} className={`${inputClass} mt-1.5`} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label className="text-sm font-medium text-slate-700">Capacity<input required type="number" min="1" step="1" className={`${inputClass} mt-1.5`} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></label>
            <label className="text-sm font-medium text-slate-700">Currently occupied<input type="number" min="0" step="1" max={form.capacity || undefined} className={`${inputClass} mt-1.5`} value={form.occupied} onChange={(event) => setForm({ ...form, occupied: event.target.value })} /></label>
            <div className="sm:col-span-2 sm:text-right"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving && <LoaderCircle size={16} className="animate-spin" />}{saving ? 'Saving…' : 'Save centre'}</button></div>
          </form>
        </AdminPanel>
      )}

      <div className="mb-6 mt-6 grid gap-4 sm:grid-cols-3">
        <AdminMetric label="Total centres" value={centres.length} detail={`${openCentres} currently open`} />
        <AdminMetric label="People accommodated" value={occupiedPlaces.toLocaleString()} detail="Current occupancy" tone="emerald" />
        <AdminMetric label="Available capacity" value={Math.max(totalCapacity - occupiedPlaces, 0).toLocaleString()} detail="Places remaining" tone="sky" />
      </div>
      <AdminPanel
        title="Centre directory"
        description="Occupancy and availability from public.relief_centres."
        action={
          <button type="button" onClick={() => loadCentres(true)} disabled={loading || refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      >
        <label className="mb-4 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
          <Search size={18} className="text-slate-400" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search centre, area, or status" />
        </label>
        {loading ? <div className="flex justify-center py-10"><LoaderCircle className="animate-spin text-sky-600" /></div> : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={tableHeadClass}><tr><th className="pb-3">Centre</th><th className="pb-3">Area</th><th className="pb-3">Occupancy</th><th className="pb-3">Capacity</th><th className="pb-3">Availability</th></tr></thead>
              <tbody>{filteredCentres.map((centre) => {
                const occupancy = centre.capacity ? Math.round((centre.occupied / centre.capacity) * 100) : 0
                return (
                  <tr key={centre.id} className={tableRowClass}>
                    <td className="py-4 font-semibold text-slate-800">{centre.name}</td>
                    <td className="py-4 text-slate-600">{centre.area}</td>
                    <td className="py-4 text-slate-600">{centre.occupied.toLocaleString()}</td>
                    <td className="py-4 text-slate-600">{centre.capacity.toLocaleString()}</td>
                    <td className="py-4"><div className="flex flex-wrap items-center gap-2"><StatusTag tone={centre.status === 'open' ? 'emerald' : centre.status === 'full' ? 'rose' : 'slate'}>{centre.status}</StatusTag><span className="text-xs text-slate-500">{occupancy}% full</span></div></td>
                  </tr>
                )
              })}</tbody>
            </table>
            {!loading && filteredCentres.length === 0 && <p className="py-8 text-center text-sm text-slate-500">{centres.length ? 'No centres match your search.' : 'No relief centres are saved yet.'}</p>}
          </div>
        )}
      </AdminPanel>
    </>
  )
}
