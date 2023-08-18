import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import styled from 'styled-components';

import { getTrackColor } from '@/utils/raceUtil';

import { NumTag } from './LiveTrackUtil';

function LiveSantaTrackPreviewWS({ raceDataInfo, CanvasBoxClass }, ref) {
  const [isMounted, setIsMounted] = useState(false);
  const CanvasBox = useRef(null);
  const CanvasBoxBgRef = useRef(null);
  const canvasElem = useRef<HTMLCanvasElement>(null);
  const canvasCTX = useRef<CanvasRenderingContext2D>(null);
  const HorseNumberMap = useRef<Map<string, NumTag>>(new Map()).current;
  const canvasElemRect = useRef<any>();
  const ReqAFrameId = useRef(0);
  const segCount = useRef(20); //把每0.5秒的点继续分割 20 // 0.1秒分割4
  const raceResult = useRef<any[]>([]);
  const aiRaceResult = useRef<any[]>([]);
  const aiRaceResultPre = useRef<any[]>([]);
  const pathIndex = useRef(0);
  const pathIdxTime = useRef(0);
  const pagePathIndex = useRef(0); //当前页面全局累加的PathIndex
  const lastTimestampMS = useRef(0);
  const basePathW = useRef(800 + 12 * 14);
  const basePathH = useRef(238 + 12 * 14);
  const diffRatio = useRef(1);
  const raceHorseCount = useRef(12);
  const pathPlaySpeed = useRef(1); //曲线播放速度 //1 1倍速，2 2倍速,...
  const BoxViewSize = useRef<{ w: number; h: number }>({
    w: 2286,
    h: 1182,
  }).current;

  const pagePathPreT = useRef(-1);
  const playBroadcastSTOId = useRef(null);
  const RaceAudioRef = useRef(null);
  const [raceAudioText, setRaceAudioText] = useState('');
  const isRaceTrackZoom = useRef(false); //跑道是否放大

  useImperativeHandle(ref, () => ({
    setRaceData,
    setPathPlaySpeed,
  }));

  const setPathPlaySpeed = (speedRate: number) => {
    pathPlaySpeed.current = speedRate;
    segCount.current = segCount.current / pathPlaySpeed.current;
  };

  const setRaceData = (data) => {
    //console.log('LiveTrackPreviewWS setRaceData', { data });
    if (data && data.length > 0 && data[0].interval) {
      //判断坐标点间隔时长，//0.5~0.1   // interval 后端返回500ms
      //segCount.current = (data[0].interval / 1000) * 40;
      segCount.current = data[0].interval * 40;
      segCount.current = segCount.current / pathPlaySpeed.current;
    }

    if (aiRaceResultPre.current.length <= 0 && data && data.length > 0) {
      pagePathPreT.current = data[0]?.speedData?.t === undefined ? -1 : data[0].speedData.t;
      aiRaceResultPre.current = data;
      raceHorseCount.current = aiRaceResultPre.current.length;
      // const rds = diffRatio.current * 7;
      const rds = diffRatio.current * (BoxViewSize.w < 600 ? 10 : 12);
      for (let index = 0; index < aiRaceResultPre.current.length; index++) {
        //当前赛道最多支持12匹马
        if (index < 12) {
          const chorse = aiRaceResultPre.current[index];
          createHNumber(chorse.trackNumber + '', rds, 0, getTrackColor(chorse.trackNumber + ''));
        }
      }
    } else {
      aiRaceResult.current = data;
      // if (pagePathPreT.current !== -1) {
      //   const pInterval = data[0].speedData.t - pagePathPreT.current - 0.05;
      //   console.log('setRaceData else pagePathPreT:', {
      //     pagePathPreT: pagePathPreT.current,
      //     speedData0: data[0].speedData,
      //     pInterval,
      //   });
      //   segCount.current = pInterval * 40;
      //   pagePathPreT.current = -1;
      // }
      // segCount.current = segCount.current / pathPlaySpeed.current;
      const resHorsePaths: any[] = [];
      const pathW = basePathW.current,
        pathH = basePathH.current;
      const wRatio = BoxViewSize.w / pathW;
      const hRatio = BoxViewSize.h / pathH;
      for (let index = 0; index < aiRaceResultPre.current.length; index++) {
        const chorse = aiRaceResultPre.current[index];
        resHorsePaths.push({
          gameHorseId: chorse.gameHorseId,
          ranking: chorse.ranking,
          trackNumber: chorse.trackNumber,
          speedData: [],
        });
        const pathPre = chorse.speedData;
        const cxaPre = pathPre.xa * wRatio;
        const cyaPre = -pathPre.ya * hRatio;
        const path = aiRaceResult.current[index].speedData;
        pathIdxTime.current = path.t;
        const cxa = path.xa * wRatio;
        const cya = -path.ya * hRatio;
        const cxaDiff = (cxa - cxaPre) / segCount.current;
        const cyaDiff = (cya - cyaPre) / segCount.current;
        for (let index3 = 0; index3 < segCount.current; index3++) {
          resHorsePaths[index].speedData.push({
            //xa: Math.abs(dirX + cxaPre + cxaDiff * index3),
            xa: cxaPre + cxaDiff * index3,
            ya: cyaPre + cyaDiff * index3,
            ranking: pathPre.ranking,
          });
        }
      }
      raceResult.current = resHorsePaths;
      pathIndex.current = 0;
      aiRaceResultPre.current = aiRaceResult.current;
    }
  };

  const createHNumber = useCallback((num: string, rds = 10, y = null, color = 'red') => {
    if (canvasElem.current && canvasCTX.current) {
      //const rect = canvasElem.current.getBoundingClientRect();
      const cx = null;
      const cy = y;
      const radius = rds;
      const ccolor = color;
      const tag = new NumTag(cx, cy, radius, ccolor, num);
      HorseNumberMap.set(tag.name, tag);
    }
  }, []);

  const init = useCallback(() => {
    canvasElem.current = document.createElement('canvas');
    canvasCTX.current = canvasElem.current.getContext('2d');
    CanvasBoxBgRef.current.append(canvasElem.current);
    canvasElem.current.width = BoxViewSize.w;
    canvasElem.current.height = BoxViewSize.h;
  }, [CanvasBox, HorseNumberMap]);

  const renderScene = useCallback(() => {
    if (canvasCTX.current && HorseNumberMap.size > 0) {
      if (raceResult.current && raceResult.current.length > 0) {
        if (performance.now() - lastTimestampMS.current >= 25) {
          lastTimestampMS.current = performance.now();
          if (pathIndex.current < raceResult.current[0].speedData.length) {
            rerDraw();
            for (let index = 0; index < HorseNumberMap.size; index++) {
              const raceRes = raceResult.current[index];
              const numTag = HorseNumberMap.get('number' + raceRes.trackNumber) as NumTag;
              const path = raceRes.speedData[pathIndex.current];
              const cxa = path.xa;
              const cya = path.ya;
              numTag.draw2(canvasCTX.current, cxa + 2, getCurrPathYa(cya, index, pagePathIndex.current));
              if (pathIndex.current % segCount.current === 0) {
                // if (path.ranking === 1) {
                //   //handleHorseNumPos(numTag);
                // }
              }
            }
            pathIndex.current++;
            pagePathIndex.current++;
          }
        }
      }
    }
    ReqAFrameId.current = window.requestAnimationFrame(() => renderScene());
  }, []);

  const getCurrPathYa = (ya, idx, pathIdx = 0) => {
    let yaSpace = diffRatio.current * (raceHorseCount.current <= 7 ? 9 : 4);
    yaSpace = BoxViewSize.w < 600 ? yaSpace - 1 : yaSpace;
    yaSpace = yaSpace < 0 ? 0 : yaSpace;
    const decayCount = segCount.current * 80; //100
    const decayRatio = (decayCount - pathIdx) / decayCount;
    const yaSpaceDiff = idx * yaSpace * (decayRatio > 0 ? decayRatio : 0);
    //console.log('getCurrPathYa decay:', { decayCount, pathIdx, yaSpace: idx * yaSpace, yaSpaceDiff });
    //这几种赛道（1600, 1700, 1800, 2000）起点在下半区
    if ([1600, 1700, 1800, 1900, 2000].includes(raceDataInfo?.areaLength)) return ya + yaSpaceDiff;
    else return ya - yaSpaceDiff;
  };

  const rerDraw = () => {
    if (canvasCTX.current) {
      canvasCTX.current.clearRect(0, 0, canvasElem.current.width, canvasElem.current.height);
      canvasElem.current.width = BoxViewSize.w;
      canvasElem.current.height = BoxViewSize.h;
      canvasCTX.current.translate(BoxViewSize.w / 2, BoxViewSize.h / 2);
    }
  };
  const setView = () => {
    const clientWidth = CanvasBox.current.clientWidth;
    const needW = clientWidth;
    const needH = (clientWidth * 1) / 2.384;
    BoxViewSize.w = needW;
    BoxViewSize.h = needH;
    canvasElem.current.width = BoxViewSize.w;
    canvasElem.current.height = BoxViewSize.h;
    canvasCTX.current.translate(BoxViewSize.w / 2, BoxViewSize.h / 2);
    diffRatio.current = BoxViewSize.w / basePathW.current;
    canvasElemRect.current = canvasElem.current.getBoundingClientRect();
    const area = raceDataInfo?.area.toLowerCase();
    const direction = raceDataInfo?.direction.toLowerCase();
    const bgUrl =
      '/models/2d/bg/santa/' + area + '/' + direction + '/' + direction + '_' + raceDataInfo?.areaLength + '.webp';
    CanvasBoxBgRef.current.className = ' mg-canvas';
    //CanvasBoxBgRef.current.style.backgroundImage = 'url(' + bgUrl + ')';
  };

  useEffect(() => {
    if (isMounted) {
      init();
      setView();
      renderScene();
      window.addEventListener('resize', setView);
    }
    return () => {
      window.removeEventListener('resize', setView);
      cancelAnimationFrame(ReqAFrameId.current);
      HorseNumberMap.clear();
      canvasCTX.current = null;
      canvasElem.current = null;
    };
  }, [isMounted]);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  return (
    <>
      {isMounted ? (
        <div className=' relative flex h-full w-full items-center justify-center p-[2px]'>
          <CanvasBoxStyled
            className={`flex  items-center justify-center overflow-hidden ${CanvasBoxClass}`}
            ref={CanvasBox}>
            <div className='' ref={CanvasBoxBgRef}></div>
          </CanvasBoxStyled>
        </div>
      ) : null}
    </>
  );
}
const CanvasBoxStyled = styled.div`
  .mg-canvas,
  .mg-canvas-min {
    background-image: url('/models/2d/bg/santaV2/left/1400.webp');
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    transition: 0.6s;
  }
`;

export default forwardRef(LiveSantaTrackPreviewWS);
