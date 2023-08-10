import Image from 'next/image';
import React, { useContext, useEffect, useRef, useState } from 'react';

import LiveSantaTrackPreview from '@/views/raceTrack2D/LiveSantaTrackPreviewZoom';

//import reacPathAI from '~/models/2d/json/rece-3horse.json';
//import reacPathAI from '~/models/2d/json/rece-7horse.json';
import reacPathAI from '~/models/json/rece-7horse-audio.json';
//import reacPathAI from '~/models/2d/json/rece-standard-6horse-audio.json';

export default function LiveTrackTest() {
  const liveTrackPreviewRef = useRef(null);
  const liveTrackPreviewWSRef = useRef(null);
  const [LiveData, setLiveData] = useState(null);
  const [raceRank, setRaceRank] = useState([]); //比赛排行榜
  const pathIndex = useRef(0);
  const [realRaceRank, setRealRaceRank] = useState([
    {
      pathIndex: 0,
      pathCount: 0,
      gameHorseId: '1',
      rankEnd: 1,
      ranking: 1,
    },
  ]); //实时赛事排名

  const [isRaceTrackZoom, setIsRaceTrackZoom] = useState(false);

  const apiData = reacPathAI;

  const sendRaceAiJson = () => {
    const aiJson = apiData.data.gameRaceInfo?.raceAiJson ? JSON.parse(apiData.data.gameRaceInfo.raceAiJson) : null;
    //console.log('raceAiJson,aiJson:', aiJson);
    if (aiJson && aiJson.raceResult && aiJson.raceResult.length > 0) {
      let pathInterval = 500;
      if (aiJson.interval) {
        pathInterval = aiJson.interval * 1000;
      }
      const raceRes = aiJson.raceResult;
      // const resHorsePaths: any[] = [];
      // for (let index = 0; index < raceRes.length; index++) {
      //   const chorse = raceRes[index];
      //   resHorsePaths.push({
      //     gameHorseId: chorse.gameHorseId,
      //     ranking: chorse.ranking,
      //     trackNumber: chorse.trackNumber,
      //     speedData: [],
      //   });
      //   for (let index2 = 0; index2 < chorse.speedData.length; index2++) {
      //     const pathPre = chorse.speedData[index2 - 1];
      //   }
      // }

      const send = () => {
        const resHorsePaths: any[] = [];
        for (let index = 0; index < raceRes.length; index++) {
          const chorse = raceRes[index];
          const pathPre = chorse.speedData[pathIndex.current];
          pathPre.interval = pathInterval;
          resHorsePaths.push({
            gameHorseId: chorse.gameHorseId,
            ranking: chorse.ranking,
            trackNumber: chorse.trackNumber,
            speedData: pathPre,
          });
        }
        liveTrackPreviewWSRef.current && liveTrackPreviewWSRef.current.setRaceData(resHorsePaths);
        pathIndex.current++;
        setTimeout(() => {
          send();
        }, pathInterval);
      };

      send();
    }
  };

  useEffect(() => {
    // audioBgRef.current.muted = true;
    // audioLoginBgRef.current.muted = true;
    // setAudioStateFn({ bGSound: false });
    // setLiveData(apiData.data.gameRaceInfo);
    // setRaceRank(apiData.data.gameRaceAwardExts);
    // setTimeout(() => {
    //   setLiveData(apiData.data.gameRaceInfo);
    //   setRaceRank(apiData.data.gameRaceAwardExts);
    // }, 5 * 1000);
    // setTimeout(() => {
    //   sendRaceAiJson();
    // }, 3 * 1000);
    // setTimeout(() => {
    //   liveTrackPreviewRef.current && liveTrackPreviewRef.current.setRacePathPlay(true);
    // }, 1000);
    //liveTrackPreviewWSRef.current && liveTrackPreviewWSRef.current.setRaceData(lastData);
  }, []);

  return (
    <div className='  h-full w-full  '>
      <div className='  flex  flex-col items-center  '>
        <div className=' fixed left-[50%] top-[50%] flex  items-center justify-center' hidden={LiveData}>
          <Image
            alt='play'
            title='play '
            width={100}
            height={100}
            src='/models/2d/btns/play.png'
            className='custom-cursor-pointer h-18 w-18'
            onClick={() => {
              setLiveData(apiData.data.gameRaceInfo);
              setRaceRank(apiData.data.gameRaceAwardExts);
            }}
          />
        </div>
        {LiveData && (
          <>
            <button
              className=' m-4 rounded bg-blue-400 p-2 text-3xl text-white shadow shadow-blue-200'
              onClick={() => {
                liveTrackPreviewRef.current && liveTrackPreviewRef.current.setRaceTrackZoom(!isRaceTrackZoom);
                setIsRaceTrackZoom(!isRaceTrackZoom);
              }}>
              {isRaceTrackZoom ? 'exit zoom' : 'zoom'}
            </button>
            <LiveSantaTrackPreview
              raceDataInfo={LiveData}
              raceAwardExts={raceRank}
              raceVideoTimeInfo={{ currentTime: 0, totalTime: 0 }}
              setRealRaceRank={setRealRaceRank}
              realPathPos={realRaceRank[0]}
              racePlay={true}
              timeoutRemove={true}
              isPlayBroadcast={true}
              ref={liveTrackPreviewRef}
              CanvasBoxClass='h-[calc(100%-3.375rem)] w-[calc(100%-3.375rem)] bg-slate-700  '
            />

            {/* <LiveTrackPreview
           raceDataInfo={LiveData}
           raceAwardExts={raceRank}
           setRealRaceRank={setRealRaceRank}
           realPathPos={realRaceRank[0]}
           raceVideoTimeInfo={{ currentTime: 0, totalTime: 0 }}
           racePlay={true}
           timeoutRemove={true}
           isPlayBroadcast={true}
           ref={liveTrackPreviewRef}
           CanvasBoxClass='h-[calc(100%-3.375rem)] w-[calc(100%-3.375rem)]'
         />

         <LiveTrackPreviewWS
           raceDataInfo={LiveData}
           raceAwardExts={raceRank}
           setRealRaceRank={setRealRaceRank}
           ref={liveTrackPreviewWSRef}
           CanvasBoxClass='h-[calc(100%-3.375rem)] w-[calc(100%-3.375rem)]'
         /> */}
          </>
        )}
      </div>
    </div>
  );
}
