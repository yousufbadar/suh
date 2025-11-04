'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import EntityList from '@/components/EntityList'
import LoginSupabase from '@/components/LoginSupabase'
import { FaSignOutAlt, FaUser, FaSignInAlt } from 'react-icons/fa'

export const dynamic = 'force-dynamic'

export default function ProfilesPage() {
  const router = useRouter()
  const [entities, setEntities] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true)
      checkUser()
      loadEntities()
    }
  }, [])

  const checkUser = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      setLoading(false)
    } catch (error) {
      console.error('Error checking user:', error)
      setLoading(false)
    }
  }

  const loadEntities = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setEntities([])
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading entities:', error)
      } else {
        setEntities(data || [])
      }
    } catch (error) {
      console.error('Error loading entities:', error)
    }
  }

  const handleLoginSuccess = async () => {
    await checkUser()
    await loadEntities()
    setShowLogin(false)
  }

  const handleLogout = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.auth.signOut()
      setCurrentUser(null)
      setEntities([])
      router.push('/')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const handleViewEntity = (entity) => {
    router.push(`/profiles/${entity.id}`)
  }

  const handleEditEntity = (entity) => {
    router.push(`/profiles/edit/${entity.id}`)
  }

  const handleDeleteEntity = (id) => {
    // Will be handled by EntityList component
  }

  const handleReactivateEntity = async (id) => {
    const { error } = await supabase
      .from('profiles')
      .update({ active: true, reactivated_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      loadEntities()
    }
  }

  const handleRegisterNew = () => {
    if (!currentUser) {
      setShowLogin(true)
      return
    }
    router.push('/profiles/new')
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

  return (
    <div className="container">
      {showLogin && (
        <LoginSupabase 
          onLoginSuccess={handleLoginSuccess} 
          onClose={() => setShowLogin(false)}
        />
      )}
      <nav className="app-nav">
        <button onClick={() => router.push('/')} className="nav-button">
          Home
        </button>
        <button onClick={() => router.push('/profiles')} className="nav-button active">
          Profiles
        </button>
        {currentUser ? (
          <>
            <button onClick={handleRegisterNew} className="nav-button">
              Create Profile
            </button>
            <div className="user-info">
              <span className="username">
                <FaUser /> {currentUser.user_metadata?.username || currentUser.email}
              </span>
              <button onClick={handleLogout} className="logout-button">
                <FaSignOutAlt /> Logout
              </button>
            </div>
          </>
        ) : (
          <button onClick={() => setShowLogin(true)} className="nav-button login-button-nav">
            <FaSignInAlt /> Sign In
          </button>
        )}
      </nav>

      <h1 className="app-title">Speak your heart online</h1>
      <p className="app-subtitle">
        {currentUser 
          ? `Welcome back, ${currentUser.user_metadata?.username || currentUser.email}! View and manage your profiles`
          : 'View and manage your profiles'}
      </p>

      {!currentUser ? (
        <div className="auth-prompt">
          <p>Please sign in to view and manage your profiles</p>
          <button onClick={() => setShowLogin(true)} className="auth-prompt-button">
            <FaSignInAlt /> Sign In
          </button>
        </div>
      ) : (
        <EntityList
          entities={entities}
          onViewEntity={handleViewEntity}
          onEditEntity={handleEditEntity}
          onDeleteEntity={handleDeleteEntity}
          onReactivateEntity={handleReactivateEntity}
        />
      )}
    </div>
  )
}

