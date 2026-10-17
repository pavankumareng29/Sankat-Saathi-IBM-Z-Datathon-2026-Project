import { useCallback, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LoaderCircle, LocateFixed, Navigation, Phone, RefreshCw } from 'lucide-react'
import { Badge } from '../components/ui'
import { supabase } from '../services/supabase'

const COLORS = { open: '#059669', full: '#e11d48', closed: '#64748b' }
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character])

const distanceKm = (a, b) => {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

export default function ReliefCentresPage({ notify = () => {} }) {
  const mapEl = useRef(null)
  const map = useRef(null)
  const markers = useRef({})
  const youMarker = useRef(null)
  const [centres, setCentres] = useState([])
  const [selected, setSelected] = useState(null)
  const [me, setMe] = useState(null)
  const [locating, setLocating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')

  const loadCentres = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setLoadError('')

    const { data, error } = await supabase.from('relief_centres')
      .select('id, name, area, address, phone, latitude, longitude, occupied, capacity, status')
      .order('name')
    if (error) {
      setLoadError(`Could not load relief centres from Supabase: ${error.message}`)
      setCentres([])
    } else {
      setCentres((data || []).map((centre) => {
        const status = centre.capacity > 0 && centre.occupied >= centre.capacity
          ? 'full'
          : centre.status
        return {
          ...centre,
          lat: centre.latitude == null ? Number.NaN : Number(centre.latitude),
          lng: centre.longitude == null ? Number.NaN : Number(centre.longitude),
          status: status.charAt(0).toUpperCase() + status.slice(1),
        }
      }))
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    loadCentres()
  }, [loadCentres])

  // Create the map once
  useEffect(() => {
    const m = L.map(mapEl.current, { scrollWheelZoom: false })
    map.current = m
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(m)

    m.setView([12.3205, 76.6290], 12)

    return () => { m.remove(); map.current = null; markers.current = {}; youMarker.current = null }
  }, [])

  useEffect(() => {
    if (!map.current) return
    Object.values(markers.current).forEach((marker) => marker.remove())
    markers.current = {}

    const locatedCentres = centres.filter((centre) => Number.isFinite(centre.lat) && Number.isFinite(centre.lng))
    locatedCentres.forEach((c) => {
      const marker = L.circleMarker([c.lat, c.lng], {
        radius: 12, color: '#ffffff', weight: 3, fillColor: COLORS[c.status.toLowerCase()] || '#64748b', fillOpacity: 1,
      }).addTo(map.current)
      marker.bindPopup(`<b>${escapeHtml(c.name)}</b><br/>${escapeHtml(c.area)}<br/>${c.occupied} / ${c.capacity} · ${escapeHtml(c.status)}`)
      marker.on('click', () => setSelected(c.id))
      markers.current[c.id] = marker
    })

    if (locatedCentres.length) {
      map.current.fitBounds(L.latLngBounds(locatedCentres.map((c) => [c.lat, c.lng])), { padding: [40, 40] })
    }
  }, [centres])

  // Fly to the selected centre
  useEffect(() => {
    if (!selected || !map.current) return
    const c = centres.find((x) => x.id === selected)
    if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return
    map.current.flyTo([c.lat, c.lng], 16, { duration: 0.8 })
    markers.current[selected]?.openPopup()
  }, [centres, selected])

  const findMe = () => {
    if (!navigator.geolocation) return notify('Location is not supported on this device.')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setMe(here)
        setLocating(false)
        youMarker.current?.remove()
        youMarker.current = L.circleMarker([here.lat, here.lng], {
          radius: 9, color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1,
        }).addTo(map.current).bindPopup('You are here')
        const centreCoordinates = centres.filter((centre) => Number.isFinite(centre.lat) && Number.isFinite(centre.lng)).map((centre) => [centre.lat, centre.lng])
        map.current.fitBounds(L.latLngBounds([[here.lat, here.lng], ...centreCoordinates]), { padding: [40, 40] })
      },
      () => { setLocating(false); notify('Could not get your location. Allow location access in the browser.') },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const list = centres
    .map((c) => ({ ...c, km: me && Number.isFinite(c.lat) && Number.isFinite(c.lng) ? distanceKm(me, c) : null }))
    .sort((a, b) => (me ? a.km - b.km : 0))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:px-4">
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-700">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-emerald-600" /> Open</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-rose-600" /> Full</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-blue-600" /> You</span>
          <span className="text-slate-500">{loading ? 'Loading centres…' : `${centres.length} centre${centres.length === 1 ? '' : 's'}`}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => loadCentres(true)} disabled={loading || refreshing} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60">
            {refreshing ? <LoaderCircle size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            Refresh centres
          </button>
          <button onClick={findMe} disabled={locating} className="flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-sky-800 disabled:opacity-60">
            <LocateFixed size={18} /> {locating ? 'Finding you…' : 'Show nearest to me'}
          </button>
        </div>
      </div>

      {loadError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{loadError}</p>}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="isolate overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-3">
          <div ref={mapEl} className="h-[420px] w-full lg:h-[560px]" />
        </div>

        <div className="space-y-3 lg:col-span-2 lg:max-h-[560px] lg:overflow-y-auto">
          {loading && <p className="rounded-2xl bg-white p-5 text-sm text-slate-500">Loading relief centres…</p>}
          {!loading && !loadError && list.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
              <p className="font-semibold text-slate-900">No relief centres were returned from the database.</p>
              <p className="mt-1 text-slate-600">Check that the centre was saved in Admin → Relief Centres and that both pages use the same Supabase project, then refresh.</p>
            </div>
          )}
          {list.map((c) => (
            <article
              key={c.id}
              className={`rounded-2xl border bg-white p-4 shadow-sm ${selected === c.id ? 'border-sky-500 ring-2 ring-sky-300' : 'border-slate-200'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  <p className="text-sm text-slate-500">
                    {c.area} · {c.occupied} / {c.capacity} occupied{c.km != null && ` · ${c.km.toFixed(1)} km away`}
                  </p>
                </div>
                <Badge value={c.status} />
              </div>
              {Number.isFinite(c.lat) && Number.isFinite(c.lng)
                ? <button type="button" onClick={() => setSelected(c.id)} className="mt-3 rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-50">Show on map</button>
                : <p className="mt-2 text-xs font-medium text-amber-800">Location coordinates are missing, so this centre cannot appear as a map pin.</p>}
              {c.status === 'Full' && <p className="mt-2 text-xs font-medium text-rose-600">This centre is full. Please choose another.</p>}
              {c.address && <p className="mt-1 text-sm text-slate-500">{c.address}</p>}
              <div className="mt-3 flex gap-2">
                {Number.isFinite(c.lat) && Number.isFinite(c.lng) && <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                  target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  <Navigation size={14} /> Directions
                </a>}
                {c.phone && <a
                  href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  <Phone size={14} /> Call
                </a>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}