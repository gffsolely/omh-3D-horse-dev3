import Image from 'next/image';
import Script from 'next/script';
import React, { useContext, useEffect, useRef } from 'react';

// import { UserinfoContextData } from '@/components';

// import { setAudioStateFn } from '@/utils';

export default function LiveTrackTest() {
  //const { audioBgRef, audioLoginBgRef } = useContext<any>(UserinfoContextData);

  //#region  flv 视频直播
  const flvPlayerRef = useRef(null);
  const raceLiveVideoRef = useRef(null);
  const flvUrlRef = useRef(
    'https://yunqivedio.alicdn.com/2017yq/v2/0x0/96d79d3f5400514a6883869399708e11/96d79d3f5400514a6883869399708e11.m3u8'
  );
  const handleLiveVideo = () => {
    const Hls = window ? (window as any).Hls : null;
    if (Hls.isSupported()) {
      const hls = new Hls();
      flvPlayerRef.current = hls;
      hls.loadSource(flvUrlRef.current);
      hls.attachMedia(raceLiveVideoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        raceLiveVideoRef.current.play();
        raceLiveVideoRef.current.muted = false;
      });
      hls.on(Hls.Events.ERROR, function (event, data) {
        console.log('Hls.Events.ERROR ', { event, data });
      });
    }

    // const flvjs = window ? (window as any).flvjs : null;
    // if (flvjs?.isSupported()) {
    //   const flvPlayer = flvjs?.createPlayer(
    //     {
    //       type: 'flv',
    //       url: flvUrlRef.current,
    //     },
    //     { fixAudioTimestampGap: false }
    //   );
    //   flvPlayerRef.current = flvPlayer;
    //   if (flvPlayerRef.current) {
    //     flvPlayerRef.current.attachMediaElement(raceLiveVideoRef.current);
    //     flvPlayerRef.current.load();
    //     flvPlayerRef.current.play();
    //     raceLiveVideoRef.current.play();
    //   }
    //   // 监听 ERROR 事件
    //   flvPlayer.on(flvjs.Events.ERROR, (event, data) => {
    //     console.log('flvjs.Events.ERROR ', { event, data });
    //   });
    //   // 监听 成功 事件
    //   flvPlayer.on(flvjs.Events.SUCCESS, (event, data) => {
    //     console.log(event, 'SUCCESSevent');
    //   });
    //   flvPlayer.on(flvjs.Events.MEDIA_INFO, (event, data) => {
    //     console.log(event, 'MEDIA_INFOevent');
    //   });
    // }
  };
  //#endregion

  useEffect(() => {
    // audioBgRef.current.muted = true;
    // audioLoginBgRef.current.muted = true;
    // setAudioStateFn({ bGSound: false });

    return () => {
      //
    };
  }, []);

  return (
    <div className=' flex items-center justify-center'>
      {/* <Script src='https://cdn.bootcdn.net/ajax/libs/flv.js/1.6.2/flv.min.js' async strategy='afterInteractive' /> */}
      <Script
        src=' https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.4.10/hls.min.js'
        async
        strategy='afterInteractive'
      />

      <div
        className=' fixed left-[50%] top-[50%] z-10 flex -translate-x-1/2 flex-col items-center '
        hidden={flvPlayerRef.current}>
        <Image
          alt='play'
          title='play '
          width={100}
          height={100}
          src='/models/2d/btns/play.png'
          className='custom-cursor-pointer h-18 w-18'
          onClick={() => {
            //handleStartPlay();
            handleLiveVideo();
          }}
        />
      </div>
      <div className=' h-[500px] w-[700px]'>
        <video ref={raceLiveVideoRef} playsInline muted className=' h-full w-full' controls={false}></video>
      </div>
    </div>
  );
}
