import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import styled from 'styled-components';

import { getTrackColor } from '@/utils/raceUtil';

import { NumTag, NumTagSquare } from './LiveTrackUtil';

function LiveSantaTrackPreview({ raceDataInfo, CanvasBoxClass }, ref) {
  const [isMounted, setIsMounted] = useState(false);
  const CanvasBox = useRef(null);
  const CanvasBoxBgRef = useRef(null);
  const canvasElem = useRef<HTMLCanvasElement>(null);
  const canvasCTX = useRef<CanvasRenderingContext2D>(null);
  const canvasBgImg = useRef<HTMLImageElement>(null);
  //const HorseNumberMap = useRef<Map<string, NumTag>>(new Map()).current;
  const HorseNumberMap = useRef<Map<string, NumTagSquare>>(new Map()).current;

  //const raceBroadcastMap = useRef<Map<string, any>>(null);
  const canvasElemRect = useRef<any>();
  const ReqAFrameId = useRef(0);
  const segCount = useRef(20); //每秒40帧 //把每0.5秒的点继续分割 20 // 0.1秒分割4
  const aiRaceResult = useRef([]);
  const pathIndex = useRef(0);
  //const pathIndex = useRef(4500);
  const pathLength = useRef(1);
  const pathCount = useRef(0);
  const racePathPlay = useRef(false);
  const basePathW = useRef(800 + 12 * 14); //799.82 //430.82+119*2+250-119  //12条赛道 //14每条赛道宽度
  const basePathH = useRef(238 + 12 * 14); //238  //119*2
  const basePathRadius = useRef(133); //119 + 6 * 14
  const pathRadiusRef = useRef(0);
  // const basePathW = useRef(899.82);
  // const basePathH = useRef(338);
  const pathYRatioRef = useRef(1.1).current;
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
  const createHNumber = useCallback((num: string, w = 10, y = 0, color = 'red') => {
    if (canvasElem.current && canvasCTX.current) {
      const ccolor = color;
      const tag = new NumTagSquare(canvasCTX.current, ccolor, w, w + 2, num);
      HorseNumberMap.set('number' + num, tag);
    }
  }, []);

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
      pathRadiusRef.current = basePathRadius.current * hRatio;
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
                isZero: index3 === 0,
                xa: cxaPre + cxaDiff * index3,
                ya: cyaPre + cyaDiff * index3,
                t: pathPre.t,
                r: pathPre.direction,
                ranking: pathPre.ranking,
              });
            }
          }
        }
      }

      aiRaceResult.current = resHorsePaths;
      pathLength.current = resHorsePaths[0].speedData.length;
      //const rds = BoxViewSize.w < 600 ? 2 : 5;
      const w = diffRatio.current * 26;
      aiRaceResult.current.forEach((hItem) => {
        if (hItem.ranking === 1) {
          createHNumber(hItem.trackNumber + '', w, 0, getTrackColor(hItem.trackNumber + ''));
          return;
        }
      });

      setTimeout(() => {
        rerDraw();
        for (let index = 0; index < HorseNumberMap.size; index++) {
          const raceRes = aiRaceResult.current[index];
          const numTag = HorseNumberMap.get('number' + raceRes.trackNumber) as NumTagSquare;
          const path = raceRes.speedData[pathIndex.current];
          numTag.drawBox(path.xa, path.ya * pathYRatioRef, path.r);
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
          if (pathIndex.current === 0) {
            const path0 = aiRaceResult.current[0].speedData[0];
            sline1PathRef.begin.x = path0.xa;
            sline1PathRef.begin.y = path0.ya * pathYRatioRef;
            sline1PathRef.isDraw = true;
          }
          for (let index = 0; index < HorseNumberMap.size; index++) {
            const raceRes = aiRaceResult.current[index];
            const numTag = HorseNumberMap.get('number' + raceRes.trackNumber) as NumTagSquare;
            const path = raceRes.speedData[pathIndex.current];
            // const cxa = path.xa;
            // const cya = path.ya * 1.12;
            //只看头马
            if (index === 0) {
              //const pathXa = path.xa - 3; //+ (path.xa > 0 ? -pathOffset : pathOffset);
              numTag.drawBox(path.xa, path.ya * pathYRatioRef, -path.r);
              if (pathIndex.current > Math.floor(segCount.current * 2)) {
                const pathLine = raceRes.speedData[pathIndex.current - Math.floor(segCount.current * 2)];
                handleBeforePath(pathLine);
                renderDrawLine(numTag, pathLine);
              }
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

  const sline1PathRef = useRef({
    isDraw: false,
    begin: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
  }).current;
  const curve1PathRef = useRef({
    isDraw: false,
    begin: { x: 0, y: 0, r: 0 },
    end: { x: 0, y: 0, r: 0 },
  }).current;

  const sline2PathRef = useRef({
    isDraw: false,
    begin: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
  }).current;
  const curve2PathRef = useRef({
    isDraw: false,
    begin: { x: 0, y: 0, r: 0 },
    end: { x: 0, y: 0, r: 0 },
  }).current;
  const slineGap = 0.5 * diffRatio.current;

  const renderDrawLine = (numTag, path) => {
    const cxa = path.xa;
    const cyab = path.ya;
    const cya = path.ya * pathYRatioRef;
    const pathR = Math.round((path.r / 3.14159) * 100) / 100;

    const basePath = basePathRef.current;
    //判断是否到达直线1的终点
    if (sline1PathRef.isDraw && cxa <= basePath.sline1.end.x + 1 && cyab >= basePath.sline1.end.y) {
      console.log('renderDrawLine 直线1的终点');
      curve1PathRef.begin.x = cxa;
      curve1PathRef.begin.y = 0;
      curve1PathRef.begin.r = path.r;
      curve1PathRef.isDraw = true;
      sline1PathRef.end.x = cxa + (cxa < 0 ? -slineGap : slineGap);
      sline1PathRef.end.y = cya;
      sline1PathRef.isDraw = false;
    }

    //判断是否到达弯道1的终点
    if (curve1PathRef.isDraw && cxa >= basePath.curve1.end.x - 1 && cyab >= basePath.curve1.end.y - 1) {
      console.log('renderDrawLine 弯道1的终点');
      curve1PathRef.end.x = cxa;
      curve1PathRef.end.y = 0;
      curve1PathRef.end.r = path.r;
      curve1PathRef.isDraw = false;
      sline2PathRef.begin.x = cxa + (cxa < 0 ? -slineGap : slineGap);
      sline2PathRef.begin.y = cya;
      sline2PathRef.isDraw = true;
    }

    //判断是否到达直线2的终点
    if (sline2PathRef.isDraw && cxa >= basePath.sline2.end.x - 1 && cyab >= basePath.sline2.end.y - 1) {
      console.log('renderDrawLine 直线2的终点');
      curve2PathRef.begin.x = cxa;
      curve2PathRef.begin.y = 0;
      curve2PathRef.begin.r = path.r;
      curve2PathRef.isDraw = true;
      sline2PathRef.end.x = cxa + (cxa < 0 ? -slineGap : slineGap);
      sline2PathRef.end.y = cya;
      sline2PathRef.isDraw = false;
    }

    //弯道2终点
    if (pathR === 3) {
      if (curve2PathRef.begin.x !== 0 && curve2PathRef.isDraw) {
        curve2PathRef.end.x = cxa;
        curve2PathRef.end.y = 0;
        curve2PathRef.end.r = path.r;
        curve2PathRef.isDraw = false;
      }
      console.log('path pathR ==3 :', pathR, { sline1PathRef, curve1PathRef, sline2PathRef, curve2PathRef });
    }
    // if (path.isZero) {
    //   console.log('path sline2PathRef 1111:', sline2PathRef, curve2PathRef);
    // }
    if (sline1PathRef.isDraw) {
      numTag.drawLine(sline1PathRef.begin.x, sline1PathRef.begin.y, cxa, cya);
    } else if (sline1PathRef.end.x !== 0) {
      numTag.drawLine(sline1PathRef.begin.x, sline1PathRef.begin.y, sline1PathRef.end.x, sline1PathRef.end.y);
    }
    if (sline2PathRef.isDraw) {
      numTag.drawLine(sline2PathRef.begin.x, sline2PathRef.begin.y, cxa, cya);
    } else if (sline2PathRef.end.x !== 0) {
      numTag.drawLine(sline2PathRef.begin.x, sline2PathRef.begin.y, sline2PathRef.end.x, sline2PathRef.end.y);
    }
    if (curve1PathRef.isDraw) {
      numTag.drawCurve(
        curve1PathRef.begin.x,
        curve1PathRef.begin.y,
        pathRadiusRef.current,
        curve1PathRef.begin.r,
        path.r
      );
    } else if (curve1PathRef.end.r !== 0) {
      numTag.drawCurve(
        curve1PathRef.begin.x,
        curve1PathRef.begin.y,
        pathRadiusRef.current,
        curve1PathRef.begin.r,
        curve1PathRef.end.r
      );
    }
    if (curve2PathRef.isDraw) {
      numTag.drawCurve(
        curve2PathRef.begin.x,
        curve2PathRef.begin.y,
        pathRadiusRef.current,
        curve2PathRef.begin.r,
        path.r
      );
    } else if (curve2PathRef.end.r !== 0) {
      numTag.drawCurve(
        curve2PathRef.begin.x,
        curve2PathRef.begin.y,
        pathRadiusRef.current,
        curve2PathRef.begin.r,
        curve2PathRef.end.r
      );
    }
  };

  const basePathRef = useRef(null);
  const isHandleBeforePathRef = useRef(false);
  const handleBeforePath = (path) => {
    if (!isHandleBeforePathRef.current) {
      isHandleBeforePathRef.current = true;
      const wRatio = BoxViewSize.w / basePathW.current;
      const hRatio = BoxViewSize.h / basePathH.current;
      const yTop = -121 * hRatio,
        yBottom = -yTop;
      const xRight = 216 * hRatio,
        xLeft = -xRight;
      const basePath = {
        sline1: { begin: { x: 437.91 * wRatio, y: yTop }, end: { x: xLeft, y: yTop } },
        curve1: { begin: { x: xLeft, y: yTop }, end: { x: xLeft, y: yBottom } },
        sline2: { begin: { x: xLeft, y: yBottom }, end: { x: xRight, y: yBottom } },
        curve2: { begin: { x: xRight, y: yBottom }, end: { x: 0, y: 0 } },
      };
      basePathRef.current = basePath;
      const cxa = path.xa;
      const cya = path.ya;
      sline1PathRef.isDraw = true;
      sline1PathRef.begin.x = basePath.sline1.begin.x;
      sline1PathRef.begin.y = basePath.sline1.begin.y;
      console.log('handleBeforePath path', path);

      console.log('handleBeforePath 直线1的终点 00', {
        sline1end: basePath.sline1.end,
        bool1: cxa <= basePath.sline1.end.x + 1,
        bool2: cya > basePath.sline1.end.y,
      });
      console.log('handleBeforePath 弯道1的终点 00', {
        curve1end: basePath.curve1.end,
        bool1: cxa >= basePath.curve1.end.x - 1, // judgeFore(cxa, basePath.curve1.end.x),
        bool2: cya >= basePath.curve1.end.y - 1, //judgeFore(cya, basePath.curve1.end.y + 1),
      });
      console.log('handleBeforePath 直线2的终点 00', {
        // bool1: judgeFore(cxa, basePath.sline2.end.x),
        // bool2: judgeFore(cya, basePath.sline2.end.y + 1),
        bool1: cxa >= basePath.sline2.end.x - 1,
        bool2: !sline1PathRef.isDraw,
      });

      //判断是否到达直线1的终点
      if (cxa <= basePath.sline1.end.x + 1 || cya > basePath.sline1.end.y) {
        console.log('handleBeforePath 直线1的终点');
        const cxa1 = basePath.sline1.end.x;
        sline1PathRef.end.x = cxa1 + (cxa1 < 0 ? -slineGap : slineGap);
        sline1PathRef.end.y = basePath.sline1.end.y * pathYRatioRef;
        sline1PathRef.isDraw = false;
        curve1PathRef.begin.x = basePath.sline1.end.x;
        curve1PathRef.begin.y = 0;
        curve1PathRef.begin.r = 3.14159;
        curve1PathRef.isDraw = true;
      }

      //判断是否到达弯道1的终点
      if (cxa >= basePath.curve1.end.x - 1 && cya >= basePath.curve1.end.y - 1) {
        console.log('handleBeforePath 弯道1的终点');

        const cxa1 = basePath.curve1.end.x;
        curve1PathRef.end.x = basePath.curve1.end.x;
        curve1PathRef.end.y = 0;
        curve1PathRef.end.r = 3.14159 * 2; //圆弧的角度，
        curve1PathRef.isDraw = false;
        sline2PathRef.begin.x = cxa1 + (cxa1 < 0 ? -slineGap : slineGap);
        sline2PathRef.begin.y = basePath.curve1.end.y * pathYRatioRef;
        sline2PathRef.isDraw = true;
      }

      //判断是否到达直线2的终点
      if (!sline1PathRef.isDraw && cxa >= basePath.sline2.end.x - 1) {
        console.log('handleBeforePath 直线2的终点');

        // 到直线2终点时一定已经到了弯道1的终点
        const cxa1 = basePath.curve1.end.x;
        curve1PathRef.end.x = basePath.curve1.end.x;
        curve1PathRef.end.y = 0;
        curve1PathRef.end.r = 3.14159 * 2;
        curve1PathRef.isDraw = false;
        sline2PathRef.begin.x = cxa1 + (cxa1 < 0 ? -slineGap : slineGap);
        sline2PathRef.begin.y = basePath.curve1.end.y * pathYRatioRef;
        sline2PathRef.isDraw = true;

        const cxa2 = basePath.sline2.end.x;
        curve2PathRef.begin.x = cxa2;
        curve2PathRef.begin.y = 0;
        curve2PathRef.begin.r = 3.14159 * 2;
        curve2PathRef.isDraw = true;
        sline2PathRef.end.x = cxa2 + (cxa2 < 0 ? -slineGap : slineGap);
        sline2PathRef.end.y = basePath.sline2.end.y * pathYRatioRef;
        sline2PathRef.isDraw = false;
      }
    }
  };

  //#endregion

  useEffect(() => {
    if (isMounted) {
      init();
      setView();
      //console.log('aiRaceResult.current:', aiRaceResult.current);
      if (aiRaceResult.current && aiRaceResult.current.length > 0) {
        handleRanderSTOByCTime(0);
      }
      //window.addEventListener('resize', setView);
    }
    return () => {
      //window.removeEventListener('resize', setView);
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
      transform: translate(-0.3125rem, -0.05rem);
    }
  }
`;

export default forwardRef(LiveSantaTrackPreview);
