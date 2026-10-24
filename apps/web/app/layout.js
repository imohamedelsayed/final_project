import './globals.css';
import { CartProvider } from './context/CartContext';
import Header from './components/Header';
import Footer from './components/Footer';

export const metadata = {
  title: 'Pixel Store | Specialist PC Hardware & Enthusiast Computing in Egypt',
  description:
    'Certified gaming PC hardware, GPUs, CPUs, motherboards, and memory in Egypt. Transparent EGP pricing, genuine components, and direct WhatsApp order review.',
  keywords: 'PC hardware Egypt, GPU Cairo, Gaming PC, RTX 4070 Egypt, Computer parts EGP'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="site-wrapper">
        <CartProvider>
          <Header />
          <main className="main-content">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
