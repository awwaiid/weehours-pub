import '../styles/globals.css';

export const metadata = {
  title: 'WeeHours Pub Chat',
  description: 'Scheming over pints with your pals'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}