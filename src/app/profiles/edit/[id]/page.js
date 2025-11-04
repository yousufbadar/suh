'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import to avoid SSR issues
const RegistrationForm = dynamic(() => import('@/components/RegistrationForm'), {
  ssr: false
})

export const dynamic = 'force-dynamic'

export default function EditProfilePage() {
  const router = useRouter()
  const params = useParams()
  const [entity, setEntity] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true)
      loadEntity()
      checkUser()
    }
  }, [params.id])

  const checkUser = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      if (!user) {
        router.push('/profiles')
      }
    } catch (error) {
      console.error('Error checking user:', error)
      setLoading(false)
    }
  }

  const loadEntity = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error loading entity:', error)
        router.push('/profiles')
        return
      }

      if (!data) {
        router.push('/profiles')
        return
      }

      setEntity(data)
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleSave = () => {
    router.push(`/profiles/${params.id}`)
  }

  const handleCancel = () => {
    router.push(`/profiles/${params.id}`)
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

  if (!entity) {
    return null
  }

  return (
    <div className="container">
      <h1 className="app-title">Edit Profile</h1>
      <p className="app-subtitle">Update your profile information</p>
      <RegistrationForm
        entity={entity}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}

