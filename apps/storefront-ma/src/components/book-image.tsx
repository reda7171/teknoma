'use client'

import Image from 'next/image'
import { useState } from 'react'

type BookImageProps = {
  src?: string | null
  alt: string
  title: string
  className?: string
  sizes: string
  priority?: boolean
}

export function BookImage({ src, alt, title, className, sizes, priority = false }: BookImageProps) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <span className="book-image-fallback" role="img" aria-label={alt || title}>
        <span>{title.slice(0, 2)}</span>
        <small>TEKNO</small>
      </span>
    )
  }

  return (
    <Image
      className={className}
      src={src}
      alt={alt || title}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
    />
  )
}
