import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "Agenda de Entregas — Sistema de Programación",
  description:
    "Plataforma para que los estudiantes programen la presentación de sus entregas en los horarios disponibles. Reserva, reprograma y recibe notificaciones en tiempo real.",
  keywords: "agenda, entregas, estudiantes, horarios, universidad, programación",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
