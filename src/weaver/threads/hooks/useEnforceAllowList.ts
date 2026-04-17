import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/weaver/signals/lib/auth/supabaseClient.js';

export function useEnforceAllowList() {
  const [allowed, setAllowed] = useState({ emails: [], domains: [] })
  const [loaded, setLoaded] = useState(false)
  const subRef = useRef(null)

  useEffect(() => {
    supabase
      .from('allowed_emails')
      .select('email_suffix')
      .then(({ data = [], error }) => {
        if (error) {
          console.error('Failed to load allow-list', error)
          return
        }
        const emails = []
        const domains = []
        data.forEach(({ email_suffix }) => {
          const s = email_suffix.trim().toLowerCase()
          if (s.includes('@') && !s.startsWith('@')) {
            emails.push(s)
          } else {
            domains.push(s.replace(/^@/, ''))
          }
        })
        setAllowed({ emails, domains })
        setLoaded(true)
      })
  }, [])

  useEffect(() => {
    if (!loaded) return

    if (subRef.current) {
      subRef.current.unsubscribe()
    }

    const { subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email?.toLowerCase()
      if (!email) return

      const domain = email.split('@')[1] || ''
      const okFullEmail = allowed.emails.includes(email)
      const okDomain = allowed.domains.some(suffix =>
        domain === suffix || domain.endsWith(`.${suffix}`)
      )

      if (!okFullEmail && !okDomain) {
        console.warn(`Email ${email} no longer allowed — signing out`)
        supabase.auth.signOut()
      }
    })

    subRef.current = subscription
    return () => subscription.unsubscribe()
  }, [loaded, allowed.emails.join(','), allowed.domains.join(',')])
}
