'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import to avoid SSR issues
const RegistrationForm = dynamic(() => import('@/components/RegistrationForm'), {
  ssr: false
})

export const dynamic = 'force-dynamic'

export default function NewProfilePage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check auth on client side only
    if (typeof window !== 'undefined') {
      import('@/lib/supabase/client').then(({ createClient }) => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
          setCurrentUser(user)
          setLoading(false)
          if (!user) {
            router.push('/profiles')
          }
        })
      }).catch(() => {
        setLoading(false)
      })
    }
  }, [router])

  const handleSave = () => {
    router.push('/profiles')
  }

  const handleCancel = () => {
    router.push('/profiles')
  }

  if (!mounted || loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  return (
    <div className="container">
      <h1 className="app-title">Create Your Profile</h1>
      <p className="app-subtitle">
        Share your story and connect with your audience through social media
      </p>
      <RegistrationForm
        entity={null}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}
