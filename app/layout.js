import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Movie Search App",
  description: "Search, filter, and explore movies using TMDB",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Script id="sw-cache-cleanup" strategy="beforeInteractive">
          {`
            (function () {
              if (typeof window === "undefined") return;
              window.addEventListener("load", function () {
                if ("serviceWorker" in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function (regs) {
                    regs.forEach(function (reg) {
                      reg.unregister();
                    });
                  }).catch(function () {});
                }
                if ("caches" in window) {
                  caches.keys().then(function (keys) {
                    return Promise.all(keys.map(function (key) { return caches.delete(key); }));
                  }).catch(function () {});
                }
              });
            })();
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
