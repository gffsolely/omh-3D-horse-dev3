import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import styled from 'styled-components';

import { getTrackColor } from '@/utils/raceUtil';

import { NumTag } from './LiveTrackUtil';

function LiveSantaTrackPreview({ raceDataInfo, CanvasBoxClass }, ref) {
  const [isMounted, setIsMounted] = useState(false);
  const CanvasBox = useRef(null);
  const CanvasBoxBgRef = useRef(null);
  const canvasElem = useRef<HTMLCanvasElement>(null);
  const canvasCTX = useRef<CanvasRenderingContext2D>(null);
  const canvasBgImg = useRef<HTMLImageElement>(null);
  const HorseNumberMap = useRef<Map<string, NumTag>>(new Map()).current;

  //const raceBroadcastMap = useRef<Map<string, any>>(null);
  const canvasElemRect = useRef<any>();
  const ReqAFrameId = useRef(0);
  const segCount = useRef(20); //每秒40帧 //把每0.5秒的点继续分割 20 // 0.1秒分割4
  const aiRaceResult = useRef([]);
  const pathIndex = useRef(0);
  const pathLength = useRef(1);
  const pathCount = useRef(0);
  const racePathPlay = useRef(false);
  const basePathW = useRef(800 + 12 * 14); //799.82 //430.82+119*2+250-119
  const basePathH = useRef(238 + 12 * 14); //238  //119*2
  // const basePathW = useRef(899.82);
  // const basePathH = useRef(338);
  const diffRatio = useRef(1);
  const raceHorseCount = useRef(12);
  const pathPlaySpeed = useRef(1); //曲线播放速度 //1 1倍速，2 2倍速,...
  const randerSTOId = useRef(null);
  const videoPreludeTimes = useRef(26); //比赛视频过场时长

  const BoxViewSize = useRef<{ w: number; h: number }>({
    w: 2286,
    h: 1182,
  }).current;

  useImperativeHandle(ref, () => ({
    setRacePathPlay,
    setPathPlaySpeed,
    renderSceneBy3d,
  }));

  /**
   * @param speedRate //曲线播放速度[1~10] //1 1倍速; 2 2倍速; 4 4倍速 ...
   */
  const setPathPlaySpeed = (speedRate: number) => {
    pathPlaySpeed.current = speedRate;
    videoPreludeTimes.current = videoPreludeTimes.current / speedRate;
    //handleRanderSTOByCTime(currentTime);
    //处理加减速之后点的位置
    const prePathLength = pathLength.current;
    createRacePath();
    pathIndex.current = Math.floor((pathIndex.current / prePathLength) * pathLength.current);
  };

  const setRacePathPlay = (isPlay, currentTime = 0) => {
    racePathPlay.current = isPlay;
    handleRanderSTOByCTime(currentTime);
    pathCount.current = 0;
  };

  //#region handles
  const handleRanderSTOByCTime = (currentTime) => {
    let stoDuration = videoPreludeTimes.current - currentTime;
    stoDuration = stoDuration < 0 ? 0 : stoDuration;
    randerSTOId.current && clearTimeout(randerSTOId.current);
    randerSTOId.current = setTimeout(() => {
      // renderScene();
    }, stoDuration * 1000);
  };

  //#endregion

  //#region base
  const createHNumber = useCallback((num: string, rds = 10, y = 0, color = 'red') => {
    if (canvasElem.current && canvasCTX.current) {
      const rect = canvasElem.current.getBoundingClientRect();
      const cx = rect.left + rds;
      const cy = rect.top + rds + y;
      const radius = rds;
      const ccolor = color;
      const tag = new NumTag(cx, cy, radius, ccolor, num);
      HorseNumberMap.set(tag.name, tag);
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
    const needH = (clientWidth * 1) / 2.384; //3.357;
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

    createRacePath();
  };
  const createRacePath = useCallback(() => {
    const aiJson = raceDataInfo?.raceAiJson ? JSON.parse(raceDataInfo.raceAiJson) : null;
    //console.log('raceAiJson,aiJson:', aiJson);
    if (aiJson && aiJson.raceResult && aiJson.raceResult.length > 0) {
      //console.log('createRacePath,aiJson:', aiJson.broadcastData);
      if (aiJson.interval) {
        //判断坐标点间隔时长，//0.5~0.1
        segCount.current = aiJson.interval * 40;
      }
      //倍速播放时减少曲线点数
      segCount.current = segCount.current / pathPlaySpeed.current;

      const raceRes = aiJson.raceResult;
      raceHorseCount.current = raceRes.length;
      const resHorsePaths: any[] = [];
      const pathW = basePathW.current,
        pathH = basePathH.current;
      const wRatio = BoxViewSize.w / pathW;
      const hRatio = BoxViewSize.h / pathH;
      //const dirX = raceDataInfo?.direction === 'LEFT' ? -canvasElemRect.current.width : 0;
      for (let index = 0; index < raceRes.length; index++) {
        const chorse = raceRes[index];
        resHorsePaths.push({
          gameHorseId: chorse.gameHorseId,
          ranking: chorse.ranking,
          trackNumber: chorse.trackNumber,
          speedData: [],
        });
        for (let index2 = 0; index2 < chorse.speedData.length; index2++) {
          if (index2 >= 1) {
            const pathPre = chorse.speedData[index2 - 1];
            const cxaPre = pathPre.xa * wRatio;
            const cyaPre = -pathPre.ya * hRatio;
            const path = chorse.speedData[index2];
            const cxa = path.xa * wRatio;
            const cya = -path.ya * hRatio;
            const cxaDiff = (cxa - cxaPre) / segCount.current;
            const cyaDiff = (cya - cyaPre) / segCount.current;
            for (let index3 = 0; index3 < segCount.current; index3++) {
              resHorsePaths[index].speedData.push({
                xa: cxaPre + cxaDiff * index3,
                ya: cyaPre + cyaDiff * index3,
                t: pathPre.t,
                ranking: pathPre.ranking,
              });
            }
          }
        }
      }

      aiRaceResult.current = resHorsePaths;
      pathLength.current = resHorsePaths[0].speedData.length;
      //const rds = BoxViewSize.w < 600 ? 2 : 5;
      const rds = diffRatio.current * (BoxViewSize.w < 600 ? 10 : 12);
      for (let index = 0; index < raceRes.length; index++) {
        //当前赛道最多支持12匹马
        if (index < 12) {
          const chorse = raceRes[index];
          createHNumber(chorse.trackNumber + '', rds, 0, getTrackColor(chorse.trackNumber + ''));
        }
      }
      setTimeout(() => {
        rerDraw();
        for (let index = 0; index < HorseNumberMap.size; index++) {
          const raceRes = aiRaceResult.current[index];
          const numTag = HorseNumberMap.get('number' + raceRes.trackNumber) as NumTag;
          const path = raceRes.speedData[pathIndex.current];
          numTag.draw2(canvasCTX.current, path.xa + 2, getCurrPathYa(path.ya, index, pathIndex.current));
        }
      }, 100);
    }
  }, []);
  const init = useCallback(() => {
    canvasElem.current = document.createElement('canvas');
    canvasCTX.current = canvasElem.current.getContext('2d');
    CanvasBoxBgRef.current.append(canvasElem.current);
    canvasElem.current.width = BoxViewSize.w;
    canvasElem.current.height = BoxViewSize.h;
  }, [CanvasBox, HorseNumberMap]);

  //const renderScene = useCallback(() => {}, []);

  const renderSceneBy3d = useCallback(() => {
    if (canvasCTX.current && HorseNumberMap.size > 0) {
      //pathCount.current < 1 只跑一圈
      if (pathCount.current < 1 && racePathPlay.current) {
        if (pathIndex.current < aiRaceResult.current[0].speedData.length) {
          rerDraw();
          //const tmpRaceRank = [];
          for (let index = 0; index < HorseNumberMap.size; index++) {
            const raceRes = aiRaceResult.current[index];
            const numTag = HorseNumberMap.get('number' + raceRes.trackNumber) as NumTag;
            const path = raceRes.speedData[pathIndex.current];
            const cxa = path.xa;
            const cya = path.ya;
            numTag.draw2(canvasCTX.current, cxa + 2, getCurrPathYa(cya, index, pathIndex.current));
            if (pathIndex.current % segCount.current === 0) {
              //
            }
          }
          pathIndex.current++;
        } else {
          pathIndex.current = 0;
          pathCount.current++;
        }
      }
    }
  }, []);

  //#endregion

  useEffect(() => {
    if (isMounted) {
      init();
      setView();
      //console.log('aiRaceResult.current:', aiRaceResult.current);
      if (aiRaceResult.current && aiRaceResult.current.length > 0) {
        handleRanderSTOByCTime(0);
      }
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
        <div className=' relative flex h-full w-full items-center justify-center p-[2px] '>
          <CanvasBoxStyled
            className={` relative flex  items-center justify-center overflow-hidden ${CanvasBoxClass}`}
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
    transition: 0.7s;
    > canvas {
      transform: translate(-0.3125rem, 0);
    }
  }
`;

export default forwardRef(LiveSantaTrackPreview);
