import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import config from "@/config"

// Alerta interna cuando un cron corre con errores. `cronNombre` identifica
// el job (ej. "generar-recurrencias"), `errores` es el arreglo de strings
// que ya venia acumulando el cron para el JSON de respuesta.
export default function CronErrorAlert({ cronNombre = "", errores = [] }) {
  const appName = config.app.name

  return (
    <Html lang={config.app.locale}>
      <Head />
      <Preview>{`${appName}: errores en el cron ${cronNombre}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Heading style={h1}>Errores en el cron {cronNombre}</Heading>
            <Text style={text}>
              La ultima corrida termino con {errores.length}{" "}
              {errores.length === 1 ? "error" : "errores"}:
            </Text>
            {errores.map((err, i) => (
              <Text style={errorText} key={i}>
                {err}
              </Text>
            ))}
            <Text style={footer}>{appName} · alerta interna</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: "#f6f6f6", fontFamily: "system-ui, sans-serif" }
const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "32px",
  maxWidth: "560px",
  borderRadius: "12px",
}
const h1 = { fontSize: "20px", fontWeight: "700", color: "#111111" }
const text = { fontSize: "15px", lineHeight: "24px", color: "#444444" }
const errorText = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#b91c1c",
  fontFamily: "monospace",
  marginTop: "4px",
}
const footer = { fontSize: "12px", color: "#999999", marginTop: "24px" }
