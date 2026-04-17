import { createClient } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export function useSession() {
  const [session, setSession] = useState(null)

  useEffect(() => {

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return session
}
