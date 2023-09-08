import { useEffect, useRef, useState } from 'react';

import LiveSantaTrackPreview from '@/views/raceTrack2D/LiveSantaTrackPreviewV3';
import TrackSantaArenaModel from '@/views/raceTrack3D/TrackSantaArenaModel';

import reacPathAI from '~/models/json/rece-7horse-audio.json';

export default function HorseBase() {
  const liveTrackPreviewRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);
  const [realRaceRank, setRealRaceRank] = useState([
    {
      pathIndex: 0,
      pathCount: 0,
      gameHorseId: '1',
      rankEnd: 1,
      ranking: 1,
    },
  ]); //实时赛事排名

  const handleRaceStart = (playSpeed) => {
    if (liveTrackPreviewRef.current) {
      // setTimeout(() => {
      //   liveTrackPreviewRef.current.setRacePathPlay(true, 0);
      //   liveTrackPreviewRef.current.setPathPlaySpeed(playSpeed);
      // }, (6 / playSpeed) * 1000);
      liveTrackPreviewRef.current.setRacePathPlay(true, 0);
      liveTrackPreviewRef.current.setPathPlaySpeed(playSpeed);
    }
  };
  const handleRenderSceneBy3d = () => {
    liveTrackPreviewRef.current && liveTrackPreviewRef.current.renderSceneBy3d();
  };
  // const handleRacePlaySpeed = (playSpeed) => {
  //   if (liveTrackPreviewRef.current) {
  //     liveTrackPreviewRef.current.setPathPlaySpeed(playSpeed);
  //   }
  // };
  // const handleRaceData = (data) => {
  //   console.log('handleRaceData:', { data });
  //   if (liveTrackPreviewRef.current) {
  //     liveTrackPreviewRef.current.setRaceData(data);
  //   }
  // };

  useEffect(() => {
    setIsMounted(true);
  }, []);
  return (
    <div className='mg-main relative h-full w-full cursor-pointer bg-[#666]'>
      {isMounted && (
        <>
          <div className=' absolute right-4 top-[10%]  h-[9.93rem] w-[20.51rem] '>
            {/* <LiveSantaTrackPreview
              raceDataInfo={reacPathAI.data.gameRaceInfo}
              ref={liveTrackPreviewRef}
              CanvasBoxClass='h-full w-full '
            /> */}
            <LiveSantaTrackPreview
              raceDataInfo={reacPathAI.data.gameRaceInfo}
              ref={liveTrackPreviewRef}
              CanvasBoxClass='h-full w-full '
            />
          </div>

          <TrackSantaArenaModel
            raceDataInfo={reacPathAI.data.gameRaceInfo}
            handleRaceStart={handleRaceStart}
            handleRenderScene={handleRenderSceneBy3d}
            // handleRacePlaySpeed={handleRacePlaySpeed}
            // handleRaceData={handleRaceData}
          />
        </>
      )}
    </div>
  );
}
