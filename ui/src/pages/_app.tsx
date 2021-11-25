import '../../styles/globals.scss';

declare global {
  interface Window {
    ethereum;
  }
}


function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
