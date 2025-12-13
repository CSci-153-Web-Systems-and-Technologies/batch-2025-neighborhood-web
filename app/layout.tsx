import "./globals.css";
import Header from "./components/Header";
import { Poppins, Bodoni_Moda } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-boldonse",
});

export const metadata = {
  title: "Neighborhood",
  description: "Explore, find, and connect with your local market",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.className} ${bodoni.variable}`}>
      <body>
        <Header />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
