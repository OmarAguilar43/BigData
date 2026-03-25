import "./globals.css";

export const metadata = {
  title: "Dashboard IOT - Comparación Regresión",
  description: "Análisis Comparativo Térmico Habitación Abierta vs Cerrada",
  manifest: "/manifest.json",
  icons: {
    icon: "/iconos/icon-16x16.png"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body>{children}</body>
    </html>
  );
}
