import { Client, StompSubscription } from '@stomp/stompjs';
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';

import { config } from '@/config';
import { getFieldTypeByFieldId } from '@/utils/raceUtil';
import LiveSantaTrackPreviewWS from '@/views/raceTrack2D/LiveSantaTrackPreviewWSZoom';

import reacPathAI from '~/models/json/rece-standard-3horse-ws.json';
import { getRandomUUID } from '@/utils';

export default function LiveTrackTest() {
  const liveTrackPreviewRef = useRef(null);
  const liveTrackPreviewWSRef = useRef(null);
  const stompWsURLRef = useRef(config.aiApiBaseHostWS + '/live');
  const inputRaceIdRef = useRef(null);
  const stompWsRaceIdRef = useRef('');
  const stompClientRef = useRef<Client>(null);
  const [LiveData, setLiveData] = useState(null);
  const [raceRank, setRaceRank] = useState([]); //比赛排行榜
  const pathIndex = useRef(0);
  const [stompSub, setStompSub] = useState<StompSubscription>();
  const [realRaceRank, setRealRaceRank] = useState([
    {
      pathIndex: 0,
      pathCount: 0,
      gameHorseId: '1',
      rankEnd: 1,
      ranking: 1,
    },
  ]); //实时赛事排名

  const [fieldType, setFieldType] = useState('Standard'); //赛场类型
  const [isRaceTrackZoom, setIsRaceTrackZoom] = useState(false);
  const [rdmRaceId, setRdmRaceId] = useState(getRandomUUID(12));

  const apiData = reacPathAI;

  const handleOnConnect = (frame) => {
    // console.log('handleOnConnect Successfully connected !! frame:', frame);
    const subc = stompClientRef.current.subscribe('/platform/' + stompWsRaceIdRef.current, (msg) => {
      //console.log('handleOnConnect subscribe msg:', msg);
      if (msg && msg.body && msg.body !== 'race finished!') {
        const body = JSON.parse(msg.body + '');
        if (body) {
          handleSendSpeedData(body);
          handleSendBroadcast(body);
        }
      }
    });
    setStompSub(subc);
  };

  const handleSendSpeedData = (msgBody) => {
    const resHorsePaths: any[] = [];
    let msgTNumber = 0;
    for (const ckey in msgBody) {
      if (!['text', 'url', 'audio_t'].includes(ckey)) {
        const vals = msgBody[ckey];
        //console.log('handleSendSpeedData vals:', vals);
        if (vals.length >= 15) {
          const path = { t: 0, xa: 0, ya: 0, ranking: 0 };
          vals.map((val, i) => {
            switch (i) {
              case 0:
                path.t = val;
                break;
              case 1:
                path.xa = val;
                break;
              case 2:
                path.ya = val;
                break;
              case 13:
                path.ranking = val;
                break;
            }
          });

          msgTNumber += 1;
          resHorsePaths.push({
            gameHorseId: ckey,
            ranking: path.ranking,
            trackNumber: msgTNumber,
            speedData: path,
          });
        }
      }
    }
    //console.log('handleSendSpeedData resHorsePaths:', resHorsePaths);
    liveTrackPreviewWSRef.current &&
      resHorsePaths.length > 0 &&
      liveTrackPreviewWSRef.current.setRaceData(resHorsePaths);
  };

  //let sendBroadcastIdx = 0;
  const handleSendBroadcast = (msgBody) => {
    if (Object.keys(msgBody).includes('text')) {
      const mbTexts = msgBody.text;
      const mbAudioT = msgBody.audio_t;
      const mbUrls = msgBody.url;
      if (!mbAudioT || mbAudioT == 0) return;
      if (mbTexts instanceof Array && mbTexts.length > 0 && mbUrls.length >= mbTexts.length) {
        const broadcastData = {
          audio: mbUrls,
          duration: mbAudioT,
          commentary: mbTexts.join(' '),
        };
        liveTrackPreviewWSRef.current && liveTrackPreviewWSRef.current.setRaceBroadcastData(broadcastData);

        // for (let index = 0; index < mbTexts.length; index++) {
        //   const broadcastData = {
        //     audio: mbUrls[index],
        //     duration: mbAudioT,
        //     commentary: mbTexts[index],
        //   };
        //   //#TODO 临时处理，测试数据时语音太多，人为过滤播放
        //   if (sendBroadcastIdx % 20 === 0)
        //     liveTrackPreviewWSRef.current && liveTrackPreviewWSRef.current.setRaceBroadcastData(broadcastData);
        //   sendBroadcastIdx++;
        // }
      }
    }
  };

  const handleStompClientConnect = () => {
    stompClientRef.current.activate();
  };
  const handleStompClientDisconnect = () => {
    stompSub?.unsubscribe();
    stompClientRef.current.forceDisconnect();
    stompClientRef.current
      .deactivate()
      .then(() => {
        console.log('handleStompClientDisconnect then');
      })
      .catch((err) => {
        console.log('handleStompClientDisconnect catch err:', err);
      });
  };

  const handlePostRace = (raceId) => {
    //The Race distance is not valid, we support 1000, 1200, 1400, 1600, 1800, 1900'
    const raceHorseInfoData = {
      fieldId: 'field_002',
      gameRaceId: raceId,
      distance: 1600,
      maxLevel: 0,
      minLevel: 0,
      horses: [
        {
          gameHorseId: '50001',
          trackNumber: 1,
          playerId: 'p1',
          hlv: 1,
          spd: 18,
          sta: 14,
          stg: 15,
          agi: 14,
          start: 3.0,
          finish: 3.0,
          explosive: 3.0,
          endurance: 3.0,
          docile: 3.0,
          irritable: 3.0,
        },
        {
          gameHorseId: '50002',
          trackNumber: 2,
          playerId: 'p2',
          hlv: 1,
          spd: 19,
          sta: 16,
          stg: 17,
          agi: 16,
          start: 3.0,
          finish: 3.0,
          explosive: 3.0,
          endurance: 3.0,
          docile: 3.0,
          irritable: 3.0,
        },
        {
          gameHorseId: '50003',
          trackNumber: 3,
          playerId: 'p3',
          hlv: 1,
          spd: 19,
          sta: 17,
          stg: 15,
          agi: 18,
          start: 3.0,
          finish: 3.0,
          explosive: 3.0,
          endurance: 3.0,
          docile: 3.0,
          irritable: 3.0,
        },
      ],
    };
    apiData.data.gameRaceInfo.fieldModelId = raceHorseInfoData.fieldId;
    apiData.data.gameRaceInfo.areaLength = raceHorseInfoData.distance;
    const apiHost = config.aiApiBaseHost;
    fetch(apiHost + '/race/platform/register', {
      method: 'post',
      body: JSON.stringify(raceHorseInfoData),
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(function (res) {
      //console.log('register data', res);
      res.json().then(function (data) {
        console.log('register data', data);
        const resStatus = data.data.status;
        if (resStatus === 'FINISHED' || resStatus === 'PROCESSING') {
          alert('raceId=' + raceId + '  FINISHED');
          return;
        }
        setTimeout(() => {
          fetch(apiHost + '/race/platform/start/' + raceId, {
            method: 'get',
          }).then(function (sdata) {
            //console.log('start data', sdata);
          });
        }, 3 * 1000);
      });
    });
  };

  const initStompClient = () => {
    stompClientRef.current = new Client({
      brokerURL: stompWsURLRef.current,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: handleOnConnect,
      onDisconnect: () => {
        console.log('handleOnDisconnect Disconnected');
      },
      onWebSocketError: (error) => {
        console.error('Error with websocket', error);
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
    });
  };

  const handleStartPlay = () => {
    handlePostRace(inputRaceIdRef.current.value);
    setFieldType(getFieldTypeByFieldId(apiData.data.gameRaceInfo.fieldModelId));
    setLiveData(apiData.data.gameRaceInfo);
    setRaceRank(apiData.data.gameRaceAwardExts);
    stompWsRaceIdRef.current = inputRaceIdRef.current.value; ///apiData.data.gameRaceInfo.id;
    handleStompClientConnect();
  };
  // useEffect(() => {
  //   console.log('useEffect LiveData:', LiveData);
  //   LiveData && handleStompClientConnect();
  // }, [LiveData]);
  useEffect(() => {
    initStompClient();

    return () => {
      handleStompClientDisconnect();
    };
  }, []);

  return (
    <div className=' h-full w-full'>
      <div className='  flex  flex-col items-center  '>
        <div
          className={` fixed left-[50%] top-[50%] z-10 flex -translate-x-1/2 flex-col items-center  ${
            LiveData ? ' hidden ' : ''
          } `}
          hidden={LiveData}>
          <input
            className=' h-16 w-80'
            ref={inputRaceIdRef}
            placeholder='Race Id'
            value={rdmRaceId}
            onChange={() => {
              setRdmRaceId(inputRaceIdRef.current.value);
            }}
          />
          <br />
          <Image
            alt='play'
            title='play '
            width={100}
            height={100}
            src='/models/2d/btns/play.png'
            className='custom-cursor-pointer h-18 w-18'
            onClick={() => {
              handleStartPlay();
            }}
          />
        </div>
        {LiveData && (
          <>
            <button
              className=' m-4 rounded bg-blue-400 p-2 text-3xl text-white shadow shadow-blue-200'
              onClick={() => {
                liveTrackPreviewWSRef.current && liveTrackPreviewWSRef.current.setRaceTrackZoom(!isRaceTrackZoom);
                setIsRaceTrackZoom(!isRaceTrackZoom);
              }}>
              {isRaceTrackZoom ? 'exit zoom' : 'zoom'}
            </button>
            {fieldType === 'Standard' ? (
              <></>
            ) : (
              <LiveSantaTrackPreviewWS
                raceDataInfo={LiveData}
                raceAwardExts={raceRank}
                setRealRaceRank={setRealRaceRank}
                isPlayBroadcast={true}
                ref={liveTrackPreviewWSRef}
                CanvasBoxClass='h-[calc(100%-3.375rem)] w-[calc(100%-3.375rem)]  bg-slate-700 '
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
