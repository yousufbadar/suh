'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FaLock, FaCheck, FaTimes } from 'react-icons/fa'

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [generalError, setGeneralError] = useState('')

  useEffect(() => {
    // Check if we have the required tokens from Supabase
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const type = hashParams.get('type')

    if (type !== 'recovery' || !accessToken) {
      setGeneralError('Invalid or expired reset link. Please request a new password reset.')
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setGeneralError('')

    // Validation
    const newErrors = {}
    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // Get tokens from URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (!accessToken) {
        throw new Error('Invalid reset link. Please request a new password reset.')
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push('/profiles')
      }, 2000)
    } catch (error) {
      setGeneralError(error.message || 'Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="success-icon">
            <FaCheck />
          </div>
          <h1>Password Reset Successful!</h1>
          <p>Your password has been updated. Redirecting to profiles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <h1>Reset Your Password</h1>
        <p>Enter your new password below</p>

        {generalError && (
          <div className="general-error">{generalError}</div>
        )}

        <form onSubmit={handleSubmit} className="reset-password-form">
          <div className="form-group">
            <label htmlFor="password">
              <FaLock className="input-icon" />
              New Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={errors.password ? 'error' : ''}
              placeholder="Enter new password (min 6 characters)"
              minLength={6}
              required
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              <FaLock className="input-icon" />
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={errors.confirmPassword ? 'error' : ''}
              placeholder="Confirm new password"
              minLength={6}
              required
            />
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>

          <button
            type="submit"
            className="reset-password-button"
            disabled={isLoading || !password || !confirmPassword}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/profiles')}
            className="cancel-button"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  )
}

