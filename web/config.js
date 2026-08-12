// ============================================================
// VibeFast · config.js
// ------------------------------------------------------------
// ESTE ES EL ARCHIVO MÁS IMPORTANTE DEL BOILERPLATE.
// Todo el branding, copy, features y configuración del producto vive aquí.
// Cambiar este archivo cambia el producto entero — sin abrir JSX.
//
// Estructura:
//   - app:      identidad del producto (nombre, descripción, dominio, color)
//   - features: toggles para encender/apagar funcionalidades
//   - ai:       configuración de OpenAI
//   - email:    configuración de Resend
//   - auth:     providers habilitados
//   - landing:  copy de la página pública
//   - pricing:  planes (si features.payments está activo)
//
// Tip Sem 1: empieza editando `app` y `landing.hero` con los datos de tu producto.
// ============================================================

const config = {
  // -----------------------------------------------------------
  // Identidad del producto
  // -----------------------------------------------------------
  app: {
    name: "Controla Gasto",
    description:
      "App de control de gastos personales. Los gastos entran por WhatsApp y se consultan en reportes web.",
    domain: "controlagasto.dev", // sin https://, sin www
    locale: "es", // "es" | "en"
    // URL pública: usa NEXT_PUBLIC_APP_URL en .env. En este config solo definimos el default.
    defaultUrl: "http://localhost:3000",
  },

  // -----------------------------------------------------------
  // Identidad visual
  // -----------------------------------------------------------
  brand: {
    // Color primario en HEX. DaisyUI lo aplica como --color-primary via theme.
    primary: "#0ea5e9", // sky-500 (azul cielo)
    // Logo: puede ser texto o ruta a /public/logo.svg
    logoText: "Controla Gasto",
    logoSrc: null,
    // Estilo del bordeado global (DaisyUI usa esto para botones, cards)
    radius: "1rem",
  },

  // -----------------------------------------------------------
  // Toggles de features — encienden/apagan rutas y componentes
  // -----------------------------------------------------------
  features: {
    waitlist: true, // Captura emails en landing
    googleAuth: true, // Login con Google — necesario
    emailLogin: false, // Magic link email — opcional
    aiChat: false, // Chat AI en /chat — no usado
    toolUse: false, // Tool use registry — no usado
    agents: false, // LangGraph agents — no usado
    mcp: false, // Servidor MCP en /api/mcp — no usado
    rag: false, // RAG con pgvector — no usado
    posthog: false, // Tracking — opcional
    resend: true, // Email — para confirmaciones (Phase 2)
    pricing: false, // Muestra la sección de precios en la landing
    payments: false, // Stripe — no usado
    hardware: false, // ESP-Claw bridge — no usado
  },

  // -----------------------------------------------------------
  // OpenAI
  // -----------------------------------------------------------
  ai: {
    chatModel: "gpt-4o-mini", // default barato y rápido
    structuredModel: "gpt-4o-mini",
    agentModel: "gpt-4o", // los agentes razonan mejor con full gpt-4o
    embeddingModel: "text-embedding-3-small",
    maxTokens: 1500,
    temperature: 0.4,
  },

  // -----------------------------------------------------------
  // Resend (email transaccional)
  // -----------------------------------------------------------
  email: {
    // Asegúrate de tener el dominio verificado en Resend antes de cambiar `from`.
    // En desarrollo Resend permite enviar a tu propio correo desde `onboarding@resend.dev`.
    from: "Controla Gasto <onboarding@resend.dev>",
    replyTo: "hola@vibefast.dev",
    supportEmail: "soporte@vibefast.dev",
  },

  // -----------------------------------------------------------
  // Auth providers
  // -----------------------------------------------------------
  auth: {
    loginUrl: "/login",
    afterLoginUrl: "/gastos",
    afterLogoutUrl: "/",
    providers: ["google"], // se sincroniza con features.googleAuth / emailLogin
  },

  // -----------------------------------------------------------
  // Landing — todo el copy de la página pública
  // -----------------------------------------------------------
  landing: {
    nav: [
      { label: "Características", href: "#features" },
      { label: "Precios", href: "#pricing" },
      { label: "Preguntas", href: "#faq" },
      { label: "Docs", href: "/docs" },
    ],
    hero: {
      eyebrow: "Control de Gastos",
      title: "Tus gastos, bajo control.",
      subtitle:
        "Captura gastos por WhatsApp, foto de ticket o texto. Consulta reportes web. Controla tu dinero sin esfuerzo.",
      cta: { label: "Empezar", href: "/login" },
      ctaSecondary: { label: "Ver docs", href: "/docs" },
    },
    problem: {
      eyebrow: "El problema",
      title: "Perder dinero sin darte cuenta.",
      subtitle:
        "Gastas en OXXO, restaurantes, gasolina y no sabes en qué se te va el dinero. Necesitas visibilidad.",
      items: [
        {
          icon: "PieChart",
          title: "Sin categorización",
          body: "Los recibos se pierden. No sabes cuánto gastaste en comida vs. transporte.",
        },
        {
          icon: "BarChart",
          title: "Sin reportes",
          body: "No ves patrones. ¿Cuánto invertiste en tecnología este mes? No hay forma de saberlo.",
        },
        {
          icon: "Zap",
          title: "Captura lenta",
          body: "Abrir una app para cada gasto. Mejor si solo envías un mensaje y listo.",
        },
      ],
    },
    features: {
      eyebrow: "Lo que tienes",
      title: "Control total de tus gastos.",
      subtitle: "Captura rápida, reportes inteligentes, visibilidad total.",
      items: [
        {
          icon: "MessageCircle",
          title: "Captura por WhatsApp",
          body: "Envía un mensaje: '500 oxxo'. Foto del ticket. PDF del estado de cuenta. El bot entiende todo.",
        },
        {
          icon: "BarChart3",
          title: "Reportes detallados",
          body: "Ve tu gasto por categoría, tipo de pago, tienda, período. Descubre patrones en tu dinero.",
        },
        {
          icon: "Filter",
          title: "Filtros potentes",
          body: "Busca por fecha, categoría, banco, tienda. Segmenta tus gastos como quieras.",
        },
        {
          icon: "Tag",
          title: "Categorización automática",
          body: "AI entiende el contexto. 'Starbucks' es entretenimiento. 'Uber' es transporte.",
        },
        {
          icon: "Lock",
          title: "Privado y seguro",
          body: "Solo tú ves tus gastos. Cifrado de punta a punta. Sin rastreo ni publicidad.",
        },
        {
          icon: "Zap",
          title: "Sincronización en tiempo real",
          body: "Captura en el acto. Reportes actualizados al instante. Acceso desde cualquier dispositivo.",
        },
      ],
    },
    faq: {
      eyebrow: "Preguntas frecuentes",
      title: "Lo que todos preguntan.",
      items: [
        {
          q: "¿Cuánto cuesta usar Controla Gasto?",
          a: "Completamente gratis. Captura ilimitada, reportes ilimitados, sin publicidad ni modelos freemium.",
        },
        {
          q: "¿Mis datos están seguros?",
          a: "Sí. Solo tú ves tus gastos (Row Level Security). Alojados en Supabase con certificación de seguridad. Nunca vendemos tus datos.",
        },
        {
          q: "¿Cómo funciona la captura por WhatsApp?",
          a: "Envías un mensaje con el gasto ('500 oxxo') o foto del ticket. Nuestro AI extrae monto, tienda, categoría. Listo en 1 segundo.",
        },
        {
          q: "¿Puedo exportar mis datos?",
          a: "Sí. Descarga tus gastos en CSV o JSON cuando quieras. Es tu dinero, tus datos.",
        },
      ],
    },
    socialProof: {
      text: "Confían en Controla Gasto",
      logos: ["Freelancers", "Emprendedores", "Profesionales independientes", "PYMEs"],
    },
    testimonials: {
      eyebrow: "Historias reales",
      title: "Cómo Controla Gasto cambió la forma de ver el dinero.",
      subtitle: "Usuarios que ahora saben dónde va cada peso.",
      items: [
        {
          quote:
            "Llevo 3 meses usando Controla Gasto. Descubrí que gasto 2.5K al mes en cafés. Ahora lo veo todo claro.",
          author: "Marina López",
          role: "Freelancer de diseño",
        },
        {
          quote:
            "El reporte mensual me muestra exactamente en qué se va mi dinero. Ya no me sorprendo al fin de mes.",
          author: "Carlos Ruiz",
          role: "Emprendedor",
        },
        {
          quote:
            "Capturar por WhatsApp es perfecto. No tengo que abrir otra app. Solo envío el ticket y listo.",
          author: "Sofía Mendez",
          role: "Consultora independiente",
        },
      ],
    },
    finalCta: {
      eyebrow: "Comienza hoy",
      title: "Toma el control de tu dinero en 1 minuto.",
      subtitle:
        "Login con Google, envía tu primer gasto por WhatsApp, y empieza a ver tus reportes. No hay nada que configurar.",
      cta: { label: "Empezar ahora", href: "/login" },
      ctaSecondary: { label: "Leer las docs", href: "/docs" },
    },
    waitlist: {
      eyebrow: "Únete primero",
      title: "Sé de los primeros en saber.",
      subtitle: "Te avisamos cuando abramos cupos para la siguiente cohorte.",
      successMessage: "¡Listo! Te avisamos en cuanto haya novedades.",
      alreadyRegisteredMessage: "Ya estás registrado, ya casi estamos listos.",
      buttonLabel: "Quiero entrar",
      placeholder: "tu@email.com",
    },
    footer: {
      tagline: "Tus gastos, tu dinero, tu control.",
      columns: [
        {
          title: "Producto",
          links: [
            { label: "Características", href: "#features" },
            { label: "Seguridad", href: "#security" },
            { label: "Preguntas", href: "#faq" },
          ],
        },
        {
          title: "Recursos",
          links: [
            { label: "Docs", href: "/docs" },
            { label: "Guía de uso", href: "/docs/guia" },
            { label: "Soporte", href: "mailto:hola@controlagasto.dev" },
          ],
        },
        {
          title: "Legal",
          links: [
            { label: "Privacidad", href: "/privacy" },
            { label: "Términos", href: "/terms" },
            { label: "GitHub", href: "https://github.com/arampersand/VibeFast", external: true },
          ],
        },
      ],
      // Compat: links planos usados en el bar inferior
      links: [
        { label: "Docs", href: "/docs" },
        { label: "Soporte", href: "mailto:hola@controlagasto.dev" },
      ],
    },
  },

  // -----------------------------------------------------------
  // Pricing — vitrina de planes.
  // Se muestra en la landing si features.pricing === true.
  // El cobro real (Stripe) depende de features.payments.
  // -----------------------------------------------------------
  pricing: {
    eyebrow: "Precios",
    title: "Simple y sin sorpresas.",
    subtitle: "Empieza gratis. Sube de plan cuando tu producto crezca.",
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: 0,
        currency: "USD",
        interval: "mes",
        description: "Para probar el producto.",
        features: ["Hasta 100 usuarios", "Soporte por email", "Branding VibeFast"],
        cta: "Empezar gratis",
      },
      {
        id: "pro",
        name: "Pro",
        price: 29,
        currency: "USD",
        interval: "mes",
        description: "Para founders que ya facturan.",
        features: ["Usuarios ilimitados", "Soporte prioritario", "Sin branding"],
        cta: "Probar Pro",
        highlighted: true,
        stripePriceId: "", // llenar cuando se active payments
      },
    ],
  },
}

export default config
