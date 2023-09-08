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
  const segCount = useRef(20); //把每0.5秒的点继续分割 20 // 0.1秒分割4
  const aiRaceResult = useRef<any[]>([]);
  const aiRaceResultCurr = useRef([]);
  const aiRaceResultPre = useRef<any[]>([]);
  const pathIndex = useRef(0);
  const pagePathIndex = useRef(0); //当前页面全局累加的PathIndex
  const basePathW = useRef(800 + 12 * 14);
  const basePathH = useRef(238 + 12 * 14);
  const diffRatio = useRef(1);
  const raceHorseCount = useRef(12);
  const BoxViewSize = useRef<{ w: number; h: number }>({
    w: 2286,
    h: 1182,
  }).current;

  const pagePathPreT = useRef(-1);

  useImperativeHandle(ref, () => ({
    setRaceData,
    renderSceneBy3d,
  }));

  const setRaceData = (data) => {
    //console.log('LiveSantaTrackPreviewWS setRaceData', { data });
    const currPathT = data[0]?.speedData?.t === undefined ? -1 : data[0].speedData.t;
    if (aiRaceResultPre.current.length <= 0 && data && data.length > 0) {
      pagePathPreT.current = data[0]?.speedData?.t === undefined ? -1 : data[0].speedData.t;
      aiRaceResultPre.current = data;
      //console.log('LiveSantaTrackPreviewWS setRaceData', { data });
      const rds = diffRatio.current * (BoxViewSize.w < 600 ? 10 : 12);
      for (let index = 0; index < aiRaceResultPre.current.length; index++) {
        //当前赛道最多支持12匹马
        if (index < 12) {
          const chorse = aiRaceResultPre.current[index];
          const path = chorse.speedData;
          const wRatio = BoxViewSize.w / basePathW.current;
          const hRatio = BoxViewSize.h / basePathH.current;
          const cxa = path.xa * wRatio;
          const cya = -path.ya * hRatio;
          createHNumber(chorse.trackNumber + '', rds, getTrackColor(chorse.trackNumber + ''), cxa, cya, index);
        }
      }
      //跳过前5秒
    } else {
      if (pagePathPreT.current !== -1) {
        const pInterval = data[0].speedData.t - pagePathPreT.current - 0.05;
        console.log('setRaceData else pagePathPreT:', {
          pagePathPreT: pagePathPreT.current,
          speedData0: data[0].speedData,
          pInterval,
        });
        segCount.current = pInterval * 40;
        pagePathPreT.current = -1;
      }

      if (currPathT > 5) {
        aiRaceResultCurr.current = data;
        if (pagePathPreT.current !== -1) {
          const pInterval = data[0].speedData.t - pagePathPreT.current - 0.05;
          console.log('setRaceData else pagePathPreT:', {
            pagePathPreT: pagePathPreT.current,
            speedData0: data[0].speedData,
            pInterval,
          });
          segCount.current = pInterval * 40;
          pagePathPreT.current = -1;
        }
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
          const path = aiRaceResultCurr.current[index].speedData;
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
        aiRaceResult.current = resHorsePaths;
        pathIndex.current = 0;
        aiRaceResultPre.current = aiRaceResultCurr.current;
      }
    }
  };

  const createHNumber = (num: string, rds = 10, color = 'red', x = 0, y = 0, idx = 0) => {
    if (canvasElem.current && canvasCTX.current) {
      //const rect = canvasElem.current.getBoundingClientRect();
      const radius = rds;
      const ccolor = color;
      const tag = new NumTag(x, y, radius, ccolor, num);
      tag.draw2(canvasCTX.current, x + 2, getCurrPathYa(y, idx, pagePathIndex.current));
      HorseNumberMap.set(tag.name, tag);
    }
  };

  const init = useCallback(() => {
    canvasElem.current = document.createElement('canvas');
    canvasCTX.current = canvasElem.current.getContext('2d');
    CanvasBoxBgRef.current.append(canvasElem.current);
    canvasElem.current.width = BoxViewSize.w;
    canvasElem.current.height = BoxViewSize.h;
  }, [CanvasBox, HorseNumberMap]);

  const renderSceneBy3d = useCallback(() => {
    if (canvasCTX.current && HorseNumberMap.size > 0) {
      if (pathIndex.current < aiRaceResult.current[0].speedData.length) {
        rerDraw();
        for (let index = 0; index < HorseNumberMap.size; index++) {
          const raceRes = aiRaceResult.current[index];
          const numTag = HorseNumberMap.get('number' + raceRes.trackNumber) as NumTag;
          const path = raceRes.speedData[pathIndex.current];
          const cxa = path.xa;
          const cya = path.ya;
          numTag.draw2(canvasCTX.current, cxa + 2, getCurrPathYa(cya, index, pagePathIndex.current));
          //console.log('renderSceneBy3d path:', path);
        }
        pathIndex.current++;
        pagePathIndex.current++;
      }
    }
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
      window.addEventListener('resize', setView);
    }
    return () => {
      window.removeEventListener('resize', setView);
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
    > canvas {
      transform: translate(-0.3125rem, 0);
    }
  }
`;

export default forwardRef(LiveSantaTrackPreviewWS);
