'use client'

import { useParams } from 'next/navigation'
import { SAItemDetail } from '@/components/super-admin/SAItemDetail'

export default function SuperAdminItemDetailsPage() {
  const params = useParams()
  const itemId = params.id as string
  return <SAItemDetail itemId={itemId} />
}
