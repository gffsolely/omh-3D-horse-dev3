import gsap from 'gsap';
import * as THREE from 'three';
import FontHelvetikerRegularJson from 'three/examples/fonts/helvetiker_regular.typeface.json';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';

import { getTrackColor } from '@/utils/raceUtil';

// saddle;2马鞍; // stirrup; 3马镫; // rein; 1缰绳; // saddlePad 4鞍垫
export enum HorseEquipType {
  Rein = 1,
  Saddle = 2,
  Stirrup = 3,
  SaddlePad = 4,
}
export enum AnimationType {
  Stand = 'stand',
  Run = 'run',
  /**冲刺 */
  Sprint = 'sprint', //冲刺
  /** 挥鞭 */
  Whiplash = 'whiplash',
  /**突围 */
  Overtake = 'Overtake', //突围
  /** 减速（拉绳） */
  Hold = 'hold',
}

export const getTextureByNumber = (hNumber) => {
  const texture = new THREE.CanvasTexture(document.createElement('canvas'));
  const canvas = texture.image;
  const ctx = canvas.getContext('2d');
  const width = 90;
  const height = 90;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = getTrackColor(hNumber);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `64px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.fillText(hNumber, width / 2, height / 2 + 4);
  texture.needsUpdate = true;
  return texture;
};

export const getVideoTexture = (videoUrl, loadManager, isEncoding = true, muted = true) => {
  const videoElem = document.createElement('video');
  videoElem.src = videoUrl;
  videoElem.loop = true;
  videoElem.muted = muted;
  videoElem.autoplay;
  videoElem.crossOrigin = 'anonymous';
  loadManager.current.itemStart(videoUrl);
  videoElem.onloadeddata = () => {
    loadManager.current.itemEnd(videoUrl);
  };
  videoElem.play();

  const texture_video = new THREE.VideoTexture(videoElem);
  texture_video.minFilter = THREE.LinearFilter;
  texture_video.magFilter = THREE.LinearFilter;
  isEncoding && (texture_video.encoding = THREE.sRGBEncoding);
  return texture_video;
};

export const getFontTextByNumber = (loadManager, hNumber) => {
  const loader = new FontLoader(loadManager.current);
  const font = loader.parse(FontHelvetikerRegularJson);
  const geometry = new TextGeometry('' + hNumber, {
    font: font,
    size: 0.3,
    height: 0.05,
  });
  const hNumMesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: getTrackColor(hNumber),
    })
  );
  return hNumMesh;
};

export const getUserConeMeshByNumber = (hNumber) => {
  const hConeGroup = new THREE.Group();
  const geometry = new THREE.ConeGeometry(0.12, 0.26, 6);
  const cColor = getTrackColor(hNumber);
  const hConeMesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: cColor, flatShading: true }));
  hConeMesh.receiveShadow = true;
  const hWireframe = new THREE.LineSegments(
    new THREE.WireframeGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 0.2, opacity: 0.6, transparent: true })
  );
  hConeGroup.add(hConeMesh);
  hConeGroup.add(hWireframe);
  hConeGroup.rotation.x = Math.PI;
  return hConeGroup;
};

export const getFps = (loadManager) => {
  loadManager.itemStart('');

  let fps = 0;
  let fps2 = 0;
  let lastCalledTime = performance.now();
  let reqAnimId = null;
  const animate = () => {
    reqAnimId = window.requestAnimationFrame(animate);
    // if (lastCalledTime === 0) {
    //   lastCalledTime = performance.now();
    //   return;
    // }
    // const delta = (performance.now() - lastCalledTime) / 1000;
    // fps = Math.round(1 / delta);
    // lastCalledTime = performance.now();
    // console.log('getFps fps:' + fps);

    fps++;
    if (performance.now() - lastCalledTime >= 1000) {
      lastCalledTime = performance.now();
      //console.log(fps + ' fps2-------------');
      fps2 = fps;
      fps = 0;
    }
  };
  animate();
  return new Promise<number>((resolve) => {
    setTimeout(function () {
      loadManager.itemEnd('');
      reqAnimId && window.cancelAnimationFrame(reqAnimId);
      resolve(fps2);
    }, 1100);
  });
};

/**
 *  使用 loadingHide 与loadingShow时需要在页面中添加如下内容:
      <div className='mg-door-box absolute left-0 top-0 z-20 flex h-full w-full items-center justify-center  '>
        <div className='mg-door-top  absolute left-0 top-0  h-1/2 w-full bg-[rgba(0,0,0,1)]'></div>
        <div className='mg-door-button absolute bottom-0 left-0  h-1/2 w-full bg-[rgba(0,0,0,1)]'></div>
        <span className='mg-door-text static z-10 text-[1rem] text-white'>{loaded.toFixed(2)}%</span>
      </div>
 * 
 */
export const loadingHide = (onComplete = null) => {
  const ease = 'power4.inOut';
  gsap.to(['.mg-door-top', '.mg-door-button'], {
    yPercent: 0,
    duration: 1,
    ease,
    onStart: () => {
      (document.querySelector('.mg-door-box') as HTMLElement).style.zIndex = '20';
    },
    onComplete: () => {
      onComplete && onComplete();
    },
  });
};
export const loadingShow = (onComplete = null) => {
  //console.log('loadingShow', Date.now());
  const ease = 'power4.inOut';
  gsap.to('.mg-door-text', {
    opacity: 0,
    duration: 0.5,
  });
  gsap.to('.mg-door-top', {
    yPercent: -100,
    duration: 1,
    ease,
  });
  gsap.to('.mg-door-button', {
    yPercent: 100,
    duration: 1,
    ease,
    onComplete: () => {
      onComplete && onComplete();
      (document.querySelector('.mg-door-box') as HTMLElement).style.zIndex = '-1';
    },
  });
};

export default class TrackArenaUtil {
  private textureLoader = null;
  private raceAudioRef = null;
  private raceBroadcastMap = new Map<string, any>();
  private playBroadcastSTOId = null;
  private isPlayBroadcast = false;
  constructor(loadManager, raceAudioRef = null, isPlayBroadcast = false) {
    this.raceAudioRef = raceAudioRef;
    this.textureLoader = new THREE.TextureLoader(loadManager);
    this.isPlayBroadcast = isPlayBroadcast;
  }

  getDigitalHTexture(textureUrl) {
    if (textureUrl && textureUrl.length > 0) {
      const texture = this.textureLoader.load(textureUrl);
      texture.encoding = THREE.sRGBEncoding;
      texture.flipY = false;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
    }
    return null;
  }
  setHorseEquipTexture(modelObj, modelDHorse) {
    const baseColorTextrue = this.getDigitalHTexture(modelObj.baseTextrueUrl);
    const lightTextrue = this.getDigitalHTexture(modelObj.lightTextrueUrl);
    if (baseColorTextrue && modelDHorse) {
      modelDHorse.traverse(function (child: any) {
        if (child.isMesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (modelObj.type == HorseEquipType.Saddle && child.name === 'Saddle') {
            mat.map = baseColorTextrue;
            mat.emissive = new THREE.Color(lightTextrue ? 0xffffff : 0x000000);
            mat.emissiveMap = lightTextrue;
          } else if (modelObj.type == HorseEquipType.SaddlePad && child.name === 'Sweatpad') {
            mat.map = baseColorTextrue;
            mat.emissive = new THREE.Color(lightTextrue ? 0xffffff : 0x000000);
            mat.emissiveMap = lightTextrue;
          } else if (modelObj.type == HorseEquipType.Rein && child.name === 'Reins') {
            mat.map = baseColorTextrue;
            mat.emissive = new THREE.Color(lightTextrue ? 0xffffff : 0x000000);
            mat.emissiveMap = lightTextrue;
          } else if (modelObj.type == HorseEquipType.Stirrup && child.name === 'Stirrup') {
            mat.map = baseColorTextrue;
            mat.emissive = new THREE.Color(lightTextrue ? 0xffffff : 0x000000);
            mat.emissiveMap = lightTextrue;
          }
          child.material.needsUpdate = true;
        }
      });
    }
  }

  getRacePathByRaceData(raceDataInfo, segCount, pathPlaySpeed) {
    const aiJson = raceDataInfo?.raceAiJson ? JSON.parse(raceDataInfo.raceAiJson) : null;
    //console.log('raceAiJson,aiJson:', aiJson);
    const resHorsePaths: any[] = [];
    if (aiJson && aiJson.raceResult && aiJson.raceResult.length > 0) {
      //console.log('createRacePath,aiJson:', aiJson.broadcastData);
      this.handleBroadcastData(aiJson.broadcastData);
      if (aiJson.interval) {
        //判断坐标点间隔时长，//0.5~0.1
        segCount.current = aiJson.interval * 40;
      }
      //倍速播放时减少曲线点数
      segCount.current = segCount.current / pathPlaySpeed.current;

      const raceRes = aiJson.raceResult;

      for (let index = 0; index < raceRes.length; index++) {
        const chorse = raceRes[index];
        resHorsePaths.push({
          gameHorseId: chorse.gameHorseId,
          ranking: chorse.ranking,
          trackNumber: chorse.trackNumber + '',
          speedData: [],
        });
        let isSkip = true;
        for (let index2 = 0; index2 < chorse.speedData.length; index2++) {
          if (index2 >= 1) {
            const pPre = chorse.speedData[index2 - 1];
            //跳过起点时原地踏步问题,过滤前1秒数据
            if (pPre.t <= 1) continue;

            let pathPre = chorse.speedData[index2 - 1];
            if (isSkip) {
              pathPre = chorse.speedData[0];
              isSkip = false;
            }

            //const pathPre = chorse.speedData[index2 - 1];
            const cxaPre = -pathPre.xa;
            const cyaPre = pathPre.ya;
            const path = chorse.speedData[index2];
            const cxa = -path.xa;
            const cya = path.ya;
            const cxaDiff = (cxa - cxaPre) / segCount.current;
            const cyaDiff = (cya - cyaPre) / segCount.current;
            for (let index3 = 0; index3 < segCount.current; index3++) {
              resHorsePaths[index].speedData.push({
                isZero: index3 === 0,
                xa: cxaPre + cxaDiff * index3,
                ya: -1,
                za: cyaPre + cyaDiff * index3,
                t: pathPre.t,
                r: pathPre.direction,
                ranking: pathPre.ranking,
              });
            }
          }
        }
      }
    }
    return resHorsePaths;
  }

  private handleBroadcastData(broadcastData) {
    //console.log('handleBroadcastData broadcastData:', broadcastData);
    if (!this.isPlayBroadcast) return;
    if (broadcastData && this.raceAudioRef && this.raceBroadcastMap.size <= 0) {
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
            this.raceAudioRef.current.append(audio);
          });
          item.audio = audioUrls;
        } else {
          const audio = document.createElement('audio');
          audio.src = item.audio;
          audio.muted = true;
          this.raceAudioRef.current.append(audio);
          item.audio = [item.audio];
        }
        this.raceBroadcastMap.set(ckey, item);
      }
    }
  }
  handlePalyBroadcast(pathT, setRaceAudioText) {
    if (!this.isPlayBroadcast) return;
    if (this.raceAudioRef && this.raceBroadcastMap.size > 0) {
      //console.log('handlePalyBroadcast pathT:', { pathT });
      const ckey = pathT.toFixed(1) + '';
      if (this.raceBroadcastMap.has(ckey)) {
        const broadcast = this.raceBroadcastMap.get(ckey);
        if (broadcast.audio && broadcast.audio instanceof Array && broadcast.audio.length > 0) {
          const audioElementsPre = this.raceAudioRef.current.querySelectorAll('audio');
          audioElementsPre.forEach((element) => {
            element.remove();
          });
          broadcast.audio.map((item, i) => {
            const audioElem = document.createElement('audio');
            audioElem.src = item;
            this.raceAudioRef.current.append(audioElem);
          });
          const audioElements = this.raceAudioRef.current.querySelectorAll('audio');
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

          this.playBroadcastSTOId && clearTimeout(this.playBroadcastSTOId);
          setRaceAudioText(broadcast.commentary);
          const stoDuration = broadcast.duration + 1;
          this.playBroadcastSTOId = setTimeout(() => {
            setRaceAudioText('');
          }, stoDuration * 1000);
        }
      }
    }
  }
}
