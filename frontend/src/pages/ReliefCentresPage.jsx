import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LocateFixed, Navigation, Phone } from 'lucide-react'
import { Badge } from '../components/ui'
import { centres } from '../data/centres'

const COLORS = { Open: '#059669', Full: '#e11d48' }

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
  const [selected, setSelected] = useState(null)
  const [me, setMe] = useState(null)
  const [locating, setLocating] = useState(false)

  // Create the map once
  useEffect(() => {
    const m = L.map(mapEl.current, { scrollWheelZoom: false })
    map.current = m
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(m)

    centres.forEach((c) => {
      const marker = L.circleMarker([c.lat, c.lng], {
        radius: 12, color: '#ffffff', weight: 3, fillColor: COLORS[c.status], fillOpacity: 1,
      }).addTo(m)
      marker.bindPopup(`<b>${c.name}</b><br/>${c.area}<br/>${c.occupied} / ${c.capacity} · ${c.status}`)
      marker.on('click', () => setSelected(c.id))
      markers.current[c.id] = marker
    })

    m.fitBounds(L.latLngBounds(centres.map((c) => [c.lat, c.lng])), { padding: [40, 40] })

    return () => { m.remove(); map.current = null; markers.current = {}; youMarker.current = null }
  }, [])

  // Fly to the selected centre
  useEffect(() => {
    if (!selected || !map.current) return
    const c = centres.find((x) => x.id === selected)
    map.current.flyTo([c.lat, c.lng], 16, { duration: 0.8 })
    markers.current[selected]?.openPopup()
  }, [selected])

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
        map.current.fitBounds(L.latLngBounds([[here.lat, here.lng], ...centres.map((c) => [c.lat, c.lng])]), { padding: [40, 40] })
      },
      () => { setLocating(false); notify('Could not get your location. Allow location access in the browser.') },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const list = centres
    .map((c) => ({ ...c, km: me ? distanceKm(me, c) : null }))
    .sort((a, b) => (me ? a.km - b.km : 0))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm text-white">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-emerald-600" /> Open</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-rose-600" /> Full</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-blue-600" /> You</span>
        </div>
        <button onClick={findMe} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 shadow">
          <LocateFixed size={18} /> {locating ? 'Finding you…' : 'Show nearest to me'}
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="isolate overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-3">
          <div ref={mapEl} className="h-[420px] w-full lg:h-[560px]" />
        </div>

        <div className="space-y-3 lg:col-span-2 lg:max-h-[560px] lg:overflow-y-auto">
          {list.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`cursor-pointer rounded-2xl border bg-white p-4 shadow-sm ${selected === c.id ? 'border-sky-500 ring-2 ring-sky-300' : 'border-slate-200'}`}
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
              {c.status === 'Full' && <p className="mt-2 text-xs font-medium text-rose-600">This centre is full. Please choose another.</p>}
              <div className="mt-3 flex gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                  target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  <Navigation size={14} /> Directions
                </a>
                <a
                  href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  <Phone size={14} /> Call
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}