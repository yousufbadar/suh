'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import SocialMediaIconsPage from '@/components/SocialMediaIconsPage'

function IconsContent() {
  const searchParams = useSearchParams()
  const uuid = searchParams.get('uuid')

  return <SocialMediaIconsPage uuid={uuid} />
}

export const dynamic = 'force-dynamic'

export default function IconsPage() {
  return (
    <Suspense fallback={<div className="social-icons-page"><div className="loading-container"><p>Loading...</p></div></div>}>
      <IconsContent />
    </Suspense>
  )
}

