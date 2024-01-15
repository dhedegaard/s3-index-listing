import { Metadata } from "next";
import { ReactNode } from "react";
import "../styles/global.css";

export const metadata: Metadata = {
  title: "S3 Index",
  description: "Public files from an S3 bucket",
};

interface Props {
  children: ReactNode;
}

export default function RootLayout({ children }: Readonly<Props>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>{children}</body>
    </html>
  );
}
