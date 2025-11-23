import "./globals.css";

export const metadata = {
  title: "Video Burner",
  description: "Burn subtitles and change FPS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
