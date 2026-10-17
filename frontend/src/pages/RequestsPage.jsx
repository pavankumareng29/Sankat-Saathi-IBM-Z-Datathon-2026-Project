import { useCallback, useEffect, useMemo, useState } from 'react'
import { LoaderCircle, RefreshCw, Search } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Panel from '../components/Panel'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'

const priorityTone = {
  critical: 'bg-rose-100 text-rose-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

const timeAgo = (value) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr ago`
  return `${Math.round(minutes / 1440)} day(s) ago`
}

export default function RequestsPage({ notify = () => {} }) {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [claimingId, setClaimingId] = useState('')
  const [error, setError] = useState('')
  const [membershipRequired, setMembershipRequired] = useState(false)

  const loadRequests = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError('')
    setMembershipRequired(false)

    const { data, error: loadError } = await supabase.rpc('get_ngo_request_inbox')
    if (loadError) {
      const message = loadError.message.toLowerCase()
      const needsMembership = message.includes('ngo membership') || message.includes('ngo partner')
      setMembershipRequired(needsMembership)
      setError(needsMembership
        ? 'This NGO login is not linked to an approved NGO partner yet.'
        : `Could not load the NGO request inbox: ${loadError.message}`)
      setRequests([])
    } else {
      const inbox = data || []
      const assignedIds = inbox.filter((request) => request.assigned_to_partner).map((request) => request.id)
      if (assignedIds.length) {
        const { data: contactRows, error: contactError } = await supabase
          .from('assistance_requests')
          .select('id, contact_name, contact_phone')
          .in('id', assignedIds)
        if (contactError) setError(`Requests loaded, but assigned citizen contact details could not be loaded: ${contactError.message}`)
        const contacts = new Map((contactRows || []).map((row) => [row.id, row]))
        setRequests(inbox.map((request) => ({ ...request, ...contacts.get(request.id) })))
      } else {
        setRequests(inbox)
      }
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const visibleRequests = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return requests
    return requests.filter((request) =>
      [
        request.request_code,
        request.category,
        request.medical_type,
        request.details,
        request.location_text,
        request.priority,
      ].some((field) => String(field || '').toLowerCase().includes(value))
    )
  }, [requests, query])

  const claimRequest = async (request) => {
    setClaimingId(request.id)
    setError('')
    const { data: requestCode, error: claimError } = await supabase
      .rpc('claim_assistance_request', { target_request_id: request.id })

    setClaimingId('')
    if (claimError) {
      setError(`Could not claim ${request.request_code}: ${claimError.message}`)
      return
    }

    notify(`${requestCode} assigned to your NGO.`)
    await loadRequests(true)
  }

  return (
    <>
      <PageHeader title="Relief requests" subtitle="Citizen requests are shared here from the same Supabase database. Claim an unassigned request to coordinate its response.">
        <button
          type="button"
          onClick={() => loadRequests(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
          Refresh
        </button>
      </PageHeader>

      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
          {membershipRequired && (
            <div className="mt-2 space-y-1 text-rose-900">
              <p>Signed in as <strong>{user?.email || user?.name}</strong>. Ask your platform administrator to:</p>
              <ol className="list-inside list-decimal">
                <li>Open <strong>Admin → NGO Partners</strong> and choose the correct organisation.</li>
                <li>Select this registered login under <strong>Manage members</strong>, then choose <strong>Link and approve</strong>.</li>
                <li>Refresh this Requests page after approval.</li>
              </ol>
              <p className="pt-1">If no NGO account appears in the list, register this login with the NGO operator role first.</p>
            </div>
          )}
        </div>
      )}

      <Panel title={`Request inbox · ${requests.length}`}>
        <label className="mb-4 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
          <Search size={18} className="text-slate-400" aria-hidden="true" />
          <span className="sr-only">Search requests</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search location, request, or need" />
        </label>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> Loading requests…
          </div>
        ) : visibleRequests.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {requests.length ? 'No requests match your search.' : 'No citizen requests are available for your NGO right now.'}
          </p>
        ) : (
          <div className="space-y-3">
            {visibleRequests.map((request) => (
              <article key={request.id} className="rounded-2xl border border-slate-100 p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-slate-900">{request.category}{request.medical_type ? ` · ${request.medical_type}` : ''}</h2>
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${priorityTone[request.priority] || priorityTone.medium}`}>{request.priority}</span>
                      {request.assigned_to_partner && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Assigned to your NGO</span>}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{request.location_text}</p>
                    {request.details && <p className="mt-2 text-sm text-slate-700">{request.details}</p>}
                    <p className="mt-2 text-xs text-slate-500">
                      {request.request_code} · {request.people_affected} people affected · {timeAgo(request.created_at)}
                    </p>
                    {request.assigned_to_partner
                      ? <p className="mt-2 text-sm font-medium text-slate-700">{request.contact_name || 'Citizen'}{request.contact_phone && <> · <a href={`tel:${request.contact_phone}`} className="text-sky-700 hover:underline">{request.contact_phone}</a></>}</p>
                      : <p className="mt-1 text-xs text-slate-500">Citizen contact details become available to your NGO after you claim the request.</p>}
                  </div>
                  {!request.assigned_to_partner && (
                    <button
                      type="button"
                      onClick={() => claimRequest(request)}
                      disabled={!!claimingId}
                      className="shrink-0 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60"
                    >
                      {claimingId === request.id ? 'Claiming…' : 'Claim request'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </>
  )
}
