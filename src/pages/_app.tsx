import { createGlobalStyle, ThemeProvider } from "styled-components";
import '../styles/global.css'

const theme = {};

export default function App({ Component, pageProps }: any) {
  return (
    <>
      <title>S3 Index</title>
      <ThemeProvider theme={theme}>
        <Component {...pageProps} />
      </ThemeProvider>
    </>
  );
}
