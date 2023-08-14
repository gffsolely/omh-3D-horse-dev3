import { useEffect, useState } from 'react';

import TrackSantaArenaModel from '@/views/raceTrack3D/TrackSantaArenaModelT2';

import reacPathAI from '~/models/json/rece-7horse.json';

export default function HorseBase() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  return (
    <div className='mg-main relative h-full w-full cursor-pointer bg-[#666]'>
      {isMounted ? <TrackSantaArenaModel raceDataInfo={reacPathAI.data.gameRaceInfo} /> : null}
    </div>
  );
}
