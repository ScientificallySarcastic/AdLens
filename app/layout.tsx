import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource/instrument-serif";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AIPanel from "@/components/AIPanel";

export const metadata: Metadata = { title: "AdLens — Ad Intelligence", description: "AI-powered ad campaign intelligence" };

const themeInit = `(function(){try{var t=localStorage.getItem("adlens-theme");if(t!=="light")document.documentElement.classList.add("dark")}catch(e){document.documentElement.classList.add("dark")}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body className="h-screen overflow-hidden">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
        <AIPanel />
      </body>
    </html>
  );
}
