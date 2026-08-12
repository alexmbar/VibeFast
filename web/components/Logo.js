// Marca de Controla Gasto: una "C" formada por dos flechas (navy arriba,
// naranja abajo), inspirada en design/propuesta.jpg.
export default function Logo({ className = "size-7" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <path
        d="M18.5 7 A8 8 0 0 0 6.3 8.2"
        stroke="#f97316"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M6.3 8.2 L3.6 7.6 L5.5 5.3"
        stroke="#f97316"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M5.5 16.8 A8 8 0 0 0 17.7 15.8"
        stroke="#1e3a5f"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M17.7 15.8 L20.4 16.4 L18.5 18.7"
        stroke="#1e3a5f"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
