import { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect, useState } from 'react';

import '@/styles/globals.css';

import rem from '@/constant/rem';

function MyApp({ Component, pageProps }: AppProps) {
  const [isAppLoading, setIsAppLoading] = useState(true);
  useEffect(() => {
    setIsAppLoading(false);
    rem();
    return () => {
      //
    };
  }, []);
  return (
    <>
      <Head>
        {/* <script type='text/javascript' src='https://cdn.bootcss.com/vConsole/3.3.0/vconsole.min.js' async></script>
        <script>var vConsole = new VConsole(); console.log('Hello world');</script> */}
      </Head>

      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
