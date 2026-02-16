import "./globals.css";

export const metadata = {
  title: "Movie Search App",
  description: "Search, filter, and explore movies using TMDB",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
