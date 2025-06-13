import type { Metadata } from "next";
import "./globals.css";




export const metadata: Metadata = {
  title: "SkipDish",
  description: "Grow Your Food Truck Business with SkipDish",
  icons: {
    icon: "/newlogo.png", // this pulls from /public/favicon.png
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>

    <html lang="en">
      
      <body>
        {children}
      </body>
    </html>
    </>
  );
}
