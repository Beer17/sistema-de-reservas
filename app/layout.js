import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "Sistema de Reservas",
    template: "%s · Sistema de Reservas",
  },
  applicationName: "Sistema de Reservas",
  description:
    "Plataforma para reservar horarios disponibles. Reserva, reprograma y recibe notificaciones.",
  keywords: [
    "reservas",
    "horarios",
    "disponibilidad",
    "programación",
  ],
  authors: [{ name: "Sistema de Reservas" }],
  openGraph: {
    title: "Sistema de Reservas",
    description:
      "Reserva tu horario, reprograma y recibe avisos cuando se liberen espacios.",
    type: "website",
    locale: "es_ES",
    siteName: "Sistema de Reservas",
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
