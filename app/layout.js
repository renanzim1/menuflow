import './globals.css';

export const metadata = {
  title: 'MenuFlow',
  description: 'Gerador de cardápios digitais para restaurantes'
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
