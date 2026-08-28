import type { ComponentProps } from 'react'

type IconProps = ComponentProps<'svg'>

/**
 * Ícones desenhados à mão em SVG para evitar uma dependência de biblioteca de
 * ícones. Todos usam `currentColor` e traço de 1.75 para ficarem legíveis em
 * tamanho pequeno na barra inferior.
 */
function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      width={22}
      height={22}
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconHome = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.8V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.8" />
    <path d="M9.5 21v-6h5v6" />
  </Icon>
)

export const IconBox = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
    <path d="m3 7.5 9 4.5 9-4.5" />
    <path d="M12 12v9" />
  </Icon>
)

export const IconCart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.55L20.5 8H6" />
    <circle cx="10" cy="20" r="1.2" />
    <circle cx="17" cy="20" r="1.2" />
  </Icon>
)

/**
 * Chave de boca. Desenhada na vertical e girada 45° — de pé fica muito mais
 * fácil acertar a proporção entre a boca e o cabo do que tentando traçar tudo
 * já na diagonal.
 */
export const IconWrench = (p: IconProps) => (
  <Icon {...p}>
    <g transform="rotate(-45 12 12)">
      {/* Silhueta inteira num traço só: lateral da cabeça, ombro que afina
          para o cabo, ponta arredondada, volta pelo outro lado e o entalhe
          semicircular entre os dois dentes. A cabeça precisa ser bem mais
          larga que o cabo — é isso que faz ler como chave, e não como garfo. */}
      <path d="M8.4 3.6V8.6C8.4 10 10.85 10 10.85 11.2V18.3a1.15 1.15 0 0 0 2.3 0V11.2C13.15 10 15.6 10 15.6 8.6V3.6H13.6V6.4a1.6 1.6 0 0 1-3.2 0V3.6Z" />
    </g>
  </Icon>
)

export const IconChef = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 15a4 4 0 1 1 1.2-7.8 4 4 0 0 1 7.6 0A4 4 0 1 1 17 15Z" />
    <path d="M7 15v4a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-4" />
  </Icon>
)

export const IconCamera = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.3-2h7l1.3 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 17.5Z" />
    <circle cx="12" cy="13" r="3.2" />
  </Icon>
)

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const IconMinus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14" />
  </Icon>
)

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Icon>
)

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Icon>
)

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M9.5 7V5h5v2M6.5 7l.8 12a1 1 0 0 0 1 1h7.4a1 1 0 0 0 1-1l.8-12" />
  </Icon>
)

export const IconPencil = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
  </Icon>
)

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 5 7 7-7 7" />
  </Icon>
)

export const IconLogout = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
    <path d="M10 8 6 12l4 4M6 12h9" />
  </Icon>
)

export const IconCopy = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
  </Icon>
)

export const IconList = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </Icon>
)

export const IconArrowLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
)

export const IconAlert = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 8.5v5M12 17h.01" />
    <circle cx="12" cy="12" r="9" />
  </Icon>
)

export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 9 7 7 7-7" />
  </Icon>
)
