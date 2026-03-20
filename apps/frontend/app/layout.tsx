"use client";

import Providers from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ width: "100%" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
