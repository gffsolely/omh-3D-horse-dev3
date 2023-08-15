import gsap from 'gsap';
import * as THREE from 'three';

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
  Sprint = 'sprint',
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
  private loadManager = null;
  private textureLoader = null;

  constructor(loadManager) {
    this.loadManager = loadManager;
    this.textureLoader = new THREE.TextureLoader(loadManager);
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
          trackNumber: chorse.trackNumber,
          speedData: [],
        });
        let isSkip = true;
        for (let index2 = 0; index2 < chorse.speedData.length; index2++) {
          if (index2 >= 1) {
            const pPre = chorse.speedData[index2 - 1];
            //跳过起点时原地踏步问题,过滤前1秒数据
            if (pPre.t < 1) continue;

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
                xa: cxaPre + cxaDiff * index3,
                ya: 1,
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
}
