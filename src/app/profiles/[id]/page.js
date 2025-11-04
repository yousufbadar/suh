'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import EntityView from '@/components/EntityView'
import { createClient } from '@/lib/supabase/client'

export default function ProfileViewPage() {
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
    } catch (error) {
      console.error('Error checking user:', error)
    }
  }

  const loadEntity = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const query = supabase
        .from('profiles')
        .select('*')
        .eq('id', params.id)
      
      // If user is logged in, only allow them to view their own profiles
      // If not logged in, allow viewing (for public profiles)
      if (user) {
        query.eq('user_id', user.id)
      }
      
      const { data, error } = await query.single()

      if (error) {
        console.error('Error loading entity:', error)
        setLoading(false)
        return
      }

      setEntity(data)
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/profiles')
  }

  const handleEdit = (entity) => {
    router.push(`/profiles/edit/${entity.id}`)
  }

  const handleDelete = async (id) => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/profiles')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({ active: false, deactivated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)

      if (!error) {
        router.push('/profiles')
      }
    } catch (error) {
      console.error('Error deleting entity:', error)
    }
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
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Profile not found</p>
          <button onClick={handleBack}>Back to Profiles</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <EntityView
        entity={entity}
        onBack={handleBack}
        onEdit={handleEdit}
        onDelete={handleDelete}
        currentUser={currentUser}
      />
    </div>
  )
}

