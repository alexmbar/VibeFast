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
    primary: "#714B67", // ciruela Odoo (inspirado en su paleta de marca)
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
    aiChat: true, // Chat AI en /chat, con tool use (lib/tools)
    toolUse: true, // Tool use registry — usado por /api/ai/chat
    agents: false, // LangGraph agents — no usado
    agenteGastos: true, // Agente de solo lectura en /agente, consulta gastos
    mcp: false, // Servidor MCP en /api/mcp — no usado
    rag: false, // RAG con pgvector — no usado
    posthog: true, // Tracking — opcional
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
    afterLoginUrl: "/transacciones",
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
      eyebrow: "Control de Gastos por WhatsApp",
      title: "Tus gastos, tu efectivo y tus tarjetas, bajo control.",
      subtitle:
        "Captura gastos, retiros de efectivo e ingresos por WhatsApp — texto, foto de ticket o PDF del estado de cuenta. Consulta reportes, cartera y bancos en la web.",
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
          icon: "Wallet",
          title: "Efectivo y tarjetas mezclados",
          body: "No sabes cuánto traes en la cartera ni cuánto debes en la tarjeta de crédito, todo se ve igual.",
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
      title: "Control total de tu dinero.",
      subtitle: "Captura rápida, reportes inteligentes, visibilidad total.",
      items: [
        {
          icon: "MessageCircle",
          title: "Captura por WhatsApp",
          body: "Envía un mensaje: '500 oxxo'. Foto del ticket. PDF del estado de cuenta. El bot entiende todo y lo registra solo.",
        },
        {
          icon: "Wallet",
          title: "Retiros y Cartera",
          body: "Registra tus retiros de efectivo y ve tu saldo disponible en tiempo real, sin mezclarlo con tus gastos.",
        },
        {
          icon: "CreditCard",
          title: "Bancos y tarjetas",
          body: "Catálogo de tus cuentas de débito y tarjetas de crédito, con límite, día de corte y fecha límite de pago.",
        },
        {
          icon: "Repeat",
          title: "Gastos e ingresos recurrentes",
          body: "Nómina, renta y suscripciones se generan solas cada semana o quincena, marcadas como pendientes hasta que confirmas el monto.",
        },
        {
          icon: "BarChart3",
          title: "Reportes detallados",
          body: "Ve tu gasto por categoría, tipo de pago, banco o tienda, con tablas ordenables y balance neto de ingresos contra gastos.",
        },
        {
          icon: "Bot",
          title: "Agente conversacional",
          body: "Pregúntale a tu agente de gastos en lenguaje natural y consulta tu historial sin abrir reportes.",
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
          a: "Envías un mensaje con el gasto ('500 oxxo'), una foto del ticket o el PDF de tu estado de cuenta. También puedes registrar un retiro de efectivo ('retiro 2000 bbva'). Nuestro AI extrae monto, tienda y categoría, y te confirma por WhatsApp.",
        },
        {
          q: "¿Qué es la Cartera y cómo funciona?",
          a: "Es tu saldo de efectivo disponible: se calcula solo con tus retiros menos lo que gastas en efectivo, así que siempre está actualizado sin que captures nada extra.",
        },
        {
          q: "¿Cómo funcionan los gastos e ingresos recurrentes?",
          a: "Das de alta la regla una vez (nómina cada quincena, renta el día 5) y cada ocurrencia se genera sola, marcada como pendiente hasta que confirmas el monto real.",
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
            "La Cartera me resolvió algo que ninguna otra app: por fin sé cuánto efectivo traigo sin tener que contarlo.",
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
        "Login con Google, envía tu primer gasto por WhatsApp, y empieza a ver tus reportes, cartera y bancos. No hay nada que configurar.",
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