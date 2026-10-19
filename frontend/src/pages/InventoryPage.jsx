import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100'

function mapInventoryRows(rows) {
  return rows.map((row) => {
    const resource = Array.isArray(row.resource) ? row.resource[0] : row.resource
    const quantity = Number(row.quantity)
    const available = Math.max(0, quantity - Number(row.reserved_quantity))
    const progress = quantity > 0 ? Math.round((available / quantity) * 100) : 0
    return {
      id: row.id,
      item: resource?.name || 'Unknown resource',
      available,
      unit: resource?.unit || 'units',
      progress,
      state: progress <= 15 ? 'Low' : progress <= 40 ? 'Watch' : 'Healthy',
    }
  })
}

export default function InventoryPage({ data }) {
  const { user } = useAuth()
  const [items, setItems] = useState(data.inventory)
  const [resources, setResources] = useState([])
  const [partnerId, setPartnerId] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [optionsError, setOptionsError] = useState('')
  const [optionsRetry, setOptionsRetry] = useState(0)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    const loadOptions = async () => {
      setLoading(true)
      const [membershipResult, catalogResult] = await Promise.allSettled([
        supabase.from('ngo_memberships').select('partner_id').eq('profile_id', user.id).eq('status', 'active').order('created_at'),
        supabase.from('resource_catalog').select('id, name, unit').order('name'),
      ])
      if (cancelled) return

      const loadErrors = []
      if (membershipResult.status === 'fulfilled' && !membershipResult.value.error) {
        const activePartnerId = membershipResult.value.data?.[0]?.partner_id || ''
        setPartnerId(activePartnerId)
      } else {
        setPartnerId('')
        const message = membershipResult.status === 'rejected'
          ? membershipResult.reason?.message || String(membershipResult.reason)
          : membershipResult.value.error.message
        loadErrors.push(`Could not load NGO membership: ${message}`)
      }

      if (catalogResult.status === 'fulfilled' && !catalogResult.value.error) {
        const catalog = catalogResult.value.data || []
        setResources(catalog)
        setResourceId((currentId) => catalog.some((resource) => resource.id === currentId)
          ? currentId
          : catalog[0]?.id || '')
      } else {
        setResources([])
        setResourceId('')
        const message = catalogResult.status === 'rejected'
          ? catalogResult.reason?.message || String(catalogResult.reason)
          : catalogResult.value.error.message
        loadErrors.push(`Could not load resource options: ${message}`)
      }

      const activePartnerId = membershipResult.status === 'fulfilled' && !membershipResult.value.error
        ? membershipResult.value.data?.[0]?.partner_id || ''
        : ''
      if (activePartnerId) {
        const { data: inventoryRows, error: inventoryError } = await supabase
          .from('inventory')
          .select('id, quantity, reserved_quantity, resource:resource_catalog(name, unit)')
          .eq('partner_id', activePartnerId)
          .is('centre_id', null)
          .order('updated_at', { ascending: false })
        if (cancelled) return
        if (inventoryError) {
          loadErrors.push(`Could not refresh inventory: ${inventoryError.message}`)
        } else {
          setItems(mapInventoryRows(inventoryRows || []))
        }
      } else {
        setItems([])
      }

      setOptionsError(loadErrors.join(' '))
      setLoading(false)
    }
    loadOptions()
    return () => { cancelled = true }
  }, [user.id, optionsRetry])

  useEffect(() => {
    if (!partnerId) return undefined
    let cancelled = false
    const refreshInventory = async () => {
      const { data: inventoryRows, error: inventoryError } = await supabase
        .from('inventory')
        .select('id, quantity, reserved_quantity, resource:resource_catalog(name, unit)')
        .eq('partner_id', partnerId)
        .is('centre_id', null)
        .order('updated_at', { ascending: false })
      if (cancelled) return
      if (inventoryError) {
        setError(`Could not refresh inventory: ${inventoryError.message}`)
        return
      }
      setItems(mapInventoryRows(inventoryRows || []))
    }
    const channel = supabase.channel(`ngo-inventory-sync-${partnerId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory',
        filter: `partner_id=eq.${partnerId}`,
      }, refreshInventory)
      .subscribe()
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [partnerId])

  const saveStock = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!partnerId) {
      setError('Your NGO account is not linked to an active partner. Ask an administrator to add your profile to ngo_memberships.')
      return
    }
    const newQuantity = Number(quantity)
    if (!Number.isFinite(newQuantity) || newQuantity < 0) {
      setError('Enter a valid stock quantity of zero or more.')
      return
    }
    setSaving(true)
    const { data: current, error: lookupError } = await supabase.from('inventory')
      .select('id, quantity, reserved_quantity')
      .eq('partner_id', partnerId)
      .eq('resource_id', resourceId)
      .is('centre_id', null)
      .maybeSingle()

    if (lookupError) {
      setError(`Could not check existing stock: ${lookupError.message}`)
      setSaving(false)
      return
    }
    if (current && newQuantity < Number(current.reserved_quantity)) {
      setError(`Quantity cannot be lower than ${current.reserved_quantity} already reserved units.`)
      setSaving(false)
      return
    }

    const result = current
      ? await supabase.from('inventory').update({ quantity: newQuantity }).eq('id', current.id)
      : await supabase.from('inventory').insert({ partner_id: partnerId, resource_id: resourceId, quantity: newQuantity })
    if (result.error) {
      setError(`Could not save stock: ${result.error.message}`)
      setSaving(false)
      return
    }

    const resource = resources.find((item) => item.id === resourceId)
    const available = Math.max(0, newQuantity - Number(current?.reserved_quantity || 0))
    const progress = newQuantity > 0 ? Math.round((available / newQuantity) * 100) : 0
    const savedItem = {
      id: current?.id || `${partnerId}:${resourceId}`,
      item: resource.name,
      available,
      unit: resource.unit,
      progress,
      state: progress <= 15 ? 'Low' : progress <= 40 ? 'Watch' : 'Healthy',
    }
    setItems((existing) => [
      ...existing.filter((item) => item.id !== savedItem.id && item.item !== savedItem.item),
      savedItem,
    ])
    setQuantity('')
    setSaving(false)
    setNotice(`${resource.name} stock saved to Supabase.`)
  }

  return (
    <>
      <PageHeader title="Inventory" subtitle="View and update your NGO's supply quantities stored in Supabase." />
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">Update stock</h2>
        <p className="mt-1 text-sm text-slate-500">Set the total physical quantity for a resource at your NGO's central store.</p>
        {loading ? <div className="flex justify-center py-6"><LoaderCircle className="animate-spin text-sky-600" /></div> : (
          <form onSubmit={saveStock} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="text-sm font-medium text-slate-700">Resource
              <select required disabled={!resources.length} value={resourceId} onChange={(event) => setResourceId(event.target.value)} className={`${inputClass} mt-1.5 disabled:cursor-not-allowed disabled:bg-slate-100`}>
                {!resources.length && <option value="">No resources configured</option>}
                {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name} ({resource.unit})</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Total quantity
              <input required type="number" min="0" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={`${inputClass} mt-1.5`} placeholder="Enter quantity" />
            </label>
            <button disabled={saving || !resources.length} className="self-end rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save stock'}
            </button>
          </form>
        )}
        {!loading && !resources.length && (
          <p className="mt-3 text-sm text-slate-600">
            Add the resource catalog by running <code className="rounded bg-slate-100 px-1">supabase/migrations/20261018020000_inventory_catalog_access.sql</code> in Supabase SQL Editor.
          </p>
        )}
        {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
        {optionsError && (
          <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <p>{optionsError}</p>
            <button
              type="button"
              onClick={() => setOptionsRetry((attempt) => attempt + 1)}
              disabled={loading}
              className="rounded-lg border border-rose-300 px-3 py-1.5 font-semibold hover:bg-rose-100 disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        )}
        {notice && <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
      </section>

      {items.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id || item.item} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex justify-between gap-4">
                <div><h2 className="font-bold text-slate-800">{item.item}</h2><p className="mt-1 text-sm text-slate-500">{item.available.toLocaleString()} {item.unit} available</p></div>
                <span className={`h-fit rounded-full px-2 py-1 text-xs font-bold ${item.state === 'Low' ? 'bg-rose-100 text-rose-700' : item.state === 'Watch' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.state}</span>
              </div>
              <div className="mt-6 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${item.progress}%` }} /></div>
            </article>
          ))}
        </div>
      ) : !loading && <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No stock has been recorded for this NGO yet.</p>}
    </>
  )
}
