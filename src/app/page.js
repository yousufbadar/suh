'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Home from '@/components/Home'

export default function Page() {
  const router = useRouter()

  const handleGetStarted = () => {
    router.push('/profiles')
  }

  return <Home onGetStarted={handleGetStarted} />
}

