import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import styled from 'styled-components';

import { getTrackColor } from '@/utils/raceUtil';

import LiveTrackTip from './LiveTrackTip';
import { NumTag } from './LiveTrackUtil';

function LiveSantaTrackPreview(
  {
    raceDataInfo,
    raceAwardExts,
    setRealRaceRank,
    realPathPos,
    raceVideoTimeInfo,
    racePlay,
    timeoutRemove,
    isPlayBroadcast = false,
    CanvasBoxClass,
  },
  ref
) {
  const [isMounted, setIsMounted] = useState(false);
  const CanvasBox = useRef(null);
  const CanvasBoxBgRef = useRef(null);
  const canvasElem = useRef<HTMLCanvasElement>(null);
  const canvasCTX = useRef<CanvasRenderingContext2D>(null);
  const canvasBgImg = useRef<HTMLImageElement>(null);
  const HorseNumberMap = useRef<Map<string, NumTag>>(new Map()).current;
  const raceAwardExtsMap = useRef<Map<string, any>>(new Map()).current;

  //const raceBroadcastMap = useRef<Map<string, any>>(null);
  const canvasElemRect = useRef<any>();
  const ReqAFrameId = useRef(0);
  const segCount = useRef(20); //每秒40帧 //把每0.5秒的点继续分割 20 // 0.1秒分割4
  const aiRaceResult = useRef([]);
  const pathIndex = useRef(realPathPos?.pathIndex);
  const pathLength = useRef(1);
  const pathCount = useRef(realPathPos?.pathCount);
  const lastTimestampMS = useRef(0);
  const racePathPlay = useRef(racePlay);
  const basePathW = useRef(800 + 12 * 14); //799.82 //430.82+119*2+250-119
  const basePathH = useRef(238 + 12 * 14); //238  //119*2
  // const basePathW = useRef(899.82);
  // const basePathH = useRef(338);
  const diffRatio = useRef(1);
  const raceHorseCount = useRef(12);
  const pathPlaySpeed = useRef(1); //曲线播放速度 //1 1倍速，2 2倍速,...
  const randerSTOId = useRef(null);
  const videoPreludeTimes = useRef(26); //比赛视频过场时长
  const isRaceTrackZoom = useRef(false); //跑道是否放大

  const BoxViewSize = useRef<{ w: number; h: number }>({
    w: 2286,
    h: 1182,
  }).current;

  const [numPos, setNumPos] = useState<any>({
    color: '#fff',
    txt: '0',
    hInfo: null,
    x: 0,
    y: 0,
  });

  const RaceAudioRef = useRef(null);
  const [raceAudioText, setRaceAudioText] = useState('');
  const raceBroadcastMap = useRef<Map<string, any>>(new Map()).current;
  const playBroadcastSTOId = useRef(null);

  useImperativeHandle(ref, () => ({
    setRaceProgressPct,
    setRacePathPlay,
    setPathPlaySpeed,
    setRaceTrackZoom,
  }));
  const setRaceTrackZoom = (isZoom) => {
    isRaceTrackZoom.current = isZoom;
    canvasElem.current.removeEventListener('mousemove', handleMousemove);
    BoxViewSize.w > 600 && !isRaceTrackZoom.current && createListenerMousemove();
    CanvasBoxBgRef.current.style.transform = 'initial';
    CanvasBoxBgRef.current.style.transformOrigin = 'initial';
  };

  /**
   * @param speedRate //曲线播放速度[1~10] //1 1倍速; 2 2倍速; 4 4倍速 ...
   */
  const setPathPlaySpeed = (speedRate: number, currentTime = 0) => {
    pathPlaySpeed.current = speedRate;
    videoPreludeTimes.current = videoPreludeTimes.current / speedRate;
    handleRanderSTOByCTime(currentTime);
    //处理加减速之后点的位置
    const prePathLength = pathLength.current;
    createRacePath();
    pathIndex.current = Math.floor((pathIndex.current / prePathLength) * pathLength.current);
  };

  const setRacePathPlay = (isPlay, currentTime = 0) => {
    racePathPlay.current = isPlay;
    handleRanderSTOByCTime(currentTime);
    pathCount.current = 0;
    // let stoDuration = videoPreludeTimes.current - currentTime;
    // stoDuration = timeoutRemove || stoDuration < 0 ? 0 : stoDuration;
    // randerSTOId.current && clearTimeout(randerSTOId.current);
    // randerSTOId.current = setTimeout(() => {
    //   renderScene();
    // }, stoDuration * 1000);
  };

  const setRaceProgressPct = (currentTime, totalTime) => {
    if (aiRaceResult.current && aiRaceResult.current.length > 0) {
      let stoDuration = videoPreludeTimes.current - currentTime;
      stoDuration = timeoutRemove || stoDuration < 0 ? 0 : stoDuration;
      if (stoDuration > 0) {
        racePathPlay.current = false;
        randerSTOId.current && clearTimeout(randerSTOId.current);
        randerSTOId.current = setTimeout(() => {
          racePathPlay.current = true;
          renderScene();
        }, stoDuration * 1000);
      } else {
        randerSTOId.current && clearTimeout(randerSTOId.current);
        renderScene();
      }

      const speedDataLength = aiRaceResult.current[0].speedData.length;
      currentTime = currentTime - videoPreludeTimes.current; //跳过视频的26秒片头
      currentTime = currentTime < 0 ? 0 : currentTime;
      if (totalTime > 0) {
        totalTime = totalTime - videoPreludeTimes.current;
        totalTime = totalTime < 0 ? 0 : totalTime;
        const speedRate = totalTime === 0 ? 0 : currentTime / totalTime;
        pathIndex.current = Math.floor((speedDataLength - 1) * speedRate);
      }
      rerDraw();
      const tmpRaceRank = [];
      for (let index = 0; index < HorseNumberMap.size; index++) {
        const raceRes = aiRaceResult.current[index];
        const numTag = HorseNumberMap.get('number' + raceRes.trackNumber) as NumTag;
        const path = raceRes.speedData[pathIndex.current];
        numTag.draw2(canvasCTX.current, path?.xa + 2, getCurrPathYa(path.ya, index));
        tmpRaceRank.push({
          pathIndex: pathIndex.current,
          pathCount: pathCount.current,
          gameHorseId: raceRes.gameHorseId,
          rankEnd: raceRes.ranking,
          ranking: path.ranking,
        });
      }
      setRealRaceRank(tmpRaceRank);
    }
  };

  //#region handles
  const handleRanderSTOByCTime = (currentTime) => {
    let stoDuration = videoPreludeTimes.current - currentTime;
    stoDuration = timeoutRemove || stoDuration < 0 ? 0 : stoDuration;
    randerSTOId.current && clearTimeout(randerSTOId.current);
    randerSTOId.current = setTimeout(() => {
      renderScene();
    }, stoDuration * 1000);
  };
  const handlePalyBroadcast = (pathT) => {
    if (RaceAudioRef.current && raceBroadcastMap.size > 0) {
      //console.log('handlePalyBroadcast pathT:', { pathT });
      const ckey = pathT.toFixed(1) + '';
      if (raceBroadcastMap.has(ckey)) {
        const broadcast = raceBroadcastMap.get(ckey);
        if (broadcast.audio && broadcast.audio instanceof Array && broadcast.audio.length > 0) {
          const audioElementsPre = RaceAudioRef.current.querySelectorAll('audio');
          audioElementsPre.forEach((element) => {
            element.remove();
          });
          broadcast.audio.map((item, i) => {
            const audioElem = document.createElement('audio');
            audioElem.src = item;
            RaceAudioRef.current.append(audioElem);
          });
          const audioElements = RaceAudioRef.current.querySelectorAll('audio');
          let audioElemIndex = 0;
          const handlePlayNextAudio = () => {
            //console.log('setRaceBroadcastData handlePlayNextAudio:', { audioElemIndex, count: audioElements.length });
            if (audioElemIndex < audioElements.length) {
              const elem = audioElements[audioElemIndex];
              elem.muted = false;
              elem.volume = 1;
              elem.play();
              audioElemIndex++;
              audioElements[audioElemIndex]?.addEventListener('ended', handlePlayNextAudio);
            } else {
              audioElemIndex = 0;
            }
          };
          handlePlayNextAudio();
          audioElements[0].addEventListener('ended', handlePlayNextAudio);

          playBroadcastSTOId.current && clearTimeout(playBroadcastSTOId.current);
          setRaceAudioText(broadcast.commentary);
          const stoDuration = broadcast.duration + 1;
          playBroadcastSTOId.current = setTimeout(() => {
            setRaceAudioText('');
          }, stoDuration * 1000);
        }
      }
    }
  };
  const handleBroadcastData = (broadcastData) => {
    //console.log('handleBroadcastData broadcastData:', broadcastData);
    if (!isPlayBroadcast) return;
    if (broadcastData && raceBroadcastMap.size <= 0) {
      for (const ckey in broadcastData) {
        const item = broadcastData[ckey];
        item.commentary = item.commentary.replace(/####/g, '');
        const audioUrl = item.audio;
        if (audioUrl.indexOf('####', '') > 0) {
          const audioUrls = audioUrl.split('####');
          audioUrls.forEach((url) => {
            const audio = document.createElement('audio');
            audio.src = url;
            audio.muted = true;
            CanvasBox.current.append(audio);
          });
          item.audio = audioUrls;
        } else {
          const audio = document.createElement('audio');
          audio.src = item.audio;
          audio.muted = true;
          CanvasBox.current.append(audio);
          item.audio = [item.audio];
        }
        raceBroadcastMap.set(ckey, item);
      }
    }
  };

  const handleHorseNumPos = (numTag) => {
    if (!isRaceTrackZoom.current) return;
    const cvsCenter = { x: BoxViewSize.w / 2, y: BoxViewSize.h / 2 };
    const tagX = numTag.x + cvsCenter.x;
    let tagY = numTag.y + cvsCenter.y;
    //tagY = tagY * (numTag.y < 0 ? (150 + numTag.y) / 150 : 0.5 + numTag.y / 150);
    tagY = tagY * ((basePathH.current / 2 + numTag.y) / (basePathH.current - 70));
    CanvasBoxBgRef.current.style.transform = 'scale(2)';
    CanvasBoxBgRef.current.style.transformOrigin = tagX + 'px ' + tagY + 'px';
    //console.log('handleHorseNumPos numTag: ', { tagX, tagY }, numTag);
  };

  const handleMousemove = useCallback((mouseEvt) => {
    if (HorseNumberMap && HorseNumberMap.size > 0) {
      const mouseX = mouseEvt.clientX - canvasElemRect.current.left;
      const mouseY = mouseEvt.clientY - canvasElemRect.current.top;
      const cvsCenter = { x: BoxViewSize.w / 2, y: BoxViewSize.h / 2 };
      HorseNumberMap.forEach((numTag) => {
        const tagX = numTag.x + cvsCenter.x;
        const tagY = numTag.y + cvsCenter.y;
        if (mouseX >= tagX - 10 && mouseX <= tagX + 10 && mouseY >= tagY - 6 && mouseY <= tagY + 6) {
          setTimeout(() => {
            const raeItem = raceAwardExtsMap.get(numTag.txt);
            setNumPos({
              color: numTag.color,
              txt: numTag.txt,
              hInfo: raeItem,
              x: Math.round(tagX + CanvasBoxBgRef.current.offsetLeft + 5),
              y: Math.round(tagY + CanvasBoxBgRef.current.offsetTop),
            });
          }, 0);
        } else {
          setNumPos({ color: '#ffff', txt: '0', hInfo: null, x: 0, y: 0 });
        }
      });
    }
  }, []);

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

  const createListenerMousemove = () => {
    canvasElem.current.addEventListener('mousemove', handleMousemove);
  };
  const getCurrPathYa = (ya, idx, pathIdx = 0) => {
    // if (BoxViewSize.w < 600) return ya + 3 - idx * 1.5;

    let yaSpace = diffRatio.current * (raceHorseCount.current <= 7 ? 9 : 4);
    yaSpace = BoxViewSize.w < 600 ? yaSpace - 2 : yaSpace;
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
    CanvasBoxBgRef.current.style.backgroundImage = 'url(' + bgUrl + ')';

    createRacePath();
    BoxViewSize.w > 600 && !isRaceTrackZoom.current && createListenerMousemove();
  };
  const createRacePath = useCallback(() => {
    const aiJson = raceDataInfo?.raceAiJson ? JSON.parse(raceDataInfo.raceAiJson) : null;
    //console.log('raceAiJson,aiJson:', aiJson);
    if (aiJson && aiJson.raceResult && aiJson.raceResult.length > 0) {
      //console.log('createRacePath,aiJson:', aiJson.broadcastData);
      handleBroadcastData(aiJson.broadcastData);
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
                //xa: Math.abs(dirX + cxaPre + cxaDiff * index3),
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
      const rds = BoxViewSize.w < 600 ? 2 : diffRatio.current * 12;
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
    if (raceAwardExts && raceAwardExts.length > 0) {
      raceAwardExts.forEach((item) => {
        raceAwardExtsMap.set(item.horseCode, item);
      });
    }
  }, [CanvasBox, HorseNumberMap]);

  const renderScene = useCallback(() => {
    if (canvasCTX.current && HorseNumberMap.size > 0) {
      //pathCount.current < 1 只跑一圈
      if (pathCount.current < 1 && racePathPlay.current) {
        //每秒40帧 // 25= 1000/40
        //if (performance.now() - lastTimestampMS.current >= Math.floor(25 / pathPlaySpeed.current)) {
        if (performance.now() - lastTimestampMS.current >= 25) {
          lastTimestampMS.current = performance.now();
          if (pathIndex.current < aiRaceResult.current[0].speedData.length) {
            rerDraw();
            const tmpRaceRank = [];
            for (let index = 0; index < HorseNumberMap.size; index++) {
              const raceRes = aiRaceResult.current[index];
              const numTag = HorseNumberMap.get('number' + raceRes.trackNumber) as NumTag;
              const path = raceRes.speedData[pathIndex.current];
              const cxa = path.xa;
              const cya = path.ya;
              numTag.draw2(canvasCTX.current, cxa + 2, getCurrPathYa(cya, index, pathIndex.current));
              if (pathIndex.current % segCount.current === 0) {
                if (index === 0) {
                  handlePalyBroadcast(path.t);
                }
                if (path.ranking === 1) {
                  handleHorseNumPos(numTag);
                }
                tmpRaceRank.push({
                  pathIndex: pathIndex.current,
                  pathCount: pathCount.current,
                  gameHorseId: raceRes.gameHorseId,
                  rankEnd: raceRes.ranking,
                  ranking: path.ranking,
                });
              }
            }
            tmpRaceRank && tmpRaceRank.length > 0 && setRealRaceRank(tmpRaceRank);
            pathIndex.current++;
          } else {
            pathIndex.current = 0;
            pathCount.current++;
          }
        }
      }
    }
    ReqAFrameId.current = window.requestAnimationFrame(() => renderScene());
  }, []);

  //#endregion

  useEffect(() => {
    if (isMounted) {
      init();
      setView();
      //console.log('aiRaceResult.current:', aiRaceResult.current);
      if (aiRaceResult.current && aiRaceResult.current.length > 0) {
        handleRanderSTOByCTime(raceVideoTimeInfo.currentTime);
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
          <div
            className='mg-num-box absolute z-10 text-base text-white'
            style={{
              display: numPos.x === 0 ? 'none' : 'block',
              left: numPos.x + 'px',
              top: numPos.y + 'px',
              //backgroundColor: numPos.color,
            }}>
            <LiveTrackTip horseInfo={numPos.hInfo} />
          </div>
          <CanvasBoxStyled
            className={` relative flex  items-center justify-center overflow-hidden ${CanvasBoxClass}`}
            ref={CanvasBox}>
            <div className='' ref={CanvasBoxBgRef}></div>
            <div
              className={
                ' absolute bottom-10 left-0 flex w-full items-center justify-center ' +
                (raceAudioText === '' ? 'hidden' : '')
              }
              hidden={raceAudioText === ''}>
              <p className=' rounded bg-[#000000aa] px-4 py-1 text-center text-2xl text-white '>{raceAudioText}</p>
            </div>
            <audio preload='none' className=' hidden' ref={RaceAudioRef}></audio>
          </CanvasBoxStyled>
        </div>
      ) : null}
    </>
  );
}
const CanvasBoxStyled = styled.div`
  .mg-canvas,
  .mg-canvas-min {
    background-image: url('/models/2d/bg/track_bg.png');
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    transition: 0.7s;
  }
`;

export default forwardRef(LiveSantaTrackPreview);
