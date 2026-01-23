'use client'

import { Leva } from 'leva'
import { useSearchParams } from 'next/navigation'

export function LevaClient() {
  const isDev = useSearchParams().has('dev')

  return <Leva hidden={!isDev} />
}
