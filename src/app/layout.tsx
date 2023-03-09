import { Metadata } from "next";
import { ReactNode } from "react";
import "../styles/global.css";

export const metadata: Metadata = {
  title: "S3 Index",
  description: "Public files from an S3 bucket",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>S3 Index</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
