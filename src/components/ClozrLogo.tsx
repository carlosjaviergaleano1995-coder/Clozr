interface ClozrLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon'
  className?: string
}

// Tamaños para el logo completo (full)
const FULL_SIZES = {
  sm: { height: 20, viewW: 420, viewH: 80 },
  md: { height: 28, viewW: 420, viewH: 80 },
  lg: { height: 40, viewW: 420, viewH: 80 },
  xl: { height: 56, viewW: 420, viewH: 80 },
}

// Tamaños para el ícono solo (Z)
const ICON_SIZES = {
  sm: 24,
  md: 32,
  lg: 44,
  xl: 64,
}

export function ClozrLogo({ size = 'md', variant = 'full', className = '' }: ClozrLogoProps) {
  if (variant === 'icon') {
    const s = ICON_SIZES[size]
    return (
      <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path
          d="M78 18 L82 18 L82 25 L45 65 L48 65 L82 65 L82 82 L18 82 L18 75 L55 35 L52 35 L18 35 L18 18 Z"
          fill="#E8001D"
        />
      </svg>
    )
  }

  // Logo completo: clo Z r — reproducido fielmente al SVG original
  const { height, viewW, viewH } = FULL_SIZES[size]
  const ratio = viewW / viewH
  const width = height * ratio

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${viewW} ${viewH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* c */}
      <path
        d="M42 22 C26 22 14 34 14 50 C14 66 26 78 42 78 C53 78 62 72 67 63 L55 56 C52 61 48 64 42 64 C34 64 28 58 28 50 C28 42 34 36 42 36 C48 36 52 39 55 44 L67 37 C62 28 53 22 42 22 Z"
        fill="#f5f5f5"
      />
      {/* l */}
      <path d="M78 16 L78 78 L92 78 L92 16 Z" fill="#f5f5f5" />
      {/* o */}
      <path
        d="M130 22 C113 22 100 35 100 50 C100 65 113 78 130 78 C147 78 160 65 160 50 C160 35 147 22 130 22 Z M130 64 C121 64 114 58 114 50 C114 42 121 36 130 36 C139 36 146 42 146 50 C146 58 139 64 130 64 Z"
        fill="#f5f5f5"
      />
      {/* Z — rojo */}
      <path
        d="M170 22 L170 34 L198 34 L168 66 L168 78 L214 78 L214 66 L186 66 L216 34 L216 22 Z"
        fill="#E8001D"
      />
      {/* r */}
      <path
        d="M226 36 L226 78 L240 78 L240 54 C240 44 247 38 257 38 L264 38 L264 24 L258 24 C250 24 244 28 240 35 L240 36 Z"
        fill="#f5f5f5"
      />
    </svg>
  )
}

// Ícono cuadrado para el app icon / favicon
export function ClozrAppIcon({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl ${className}`}
      style={{ width: size, height: size, background: '#0a0a0a', border: '1px solid #2a2a2e' }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 100 100" fill="none">
        <path
          d="M78 18 L82 18 L82 25 L45 65 L48 65 L82 65 L82 82 L18 82 L18 75 L55 35 L52 35 L18 35 L18 18 Z"
          fill="#E8001D"
        />
      </svg>
    </div>
  )
}
