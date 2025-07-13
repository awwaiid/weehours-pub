import '../styles/globals.css';

export const metadata = {
  title: 'WeeHours Pub Chat',
  description: 'Scheming over pints with your pals',
  other: {
    'base-path': process.env.BASE_PATH || ''
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  const basePath = process.env.BASE_PATH || '';
  
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__BASE_PATH__ = '${basePath}';`
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}