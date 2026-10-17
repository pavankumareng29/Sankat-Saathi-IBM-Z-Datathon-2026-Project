import { supabase } from './supabase'

const fail = (message, code) => { const e = new Error(message); e.code = code; throw e }

export const validatePassword = (pw) =>
  pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw)
    ? '' : 'Use at least 8 characters, with letters and numbers.'

async function loadProfile(id) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (error) fail('Could not load your profile. Please try again.', 'PROFILE')
  return data
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession()
  return data.session ? loadProfile(data.session.user.id) : null
}

export async function registerUser({ name, email, phone, password, role, organisation }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(), password,
    options: { data: { name: name.trim(), phone: phone.trim(), role, organisation: organisation?.trim() || '' } },
  })
  if (error) fail(error.message, 'SIGNUP')
  // Supabase returns a user with no identities when the email already exists
  if (data.user?.identities?.length === 0) fail('This email is already registered. Please log in.', 'ACCOUNT_EXISTS')
  if (!data.session) fail('Account created. Check your email to confirm it, then log in.', 'CONFIRM_EMAIL')
  return loadProfile(data.user.id)
}

export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) fail('Incorrect email or password.', 'BAD_CREDENTIALS')
  return loadProfile(data.user.id)
}

export const logoutUser = () => supabase.auth.signOut()

export async function requestPasswordReset(email) {
  await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) fail(error.message, 'UPDATE_PASSWORD')
}