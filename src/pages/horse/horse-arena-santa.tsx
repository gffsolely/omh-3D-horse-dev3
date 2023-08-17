import { useEffect, useRef, useState } from 'react';

import LiveSantaTrackPreview from '@/views/raceTrack2D/LiveSantaTrackPreviewV2';
import TrackSantaArenaModel from '@/views/raceTrack3D/TrackSantaArenaModelT2';

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

  useEffect(() => {
    setIsMounted(true);
  }, []);
  return (
    <div className='mg-main relative h-full w-full cursor-pointer bg-[#666]'>
      {isMounted && (
        <>
          {/* <div className=' absolute right-4 top-[10%]  h-[9.93rem] w-[20.51rem] '>
            <LiveSantaTrackPreview
              raceDataInfo={reacPathAI.data.gameRaceInfo}
              raceAwardExts={null}
              raceVideoTimeInfo={{ currentTime: 0, totalTime: 0 }}
              setRealRaceRank={setRealRaceRank}
              realPathPos={realRaceRank[0]}
              racePlay={true}
              timeoutRemove={true}
              isPlayBroadcast={false}
              ref={liveTrackPreviewRef}
              CanvasBoxClass='h-full w-full '
            />
          </div> */}

          <TrackSantaArenaModel raceDataInfo={reacPathAI.data.gameRaceInfo} />
        </>
      )}
    </div>
  );
}
