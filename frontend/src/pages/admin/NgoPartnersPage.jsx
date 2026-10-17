import { Fragment, useEffect, useMemo, useState } from 'react'
import { Building2, LoaderCircle, MapPin, Phone, Search, User, X } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { AdminMetric, AdminPageHeader, AdminPanel, tableClass, tableHeadClass, tableRowClass } from './AdminComponents'

const EMPTY_FORM = {
  name: '',
  registrationNumber: '',
  contactEmail: '',
  contactPhone: '',
  serviceArea: '',
  profileId: '',
}

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100'

const initials = (name) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join('')

const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, '')}`

function Avatar({ name }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-sm font-extrabold text-white shadow-sm">
      {initials(name) || <Building2 size={18} aria-hidden="true" />}
    </span>
  )
}

export default function NgoPartnersPage({ notify = () => {} }) {
  const [partners, setPartners] = useState([])
  const [ngoUsers, setNgoUsers] = useState([])
  const [memberships, setMemberships] = useState([])
  const [openPartnerId, setOpenPartnerId] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState({})
  const [approvingMemberId, setApprovingMemberId] = useState('')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const fetchPartners = async () => {
      const [
        { data, error: loadError },
        { data: userRows, error: usersError },
        { data: membershipRows, error: membershipsError },
      ] = await Promise.all([
        supabase.from('ngo_partners')
          .select('id, name, registration_number, contact_email, contact_phone, service_area, status, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('profiles')
          .select('id, name, email')
          .eq('role', 'ngo')
          .order('name'),
        supabase.from('ngo_memberships')
          .select('id, partner_id, profile_id, member_role, status, created_at')
          .order('created_at', { ascending: false }),
      ])

      if (cancelled) return
      if (loadError) {
        setError(`Could not load NGO partners: ${loadError.message}`)
      } else {
        setPartners(data || [])
      }
      if (usersError) {
        setError((current) => current || `Could not load NGO accounts to link: ${usersError.message}`)
      } else {
        setNgoUsers(userRows || [])
      }
      if (membershipsError) {
        setError((current) => current || `Could not load NGO memberships: ${membershipsError.message}`)
      } else {
        setMemberships(membershipRows || [])
      }
      setLoading(false)
    }

    fetchPartners()
    return () => { cancelled = true }
  }, [reloadKey])

  const visiblePartners = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return partners
    return partners.filter((partner) =>
      [
        partner.name,
        partner.registration_number,
        partner.contact_email,
        partner.contact_phone,
        partner.service_area,
        partner.status,
      ].some((field) => String(field || '').toLowerCase().includes(value))
    )
  }, [partners, query])

  const activeCount = partners.filter((partner) => partner.status === 'active').length
  const pendingCount = partners.filter((partner) => partner.status === 'pending').length

  const updateForm = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const addPartner = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    const { data: savedPartner, error: insertError } = await supabase
      .from('ngo_partners')
      .insert({
        name: form.name.trim(),
        registration_number: form.registrationNumber.trim() || null,
        contact_email: form.contactEmail.trim() || null,
        contact_phone: form.contactPhone.trim() || null,
        service_area: form.serviceArea.trim() || null,
        status: 'pending',
      })
      .select('id, name, registration_number, contact_email, contact_phone, service_area, status, created_at')
      .single()

    if (insertError) {
      setError(`Could not save the NGO partner: ${insertError.message}`)
      setSaving(false)
      return
    }

    let membershipError = null
    if (form.profileId) {
      const { error: linkError } = await supabase.rpc('approve_ngo_membership', {
        target_partner_id: savedPartner.id,
        target_profile_id: form.profileId,
      })
      membershipError = linkError
      if (!linkError) savedPartner.status = 'active'
    }

    setForm(EMPTY_FORM)
    setFormOpen(false)
    setSaving(false)
    setPartners((current) => [savedPartner, ...current])
    if (form.profileId && !membershipError) setReloadKey((key) => key + 1)
    if (membershipError) {
      setError(`Partner ${savedPartner.name} was saved, but the NGO account could not be linked: ${membershipError.message}`)
      return
    }
    notify(form.profileId ? 'NGO partner and active account membership saved to Supabase.' : 'NGO partner saved to Supabase for review.')
  }

  const approveMember = async (partner, profileId) => {
    if (!profileId) return
    const requestKey = `${partner.id}:${profileId}`
    setApprovingMemberId(requestKey)
    setError('')
    const { error: approvalError } = await supabase.rpc('approve_ngo_membership', {
      target_partner_id: partner.id,
      target_profile_id: profileId,
    })
    setApprovingMemberId('')
    if (approvalError) {
      const message = approvalError.message.toLowerCase()
      setError(message.includes('approve_ngo_membership') || message.includes('schema cache')
        ? 'The NGO approval workflow is not installed in Supabase yet. Run 20261017020000_approve_ngo_memberships.sql in the Supabase SQL Editor, then retry.'
        : `Could not approve this NGO member: ${approvalError.message}`)
      return
    }
    setOpenPartnerId(partner.id)
    setReloadKey((key) => key + 1)
    notify('NGO member approved. Their account can now access this partner’s requests and operations.')
  }

  const updatePartnerStatus = async (partner, status) => {
    setError('')
    const { data, error: updateError } = await supabase.from('ngo_partners')
      .update({ status })
      .eq('id', partner.id)
      .select('id, name, registration_number, contact_email, contact_phone, service_area, status, created_at')
      .single()
    if (updateError) {
      setError(`Could not update ${partner.name}: ${updateError.message}`)
      return
    }
    setPartners((current) => current.map((item) => item.id === data.id ? data : item))
  }

  const renderMemberAccess = (partner) => {
    const partnerMembers = memberships.filter((membership) => membership.partner_id === partner.id)
    const selectedProfileId = selectedMemberIds[partner.id] || ''

    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-bold text-slate-800">Operator access</h3>
        {partnerMembers.length ? (
          <ul className="mt-3 space-y-2">
            {partnerMembers.map((membership) => {
              const member = ngoUsers.find((ngoUser) => ngoUser.id === membership.profile_id)
              return (
                <li key={membership.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                  <span className="min-w-0 text-sm text-slate-700">
                    <span className="font-semibold">{member?.name || 'NGO operator'}</span>
                    {member?.email && <span className="ml-2 text-xs text-slate-500">{member.email}</span>}
                    <span className="ml-2 text-xs capitalize text-slate-500">{membership.member_role}</span>
                  </span>
                  {membership.status === 'active' ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Active</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => approveMember(partner, membership.profile_id)}
                      disabled={approvingMemberId === `${partner.id}:${membership.profile_id}` || partner.status === 'suspended'}
                      className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                    >
                      {approvingMemberId === `${partner.id}:${membership.profile_id}` ? 'Approving…' : 'Approve member'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No operator account is linked yet. Link the registered NGO login that should handle requests.</p>
        )}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select
            aria-label={`Choose an NGO operator for ${partner.name}`}
            value={selectedProfileId}
            onChange={(event) => setSelectedMemberIds((current) => ({ ...current, [partner.id]: event.target.value }))}
            disabled={partner.status === 'suspended'}
            className={`${inputClass} sm:max-w-lg`}
          >
            <option value="">Choose a registered NGO account…</option>
            {ngoUsers.filter((ngoUser) =>
              !memberships.some((membership) => membership.profile_id === ngoUser.id && membership.status === 'active')
            ).map((ngoUser) => (
              <option key={ngoUser.id} value={ngoUser.id}>{ngoUser.name} · {ngoUser.email || ngoUser.id}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => approveMember(partner, selectedProfileId)}
            disabled={!selectedProfileId || !!approvingMemberId || partner.status === 'suspended'}
            className="shrink-0 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {approvingMemberId.startsWith(`${partner.id}:`) ? 'Approving…' : 'Link and approve'}
          </button>
        </div>
        {partner.status === 'suspended' && <p className="mt-2 text-xs text-rose-700">Unsuspend this partner before approving or linking members.</p>}
        {!ngoUsers.length && <p className="mt-2 text-xs text-slate-500">No NGO operator accounts found. The operator must register and confirm their account with the NGO role first.</p>}
      </div>
    )
  }

  return (
    <>
      <AdminPageHeader
        title="NGO partners"
        subtitle="Register NGOs, link a registered operator account, and manage organisation approval."
        action={
          <button
            type="button"
            onClick={() => { setFormOpen((open) => !open); setError('') }}
            aria-expanded={formOpen}
            className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 sm:w-auto"
          >
            {formOpen ? 'Cancel' : '+ Add partner'}
          </button>
        }
      />

      {formOpen && (
        <AdminPanel title="Register an NGO partner" description="Link an existing NGO login so its operator can access citizen requests.">
          <form onSubmit={addPartner} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Organisation name <span className="text-rose-600">*</span>
              <input autoFocus required maxLength={160} name="name" value={form.name} onChange={updateForm} className={`${inputClass} mt-1.5`} placeholder="Example Relief Foundation" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Registration number
              <input maxLength={100} name="registrationNumber" value={form.registrationNumber} onChange={updateForm} className={`${inputClass} mt-1.5`} placeholder="Optional" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Contact email
              <input type="email" maxLength={254} name="contactEmail" value={form.contactEmail} onChange={updateForm} className={`${inputClass} mt-1.5`} placeholder="contact@example.org" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Contact phone
              <input type="tel" maxLength={40} name="contactPhone" value={form.contactPhone} onChange={updateForm} className={`${inputClass} mt-1.5`} placeholder="+91 98765 43210" />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Service area
              <input maxLength={200} name="serviceArea" value={form.serviceArea} onChange={updateForm} className={`${inputClass} mt-1.5`} placeholder="District, city, or response zone" />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Link registered NGO operator account
              <select name="profileId" value={form.profileId} onChange={updateForm} className={`${inputClass} mt-1.5`}>
                <option value="">No account yet — save as pending</option>
                {ngoUsers.map((ngoUser) => <option key={ngoUser.id} value={ngoUser.id}>{ngoUser.name} · {ngoUser.email || ngoUser.id}</option>)}
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">Register the operator through the app first. Linking approves the membership so the account can view and claim requests.</span>
            </label>
            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:col-span-2">{error}</p>}
            <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
              <button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60">
                {saving && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
                {saving ? 'Saving…' : 'Save partner'}
              </button>
            </div>
          </form>
        </AdminPanel>
      )}

      {error && !formOpen && (
        <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <p>{error}</p>
          <div className="flex shrink-0 items-center gap-3">
            <button type="button" onClick={() => { setError(''); setLoading(true); setReloadKey((key) => key + 1) }} className="font-semibold underline">Retry</button>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={17} /></button>
          </div>
        </div>
      )}

      <div className="mb-6 mt-6 grid gap-4 sm:grid-cols-3">
        <AdminMetric label="Registered partners" value={partners.length} detail="From Supabase" />
        <AdminMetric label="Active partners" value={activeCount} detail="Ready to coordinate" tone="emerald" />
        <AdminMetric label="Under review" value={pendingCount} detail="Awaiting approval" tone="amber" />
      </div>

      <AdminPanel title="Partner directory" description="Records below are read directly from the Supabase database.">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-100 sm:max-w-md">
            <Search size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
            <span className="sr-only">Search partners</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="Search partners or service areas"
            />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={16} /></button>}
          </label>
          <p className="text-sm font-medium text-slate-500" aria-live="polite">
            Showing <span className="font-bold text-slate-800">{visiblePartners.length}</span> of {partners.length} partners
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> Loading partners from Supabase…
          </div>
        ) : (
          <>
            <ul className="grid gap-3 md:hidden">
              {visiblePartners.map((partner) => (
                <li key={partner.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Avatar name={partner.name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold leading-snug text-slate-900">{partner.name}</p>
                      <p className="text-xs text-slate-400">{partner.registration_number || partner.id}</p>
                    </div>
                    <select aria-label={`Update status for ${partner.name}`} value={partner.status} onChange={(event) => updatePartnerStatus(partner, event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
                      <option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                    {partner.contact_email && <div className="flex items-start gap-2"><User size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" /><div className="min-w-0"><dt className="text-xs text-slate-400">Contact email</dt><dd className="break-all font-medium text-slate-700">{partner.contact_email}</dd></div></div>}
                    {partner.service_area && <div className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" /><div><dt className="text-xs text-slate-400">Service area</dt><dd className="font-medium text-slate-700">{partner.service_area}</dd></div></div>}
                    {partner.contact_phone && <div className="flex items-start gap-2"><Phone size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" /><div><dt className="text-xs text-slate-400">Phone</dt><dd className="font-medium text-slate-700">{partner.contact_phone}</dd></div></div>}
                  </dl>
                  {partner.contact_phone && <a href={telHref(partner.contact_phone)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"><Phone size={16} aria-hidden="true" /> Call coordinator</a>}
                  <button
                    type="button"
                    aria-expanded={openPartnerId === partner.id}
                    onClick={() => setOpenPartnerId((current) => current === partner.id ? '' : partner.id)}
                    className="mt-4 w-full rounded-xl border border-sky-200 px-4 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-50"
                  >
                    {openPartnerId === partner.id ? 'Close operator access' : `Manage operator access (${memberships.filter((item) => item.partner_id === partner.id && item.status === 'active').length} active)`}
                  </button>
                  {openPartnerId === partner.id && <div className="mt-3">{renderMemberAccess(partner)}</div>}
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 md:block">
              <table className={tableClass}>
                <thead className={tableHeadClass}>
                  <tr>
                    <th className="px-4 pb-3 pt-3">Organisation</th>
                    <th className="pb-3 pt-3">Contact email</th>
                    <th className="pb-3 pt-3">Phone</th>
                    <th className="pb-3 pt-3">Service area</th>
                    <th className="pb-3 pr-4 pt-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePartners.map((partner) => (
                    <Fragment key={partner.id}>
                    <tr key={partner.id} className={`${tableRowClass} transition hover:bg-sky-50/60`}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={partner.name} />
                          <div>
                            <span className="font-semibold text-slate-800">{partner.name}</span>
                            <span className="block text-xs text-slate-400">{partner.registration_number || partner.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-slate-600">{partner.contact_email || '—'}</td>
                      <td className="py-4">{partner.contact_phone ? <a href={telHref(partner.contact_phone)} className="text-slate-600 hover:text-sky-700 hover:underline">{partner.contact_phone}</a> : <span className="text-slate-400">—</span>}</td>
                      <td className="py-4 text-slate-600">{partner.service_area || '—'}</td>
                      <td className="py-4 pr-4">
                        <select aria-label={`Update status for ${partner.name}`} value={partner.status} onChange={(event) => updatePartnerStatus(partner, event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
                          <option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option>
                        </select>
                        <button
                          type="button"
                          aria-expanded={openPartnerId === partner.id}
                          onClick={() => setOpenPartnerId((current) => current === partner.id ? '' : partner.id)}
                          className="mt-2 block text-left text-xs font-semibold text-sky-700 hover:underline"
                        >
                          Manage members ({memberships.filter((item) => item.partner_id === partner.id && item.status === 'active').length} active)
                        </button>
                      </td>
                    </tr>
                    {openPartnerId === partner.id && (
                      <tr className="bg-slate-50">
                        <td colSpan={5} className="px-4 py-3">{renderMemberAccess(partner)}</td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {visiblePartners.length === 0 && (
              <div className="grid place-items-center gap-2 py-10 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Search size={26} aria-hidden="true" /></span>
                <p className="font-semibold text-slate-700">{query ? 'No partners match that search' : 'No NGO partners saved yet'}</p>
                {query
                  ? <button type="button" onClick={() => setQuery('')} className="text-sm font-semibold text-sky-700 hover:underline">Clear search</button>
                  : <p className="text-sm text-slate-500">Use “Add partner” to create the first database record.</p>}
              </div>
            )}
          </>
        )}
      </AdminPanel>
    </>
  )
}
