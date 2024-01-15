import { Metadata } from "next";
import { ReactNode } from "react";
import "../styles/global.css";
import { SERVER_ENV } from "../server-env";

export const metadata: Metadata = {
  title: "S3 Index",
  description: `Public files for S3 bucket ${SERVER_ENV.S3_BUCKET}`,
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
