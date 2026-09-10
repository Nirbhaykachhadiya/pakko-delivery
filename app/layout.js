import './globals.css';

export const metadata = {
  title: 'Pakko Amdavadi Delivery',
  description: 'Order assignment and delivery tracking',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#235A95',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
