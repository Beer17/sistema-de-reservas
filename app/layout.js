import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "Agenda de Entregas",
    template: "%s · Agenda de Entregas",
  },
  applicationName: "Agenda de Entregas",
  description:
    "Plataforma para que los estudiantes programen la presentación de sus entregas en los horarios disponibles. Reserva, reprograma y recibe notificaciones.",
  keywords: [
    "agenda",
    "entregas",
    "estudiantes",
    "horarios",
    "universidad",
    "programación",
  ],
  authors: [{ name: "Agenda de Entregas" }],
  openGraph: {
    title: "Agenda de Entregas",
    description:
      "Reserva tu horario de entrega, reprograma y recibe avisos cuando se liberen espacios.",
    type: "website",
    locale: "es_ES",
    siteName: "Agenda de Entregas",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
  colorScheme: "dark",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
