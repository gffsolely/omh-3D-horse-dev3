import gsap from 'gsap';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

import { config } from '@/config';
import { isPc } from '@/utils';

import SoundArenaUtil from './TrackArenaSoundUtil';
import TrackArenaUtil, {
  AnimationType,
  getFontTextByNumber,
  getTextureByNumber,
  getUserConeMeshByNumber,
  getVideoTexture,
  HorseEquipType,
  loadingHide,
  loadingShow,
} from './TrackArenaUtil';

function TrackSantaArenaModel({ raceDataInfo, handleRaceStart, handleRenderScene }, ref) {
  // handleRacePlaySpeed, handleRaceData
  // console.log('TrackSantaArenaModel init:', Date.now());
  const LoadingTimes = useRef(performance.now());
  const [loaded, setLoaded] = useState(0);
  const loadManager = useRef<THREE.LoadingManager>();
  const RenderBody = useRef(null);
  const Scene = useRef<THREE.Scene>(); // 场景
  const Camera = useRef<THREE.PerspectiveCamera>(); // 透视相机
  const Camera2 = useRef<THREE.PerspectiveCamera>();
  const ActiveCamera = useRef<THREE.PerspectiveCamera>();
  const Render = useRef<THREE.WebGLRenderer>(); // 渲染器
  const Controls = useRef<OrbitControls>();
  const Meshs = useRef<THREE.Object3D[]>([]).current; //物品列表
  const ReqAFrameId = useRef(0);
  const CurrentLookAtHModel = useRef<THREE.Object3D>(); //当前视角的目标模型
  const ModelObjBoxGroup = useRef<THREE.Group>();
  const HorseOffsetCamVector3 = useRef({ x: 0, y: 3, z: 12 }); // (0, 2, 10); //(21, 4, -3); //基础相机位置与目标位置的偏移量
  //const HorseOffsetCamVector3 = useRef({ x: 17.9, y: 6.64, z: 30 });
  const HRaceBeginOffsetCamVector3 = useRef({
    camOffset: { x: 28, y: 3.4, z: -0.37 },
    targetOffset: { x: 0, y: 0, z: 10 },
    camOffsetOri: { x: 28, y: 3.4, z: -0.37 }, //ori用于过渡动画使用
    targetOffsetOri: { x: 0, y: 0, z: 10 },
  });
  const HorseUserOffsetCamVector3 = useRef({ x: -4, y: 2.75, z: 0 });

  const HorseRaceArenaModelObj = useRef(null);
  const HorseManRunMixerMap = useRef<Map<string, THREE.AnimationMixer[]>>(new Map()).current; //key为：动画1 动画2 动画3
  const HorseManRunMixerHCodeMap = useRef<Map<string, Map<string, THREE.AnimationMixer>>>(new Map()).current; //key为：马的赛道编号
  const HorseManRunActionHCodeMap = useRef<Map<string, Map<string, THREE.AnimationAction>>>(new Map()).current; //key为：马的赛道编号

  const HorseManRunActionMap = useRef<Map<string, THREE.AnimationAction[]>>(new Map()).current; //key为：动画1 动画2 动画3
  const HorseManBaseAnimationMap = useRef<Map<string, THREE.AnimationClip[]>>(new Map()).current;
  const HAnimationTimeScale = useRef(null); //模型动画播放速度的倍数   //150fps及以上为 0.4

  const lookAtTrackNumber = useRef('-1');
  const HorseManCurrentAnimationType = useRef(AnimationType.Stand);
  const CurrentLookAtAnimationType = useRef({
    hCode: lookAtTrackNumber.current + '',
    animType: AnimationType.Stand,
    prevAnimType: AnimationType.Stand,
  });
  const CurrentAnimationIsRunning = useRef(false);

  const HNumberModelMap = useRef<Map<string, THREE.Object3D>>(new Map()).current;
  const HNumberBoardModelMap = useRef<Map<string, THREE.Object3D>>(new Map()).current;
  const HModelTrackNumbers = useRef([]).current;

  const segCount = useRef(20); //每秒40帧 //把每0.5秒的点继续分割 20 // 0.1秒分割4
  const aiRaceResult = useRef([]);
  const pathIndex = useRef(0);
  const pathLength = useRef(1);
  const pathCount = useRef(0);
  const lastTimestampMS = useRef(0);
  const racePathPlay = useRef(false);
  const pathPlaySpeed = useRef(1); //曲线播放速度 //1 1倍速，2 2倍速,...
  const hNumberBoardGeo = useRef<THREE.CircleGeometry>(null);
  //const hNumberBoardGeo = useRef<THREE.CylinderGeometry>(null);

  const SpotLightModel = useRef<THREE.SpotLight>(null);
  const pathTerminusCamVector3 = useRef({
    isUse: false,
    // targetPos: { x: -165.59, y: 1, z: -120 },
    // camPos: { x: -165.92, y: 6.97, z: -98.85 },
    targetPos: { x: -167.41, y: 4.28, z: -121.14 },
    camPos: { x: -167.396, y: 10.976, z: -101 },
  }).current;

  /*

"id": 7,
			"name": "Santa Anita 7f",
			"totalTracks": 16,
			"trackWidthEach": 1.5,
			"trackLength": 1408.176,
			"perimeter": 1609.34,
			"createAt": "07-06-2023 11:40:51",
			"supportedCurves": "1400",
			"unit": "Imperial",
			"startX": 437.915726,
			"startY": 119,
			"startZ": 0,
			"endX": 165.59,
			"endY": -119,
			"endZ": 0,
			"extension": 224,
			"startAngle": 3.14159,

*/

  const TrackArenaUtilInstance = useRef<TrackArenaUtil>(null);

  const BodyViewSize = useRef<{ w: number; h: number }>({
    w: 2560,
    h: 1550,
  }).current;
  const [bodyViewWH, setBodyViewWH] = useState({ w: 2560, h: 1550 });
  const [selectSpeed, setSelectSpeed] = useState('1');
  const [currentRealFps, setCurrentRealFps] = useState(0);
  const HRaceIsPlayBroadcast = useRef(true); //是否播放AI语音
  const RaceAudioRef = useRef(null);
  const [raceAudioText, setRaceAudioText] = useState('');

  //#region fileHost3d
  const scene360Hdr = config.fileHost3d + '/omh-game/models/hdr/202308/08/HDR_Alien_4K.hdr';
  const sceneEnvHdrJpg = config.fileHost3d + '/omh-game/models/hdr/202308/08/HDR_Alien_tocation_1.jpg';
  //const sceneEnvHdr = config.fileHost3d + '/omh-game/models/hdr/202308/08/HDR_Alien1080.hdr';
  const horseManBaseModel =
    config.fileHost3d + '/omh-game/models/model/202309/06/horse_man/horse_man_base_model_v0.1.glb';
  const horseManAnimSprintModel =
    config.fileHost3d + '/omh-game/models/model/202309/06/horse_man/horse_man_animation_sprint_v0.2.glb';
  const horseManAnimRunModel =
    config.fileHost3d + '/omh-game/models/model/202309/06/horse_man/horse_man_animation_run_v0.1.glb';
  const horseManAnimWhiplashModel =
    config.fileHost3d + '/omh-game/models/model/202309/06/horse_man/horse_man_animation_whiplash_v0.1.glb';
  const horseManAnimStandModel =
    config.fileHost3d + '/omh-game/models/model/202309/06/horse_man/horse_man_animation_stand_v0.2.glb';
  const horseManAnimShakeHeadModel =
    config.fileHost3d + '/omh-game/models/model/202309/06/horse_man/horse_man_animation_shakehead_v0.1.glb';

  //const horseRaceArenaModel = config.fileHost3d + '/omh-game/models/model/202308/05/horse_race_arena_santa_v0.16.glb';
  //https://omh-game-ui-assets.s3.ap-east-1.amazonaws.com/omh-game/models/model/202309/06/horse_race_arena_santa_v0.1/arena_1.glb
  const horseRaceArenaModelPath = config.fileHost3d + '/omh-game/models/model/202309/06/horse_race_arena_santa_v0.5/'; //arena_1.glb
  const horseRaceArenaPlacardModel =
    config.fileHost3d + '/omh-game/models/model/202308/05/horse_race_arena_placard_v0.2.glb';
  const horseArenaPlacardVideo = config.fileHost3d + '/omh-game/models/videos/202308/05/ad01851030711.mp4';

  const horseEquipRein_R =
    config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/DefaultHorse/Reins/Skin/1_Base_color.png';
  const horseEquipSaddle_R =
    config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/DefaultHorse/Saddle/Skin/2_Base_color.png';
  const horseEquipSaddleLED_R =
    config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/DefaultHorse/Saddle/LED/Equipme_2_light_5067D0_SR.png';
  const horseEquipSweatpad_R =
    config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/DefaultHorse/Sweatpad/Skin/3_Base_color.png';
  const horseEquipStirrup_R =
    config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/DefaultHorse/Stirrup/Skin/4_Base_color.png';

  const horseBaseTextrueUrl = config.fileHost3d + '/omh-game/3DAssets/HorseTexture/S1/Dhorse/Skin/51.jpg';
  const horseBaselightTextrueUrl =
    config.fileHost3d + '/omh-game/3DAssets/HorseTexture/S1/Dhorse/LED/horse_body_light_528BF8&489FD9_SSR.png';
  const horseBaseTextrueUrl2 = config.fileHost3d + '/omh-game/3DAssets/HorseTexture/S1/Dhorse/Skin/229.jpg';
  const horseBaselightTextrueUrl2 =
    config.fileHost3d + '/omh-game/3DAssets/HorseTexture/S1/Dhorse/LED/horse_body_light_2E6FFF_SR.png';
  const horseBaseTextrueUrl3 = config.fileHost3d + '/omh-game/3DAssets/HorseTexture/S1/Hybrid/Skin/horse_916C39_N.jpg';
  const horseBaselightTextrueUrl3 =
    config.fileHost3d + '/omh-game/3DAssets/HorseTexture/S1/Hybrid/LED/horse_body_light.png';

  //#region HorseMan
  const hManCothesLED_SR =
    config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/Jockey/Cothes/LED/cloth_light_2ED0FF_SR.png';
  const hManCothes_SR =
    config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/Jockey/Cothes/Skin/cloth_36274E.jpg';
  const hManHelmetLED_SR =
    config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/Jockey/Helmet/LED/helmet_light_C02EFF_SR.png';
  const hManHelmet_SR =
    config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/Jockey/Helmet/Skin/helmet_4E2744.jpg';
  const hManCothesLED_SSR =
    config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/Jockey/Cothes/LED/cloth_light_867CEA%26D356D1_SSR.png';
  const hManCothes_SSR =
    config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/Jockey/Cothes/Skin/colth_17384E.jpg';
  const hManHelmetLED_SSR =
    config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/Jockey/Helmet/LED/helmet_light_C861F8%26619DF8_SSR.png';
  const hManHelmet_SSR =
    config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/Jockey/Helmet/Skin/helmet_36274E.jpg';
  const hManCothesLED_R =
    config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/Jockey/Cothes/LED/cloth_light_2EFFF4_R.png';
  const hManCothes_R = config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/Jockey/Cothes/Skin/cloth_4E2F25.jpg';
  const hManHelmetLED_R =
    config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/Jockey/Helmet/LED/helmet_light_2EFFAE_R.png';
  const hManHelmet_R =
    config.fileHost3d + '/omh-game/3DAssets/EquipmentTexture/S1/Jockey/Helmet/Skin/helmet_4E2F25.jpg';
  //#endregion

  //#endregion

  useImperativeHandle(ref, () => ({
    //
  }));

  //#region loaderGlgModel

  // const loaderGlgModelQiPao = useCallback(() => {
  //   const glbFile = '/models/3d/qipao.glb';
  //   const loader = new GLTFLoader(loadManager.current);

  //   loader.load(glbFile, (obj) => {
  //     console.log('glbFile qipao obj :', obj);
  //     const model = obj.scene;
  //     model.position.set(-142, 19.2, 39.1);
  //     model.rotation.y = -Math.PI;
  //     model.castShadow = true;
  //     Scene.current.add(model);
  //   });
  // }, []);

  const loaderGlgModel = useCallback((hNumber = '1', r = 0, hPosVec3: THREE.Vector3) => {
    const loader = new GLTFLoader(loadManager.current);
    let cBTextrue = horseBaseTextrueUrl;
    let cBLigTextrue = horseBaselightTextrueUrl;
    let cManTextrue = hManCothes_R;
    let cManLEDTextrue = hManCothesLED_R;
    let cManHelmetTextrue = hManHelmet_R;
    let cManHelmetLEDTextrue = hManHelmetLED_R;
    const tmpRdm = Math.random();
    if (tmpRdm > 0.8) {
      cBTextrue = horseBaseTextrueUrl2;
      cBLigTextrue = horseBaselightTextrueUrl2;
      cManTextrue = hManCothes_SSR;
      cManLEDTextrue = hManCothesLED_SSR;
      cManHelmetTextrue = hManHelmet_SSR;
      cManHelmetLEDTextrue = hManHelmetLED_SSR;
    } else if (tmpRdm > 0.4) {
      cBTextrue = horseBaseTextrueUrl3;
      cBLigTextrue = horseBaselightTextrueUrl3;
      cManTextrue = hManCothes_SR;
      cManLEDTextrue = hManCothesLED_SR;
      cManHelmetTextrue = hManHelmet_SR;
      cManHelmetLEDTextrue = hManHelmetLED_SR;
    }
    const baseColorTextrue = TrackArenaUtilInstance.current.getDigitalHTexture(cBTextrue);
    const lightTextrue = TrackArenaUtilInstance.current.getDigitalHTexture(cBLigTextrue);

    const hManTextrue = TrackArenaUtilInstance.current.getDigitalHTexture(cManTextrue);
    const hManLEDTextrue = TrackArenaUtilInstance.current.getDigitalHTexture(cManLEDTextrue);
    const hManHelmetTextrue = TrackArenaUtilInstance.current.getDigitalHTexture(cManHelmetTextrue);
    const hManHelmetLEDTextrue = TrackArenaUtilInstance.current.getDigitalHTexture(cManHelmetLEDTextrue);

    loader.load(horseManBaseModel, (obj) => {
      //console.log('horseManBaseModel obj hNumber:', obj, hNumber, hPosVec3);
      const model = obj.scene;
      model.position.copy(hPosVec3);
      model.rotation.y = -Math.PI / 2 + r;
      model.name = 'horseManBaseModel' + hNumber;
      model.castShadow = true;

      model.traverse(function (child: THREE.Mesh) {
        if (child.isObject3D) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
        if (child.isMesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (child.name.toLowerCase() === 'horse' && baseColorTextrue) {
            mat.map = baseColorTextrue;
            mat.emissive = new THREE.Color(lightTextrue ? 0xffffff : 0x000000);
            mat.emissiveMap = lightTextrue;
          }
          if (mat.name.toLowerCase() === 'mat_cloth') {
            mat.map = hManTextrue;
            mat.emissive = new THREE.Color(hManLEDTextrue ? 0xffffff : 0x000000);
            mat.emissiveMap = hManLEDTextrue;
          }
          if (mat.name.toLowerCase() === 'mat_helmet') {
            mat.map = hManHelmetTextrue;
            mat.emissive = new THREE.Color(hManHelmetLEDTextrue ? 0xffffff : 0x000000);
            mat.emissiveMap = hManHelmetLEDTextrue;
          }
          mat.needsUpdate = true;
        }
      });
      HNumberModelMap.set(hNumber, model);

      //#region 马头顶的赛道号码牌
      const hTexture = getTextureByNumber(hNumber);
      const hMesh = new THREE.Mesh(
        hNumberBoardGeo.current,
        new THREE.MeshBasicMaterial({ map: hTexture, side: THREE.DoubleSide })
      );
      //const hMesh = getFontTextByNumber(loadManager, hNumber);
      hMesh.position.set(0, 3, 0);
      hMesh.rotation.y = -Math.PI / 2; //-model.rotation.y;
      hMesh.name = 'horseNumberBoard' + hNumber;
      model.add(hMesh);
      HNumberBoardModelMap.set(hNumber, hMesh);
      if (hNumber === '6') {
        //玩家自己的马加标记
        const hConeGroup = getUserConeMeshByNumber(hNumber);
        hConeGroup.position.set(0, 3.4, 0);
        model.add(hConeGroup);
        gsap.to(hConeGroup.position, { y: 3.6, duration: 1.3, yoyo: true, repeat: -1 }); //ease: 'power4.out',
        gsap.to(hConeGroup.rotation, { y: Math.PI * 2, ease: 'none', duration: 2, repeat: -1 });
      }
      //#endregion
      //console.log('HNumberBoardModelMap:', HNumberBoardModelMap);

      TrackArenaUtilInstance.current.setHorseEquipTexture(
        { type: HorseEquipType.Saddle, baseTextrueUrl: horseEquipSaddle_R, lightTextrueUrl: horseEquipSaddleLED_R },
        model
      );
      TrackArenaUtilInstance.current.setHorseEquipTexture(
        { type: HorseEquipType.Rein, baseTextrueUrl: horseEquipRein_R, lightTextrueUrl: null },
        model
      );
      TrackArenaUtilInstance.current.setHorseEquipTexture(
        { type: HorseEquipType.SaddlePad, baseTextrueUrl: horseEquipSweatpad_R, lightTextrueUrl: null },
        model
      );
      TrackArenaUtilInstance.current.setHorseEquipTexture(
        { type: HorseEquipType.Stirrup, baseTextrueUrl: horseEquipStirrup_R, lightTextrueUrl: null },
        model
      );
      Scene.current.add(model);
      //全部马模型加载完成
      if (HModelTrackNumbers.length === HNumberModelMap.size) {
        //handleHorseMansRunAction();
        //handlePathCamera(model);
        //起点相机位置 赛场模型 field_008
        //Camera.current.position.set(-420, 7.64, 151.1);
        //Camera.current.position.set(-410, 7.43, 132.2);
        // const hcv = HorseOffsetCamVector3.current;
        // const hrbcvC = HRaceBeginOffsetCamVector3.current.camOffset;
        // Camera.current.position
        //   .copy(cmodel.position)
        //   .add(new THREE.Vector3(hcv.x + hrbcvC.x, hcv.y + hrbcvC.y, hcv.z + hrbcvC.z));
        // const cVector3 = cmodel.position;
        // //const cVector3 = new THREE.Vector3(-437.9, 1, 130);
        // //console.log('the one cVector3', cVector3);

        // const hrbcvT = HRaceBeginOffsetCamVector3.current.targetOffset;
        // cVector3.add(new THREE.Vector3(hrbcvT.x, hrbcvT.y, hrbcvT.z));
        // Camera.current.lookAt(cVector3);
        // Controls.current.target.copy(cVector3);
        // Controls.current.update();
        const cmodel = HNumberModelMap.get('1');
        handlePathCamera(cmodel);
      }
    });
  }, []);

  const loaderGlgModelAnimations = useCallback(() => {
    const loader = new GLTFLoader(loadManager.current);
    // hAnimationType = 'stand'
    // let cHorseManModel = horseManStandModel;
    // if (hAnimationType === 'run') cHorseManModel = horseManRunModel;
    // else if (hAnimationType === 'sprint') cHorseManModel = horseManSprintModel;
    loader.load(horseManAnimStandModel, (obj) => {
      console.log('horseManAnimStandModel obj :', obj);
      HorseManBaseAnimationMap.set(AnimationType.Stand, obj.animations);
    });
    loader.load(horseManAnimRunModel, (obj) => {
      console.log('horseManAnimRunModel obj :', obj);
      HorseManBaseAnimationMap.set(AnimationType.Run, obj.animations);
    });
    loader.load(horseManAnimSprintModel, (obj) => {
      console.log('horseManAnimSprintModel obj :', obj);
      HorseManBaseAnimationMap.set(AnimationType.Sprint, obj.animations);
    });
    loader.load(horseManAnimWhiplashModel, (obj) => {
      console.log('horseManAnimWhiplashModel obj :', obj);
      HorseManBaseAnimationMap.set(AnimationType.Whiplash, obj.animations);
    });
    // loader.load(horseManAnimShakeHeadModel, (obj) => {
    //   console.log('horseManAnimShakeHeadModel obj :', obj);
    //   HorseManBaseAnimationMap.set(AnimationType.ShakeHead, obj.animations);
    // });

    // let obj = await loader.loadAsync(horseManAnimStandModel);
    // HorseManBaseAnimationMap.set(AnimationType.Stand, obj.animations);
    // obj = await loader.loadAsync(horseManAnimRunModel);
    // HorseManBaseAnimationMap.set(AnimationType.Run, obj.animations);
    // obj = await loader.loadAsync(horseManAnimSprintModel);
    // HorseManBaseAnimationMap.set(AnimationType.Sprint, obj.animations);
    //HorseManAnimationFps.current = await getFps(loadManager.current);
  }, []);

  const loaderGlgRaceArena = useCallback(() => {
    const loader = new GLTFLoader(loadManager.current);
    //horseRaceArenaModel
    const hRArenaModelGroup = new THREE.Group();
    for (let index = 1; index <= 5; index++) {
      const modelFile = horseRaceArenaModelPath + 'arena_' + index + '.glb';
      loader.load(modelFile, (obj) => {
        //console.log('horseRaceArenaModel ' + index + ' obj:', obj);
        const model = obj.scene;
        model.position.set(62, 17.4, 39);
        model.rotation.y = -Math.PI;
        model.name = 'horseRaceArenaModel' + index;
        model.castShadow = true;
        model.receiveShadow = true;
        hRArenaModelGroup.add(model);
        model.traverse(function (child: THREE.Mesh) {
          if (child.isObject3D) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.name === 'qipao_G') {
              //console.log('child.position', child.position);
              child.position.set(204.4, 0, -0.1); //起点位置 赛场模型 field_008
              //child.visible = false;
            }
            if (child.name === 'Finish_G' || child.name === 'Finish') {
              child.position.x = -47.5;
            }
            if (child.name === 'kantai_G' || child.name === 'ren_G') {
              child.position.x = -46;
            }
            if (child.name === 'jianzhu_3') {
              //console.log('gaolouA_G child:', child);
              child.position.x = 2600;
              child.position.y = -500;
            }
            if (child.name === 'guanggao_10') {
              child.visible = false;
            }
            if (child.name === 'pingfang_7') {
              child.visible = false;
            }
            if (child.name === 'men') {
              child.position.z = 1733;
            }
          }
          if (child.isMesh) {
            //
          }
        });
      });
    }

    HorseRaceArenaModelObj.current = hRArenaModelGroup;
    Scene.current.add(hRArenaModelGroup);

    const wallVTexture = getVideoTexture(horseArenaPlacardVideo, loadManager, false);
    loader.load(horseRaceArenaPlacardModel, (obj) => {
      //console.log('horseRaceArenaPlacardModel  obj:', obj);
      const model = obj.scene;
      model.position.set(-470, -3, 93);
      model.rotation.y = -Math.PI + 0.2;
      model.name = 'horseRaceArenaPlacard01';
      model.receiveShadow = true;
      Scene.current.add(model);

      const wallMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(8.6, 8.6 * (9 / 16)),
        new THREE.MeshBasicMaterial({
          map: wallVTexture,
          // transparent: true,
          // opacity: 0.6,
        })
      );
      wallMesh.position.set(-1.6, 11, -2.7);
      wallMesh.rotation.y = 3.7;
      model.add(wallMesh);
    });
  }, []);

  /** 初始化灯光 */
  const createLight = useCallback(() => {
    // const ambientLight = new THREE.AmbientLight('#ffffff', 3);
    // Scene.current.add(ambientLight);
    const derlight = new THREE.DirectionalLight(0xffffff, 3);
    derlight.position.set(0, 200, 0);
    derlight.target.position.set(0, 0, 0);
    derlight.castShadow = true;
    Scene.current.add(derlight);
    const derlight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    derlight2.position.set(-460, 10, 0);
    derlight2.target.position.set(0, 1, 0);
    derlight2.castShadow = true;
    Scene.current.add(derlight2);

    const derlight3 = new THREE.DirectionalLight(0xffffff, 0.8);
    derlight3.position.set(460, 10, 0);
    derlight3.target.position.set(0, 1, 0);
    derlight3.castShadow = true;
    Scene.current.add(derlight3);
    // const dhelp = new THREE.DirectionalLightHelper(derlight);
    // Scene.current.add(dhelp);

    // const spotLight = new THREE.SpotLight(0xffffff, 5, 30);
    // spotLight.position.set(0, 20, 0);
    // spotLight.angle = Math.PI / 6;
    // spotLight.penumbra = 0.2;
    // spotLight.decay = 0.3;
    // spotLight.castShadow = true;
    // spotLight.target.position.set(0, 0, 0);
    // Scene.current.add(spotLight);
    // SpotLightModel.current = spotLight;
    // const helper = new THREE.SpotLightHelper(spotLight);
    // Scene.current.add(helper);
    // Scene.current.remove(helper);

    // const spotLight = new THREE.SpotLight(0xffffff, 10, 200);
    // spotLight.position.set(0, 120, 200);
    // spotLight.angle = Math.PI / 6;
    // spotLight.penumbra = 0.2;
    // spotLight.decay = 0.3;
    // spotLight.castShadow = true;
    // spotLight.target.position.set(-100, 1, 70);
    // Scene.current.add(spotLight);
    // SpotLightModel.current = spotLight;
    // const helper = new THREE.SpotLightHelper(spotLight);
    // Scene.current.add(helper);
    //Scene.current.remove(helper);
  }, []);

  const createSkydomeHdr = () => {
    const panoramaTexture = new RGBELoader(loadManager.current).load(scene360Hdr);
    //panoramaTexture.mapping = THREE.EquirectangularReflectionMapping;
    const skydomeMaterial = new THREE.MeshBasicMaterial({
      map: panoramaTexture,
      side: THREE.BackSide,
    });
    // const skydomeMaterial = new THREE.MeshStandardMaterial({
    //   side: THREE.BackSide,
    //   envMap: panoramaTexture,
    //   // envMapIntensity: 1,
    // });

    const skydomeGeometry = new THREE.SphereGeometry(600, 60, 40);
    const skydome = new THREE.Mesh(skydomeGeometry, skydomeMaterial);
    skydome.rotation.order = 'YXZ';
    skydome.rotation.y = -Math.PI * 1.3;
    skydome.rotation.x = -0.23;
    Scene.current.add(skydome);
    gsap.to(skydome.rotation, {
      y: Math.PI * 1.3,
      duration: 700,
      ease: 'none',
      repeat: -1,
    });

    // skydome.rotation.y = Math.PI / 1.4;
    // skydome.rotation.x = -0.3;
    // gsap.to(skydome.rotation, {
    //   y: Math.PI / 1.4,
    //   duration: 600,
    //   ease: 'none',
    //   repeat: -1,
    // });

    // const skybox = new GroundProjectedSkybox(panoramaTexture);
    // skybox.scale.setScalar(1000);
    // Scene.current.add(skybox);
    //Scene.current.environment = panoramaTexture;

    const sEnvTexture = new THREE.TextureLoader(loadManager.current).load(sceneEnvHdrJpg);
    //const sEnvTexture = new RGBELoader(loadManager.current).load(sceneEnvHdr);
    sEnvTexture.mapping = THREE.EquirectangularReflectionMapping;
    sEnvTexture.flipY = false;
    Scene.current.environment = sEnvTexture;
    Render.current.outputEncoding = THREE.sRGBEncoding;
  };

  //#endregion

  //#region  handle functions

  const handleSwitchTerminusCam = () => {
    pathTerminusCamVector3.isUse = true;
    if (Camera.current && Controls.current) {
      const camPos = pathTerminusCamVector3.camPos;
      const targetPos = pathTerminusCamVector3.targetPos;
      Camera.current.position.set(camPos.x, camPos.y, camPos.z);
      const targetVector3 = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
      Camera.current.lookAt(targetVector3);
      Controls.current.target.copy(targetVector3);
      Controls.current.update();
      // gsap.to(Camera.current.position, {
      //   x: camPos.x,
      //   y: camPos.y,
      //   z: camPos.z,
      //   duration: 1,
      // });
      // gsap.to(Controls.current.target, {
      //   x: targetPos.x,
      //   y: targetPos.y,
      //   z: targetPos.z,
      //   duration: 1,
      //   onUpdate: () => {
      //     Camera.current.lookAt(Controls.current.target);
      //     Controls.current.update();
      //   },
      // });
    }
    SoundArenaUtil.crowdCheersFinished.sound.play();
  };

  const handleCamTerminus = (rankPath) => {
    if (rankPath && rankPath.speedData.ranking === 1) {
      handleSwitchTerminusCam();
      //handleRank1TerminusTScale(rankPath.trackNumber);
    }
  };

  const isRank1TerminusTScaleRef = useRef(false);
  let prevTScale = 1;
  const handleHCodeTerminusTScale = (hCode) => {
    if (!isRank1TerminusTScaleRef.current) {
      isRank1TerminusTScaleRef.current = true;
      // HorseManRunActionHCodeMap.get(hCode).forEach((cAction) => {
      //   prevTScale = cAction.getEffectiveTimeScale();
      //   cAction.setEffectiveTimeScale(prevTScale * 0.5);
      // });
      HorseManRunActionMap.get(HorseManCurrentAnimationType.current).forEach((cAction) => {
        prevTScale = cAction.timeScale;
        cAction.timeScale = prevTScale * 0.5;
      });
      setTimeout(() => {
        // HorseManRunActionHCodeMap.get(hCode).forEach((cAction) => {
        //   cAction.setEffectiveTimeScale(prevTScale);
        // });
        HorseManRunActionMap.get(HorseManCurrentAnimationType.current).forEach((cAction) => {
          cAction.timeScale = prevTScale;
        });
      }, 5 * 1000);
    }
  };

  const pathhHCode1TerminusCamVector3 = useRef({
    isUse: false,
    camPos: new THREE.Vector3(20, 6, 20),
    camPosDiff: { x: 40, y: 3, z: 17 },
  }).current;

  const handleSwitchHCodeTerminusCam = (hCode: string) => {
    if (pathTerminusCamVector3.isUse) return;
    if (!pathhHCode1TerminusCamVector3.isUse) {
      pathhHCode1TerminusCamVector3.isUse = true;
      handleHCodeTerminusTScale(hCode);
    }
    const hNumModel = HNumberModelMap.get(hCode);
    if (Camera.current && Controls.current && hNumModel) {
      const camPosV3 = pathhHCode1TerminusCamVector3.camPos;
      if (camPosV3.x >= -20) {
        const camPosV3Diff = pathhHCode1TerminusCamVector3.camPosDiff;
        camPosV3.x -= parseFloat((camPosV3Diff.x / 5 / 40).toFixed(5));
        camPosV3.y -= parseFloat((camPosV3Diff.y / 5 / 40).toFixed(5));
        camPosV3.z -= parseFloat((camPosV3Diff.z / 5 / 40).toFixed(5));
        Camera.current.position.copy(hNumModel.position).add(camPosV3);
        updateCamLookAtByHNumModel(hNumModel);
      } else {
        handleSwitchTerminusCam();
      }
    }
  };

  const handleSelectHorseChange = (e) => {
    //console.log('handleSelectChange e:', e);
    lookAtTrackNumber.current = e.target.value;
    pathTerminusCamVector3.isUse = false;

    CurrentLookAtAnimationType.current.hCode = e.target.value;
    CurrentLookAtAnimationType.current.animType = HorseManCurrentAnimationType.current;

    //SoundArenaUtil.skillsOvertake.sound.play();
  };

  const handleSelectChange = (e) => {
    //console.log('handleSelectChange e:', e);
    setSelectSpeed(e.target.value);

    pathPlaySpeed.current = parseInt(e.target.value);
    //处理加减速之后点的位置
    const prePathLength = aiRaceResult.current[0].speedData.length;
    const resHorsePaths = TrackArenaUtilInstance.current.getRacePathByRaceData(raceDataInfo, segCount, pathPlaySpeed);
    aiRaceResult.current = resHorsePaths;
    const currPathLength = resHorsePaths[0].speedData.length;
    pathIndex.current = Math.floor((pathIndex.current / prePathLength) * currPathLength);
  };
  const handleHAnimScaleSelectChange = (e) => {
    //console.log('handleSelectChange e:', e);
    HAnimationTimeScale.current = parseFloat(e.target.value);
    console.log('handleHAnimScaleSelectChange actTimeScale:', HAnimationTimeScale.current);
    HorseManRunActionMap.forEach((val) => {
      val.forEach((actionHorseRun) => {
        //actionHorseRun.timeScale = HAnimationTimeScale.current; // 0.4;
        actionHorseRun.setEffectiveTimeScale(HAnimationTimeScale.current);
      });
    });
  };

  const loaderCreateRacePath = useCallback(() => {
    const resHorsePaths = TrackArenaUtilInstance.current.getRacePathByRaceData(raceDataInfo, segCount, pathPlaySpeed);

    aiRaceResult.current = resHorsePaths;
    pathLength.current = resHorsePaths[0].speedData.length;
    //const rds = BoxViewSize.w < 600 ? 2 : 5;
    for (let index = 0; index < aiRaceResult.current.length; index++) {
      //当前赛道最多支持12匹马
      if (index < 12) {
        const chorse = aiRaceResult.current[index];
        const path = chorse.speedData[0];
        loaderGlgModel(chorse.trackNumber + '', path.r, new THREE.Vector3(path.xa, path.ya, path.za));
        HModelTrackNumbers.push(chorse.trackNumber + '');
      }
    }
  }, []);

  const handlePathCamera = (hNumModel) => {
    if (pathTerminusCamVector3.isUse || pathhHCode1TerminusCamVector3.isUse) return;
    if (Camera.current && hNumModel && Controls.current) {
      CurrentLookAtHModel.current = hNumModel;
      const hCamVector3 = HorseOffsetCamVector3.current;
      const beginCamVector3 = HRaceBeginOffsetCamVector3.current.camOffset;
      const hCamVector3X = hNumModel.position.z > 0 ? hCamVector3.x : -hCamVector3.x;
      const hcvxAdd = new THREE.Vector3(
        hCamVector3X + beginCamVector3.x,
        hCamVector3.y + beginCamVector3.y,
        hCamVector3.z + beginCamVector3.z
      );
      Camera.current.position.copy(hNumModel.position).add(hcvxAdd);
      updateCamLookAtByHNumModel(hNumModel);
    }
  };
  const updateCamLookAtByHNumModel = (hNumModel) => {
    const camVector3Target = HRaceBeginOffsetCamVector3.current.targetOffset;
    const cVector3 = hNumModel.position.clone();
    cVector3.add(new THREE.Vector3(camVector3Target.x, camVector3Target.y + 1.6, camVector3Target.z));
    Camera.current.lookAt(cVector3);
    Controls.current.target.copy(cVector3);
    Controls.current.update();
  };

  const handleSwitchCamera = () => {
    if (ActiveCamera.current === Camera.current) {
      loadingHide(() => {
        animateCameraTransition(Camera.current, Camera2.current);
      });
    } else {
      animateCameraTransition(Camera2.current, Camera.current);
    }
  };
  /**
   *
   * @param animationType 动画列表索引  // run 正常跑; sprint 疾跑 ; stand 待机
   *
   */
  const handleHorseMansRunAction = () => {
    HorseManBaseAnimationMap.forEach((cAnimations, ckey) => {
      if (cAnimations && cAnimations.length >= 1) {
        const horseManRunMixers = [],
          horseManRunActions = [];
        HNumberModelMap.forEach((model) => {
          const cModel = model;
          const mixerLeftHorse = new THREE.AnimationMixer(cModel);
          const actionHorseRun = mixerLeftHorse.clipAction(cAnimations[0]);
          // if (ckey === AnimationType.Whiplash) {
          //   actionHorseRun.loop = THREE.LoopOnce;
          // } else actionHorseRun.loop = THREE.LoopRepeat;
          actionHorseRun.loop = THREE.LoopRepeat;
          actionHorseRun.clampWhenFinished = true;
          //actionHorseRun.timeScale = 0.4;
          actionHorseRun.setEffectiveTimeScale(0.4);
          //if (ckey !== AnimationType.Whiplash) actionHorseRun.time = Math.random() * 2;
          if (ckey === AnimationType.Stand) {
            const rdm = Math.random() * 10;
            //console.log('rdm', rdm);
            actionHorseRun.time = rdm;
          }
          actionHorseRun.play();
          // mixerLeftHorse.addEventListener('loop', (e) => {
          //   console.log('mixerLeftHorse loop ' + ckey + ' ' + cModel.name, e);
          // });
          // mixerLeftHorse.addEventListener('finished', (e) => {
          //   console.log('mixerLeftHorse finished ' + ckey + ' ' + cModel.name, e);
          // });
          horseManRunActions.push(actionHorseRun);
          horseManRunMixers.push(mixerLeftHorse);
        });
        HorseManRunMixerMap.set(ckey, horseManRunMixers);
        HorseManRunActionMap.set(ckey, horseManRunActions);
      }
    });

    const HNumberKeySz = Array.from(HNumberModelMap.keys());
    HorseManRunMixerMap.forEach((cMixers, ckey) => {
      cMixers.forEach((mixer, idx) => {
        const hCode = HNumberKeySz[idx];
        //console.log('hCode', { keys: HNumberKeySz, hCode });
        if (HorseManRunMixerHCodeMap.has(hCode)) {
          HorseManRunMixerHCodeMap.get(hCode).set(ckey, mixer);
        } else {
          const cMap: Map<string, THREE.AnimationMixer> = new Map();
          cMap.set(ckey, mixer);
          HorseManRunMixerHCodeMap.set(hCode, cMap);
        }
      });
    });
    HorseManRunActionMap.forEach((cActions, ckey) => {
      cActions.forEach((action, idx) => {
        const hCode = HNumberKeySz[idx];
        if (HorseManRunActionHCodeMap.has(hCode)) {
          HorseManRunActionHCodeMap.get(hCode).set(ckey, action);
        } else {
          const cMap: Map<string, THREE.AnimationAction> = new Map();
          cMap.set(ckey, action);
          HorseManRunActionHCodeMap.set(hCode, cMap);
        }
      });
    });
    //console.log('HorseManRunMixerHCodeMap:', HorseManRunMixerHCodeMap);
  };

  const handleSwitchAnimation = (newAnimType: AnimationType, onFinished: any) => {
    console.log('handleSwitchAnimation newAnimType:', newAnimType, CurrentLookAtAnimationType.current);
    //const currentMixer = HorseManRunMixerMap.get(HorseManCurrentAnimationType.current)[horseIdx];
    //const currentMixers = HorseManRunMixerMap.get(HorseManCurrentAnimationType.current);

    if (!CurrentAnimationIsRunning.current) {
      CurrentAnimationIsRunning.current = true;
      CurrentLookAtAnimationType.current.hCode = lookAtTrackNumber.current;
      const currentMixer = HorseManRunMixerHCodeMap.get(CurrentLookAtAnimationType.current.hCode)?.get(
        CurrentLookAtAnimationType.current.animType
      );
      CurrentLookAtAnimationType.current.prevAnimType = CurrentLookAtAnimationType.current.animType;
      const switchAction = () => {
        CurrentLookAtAnimationType.current.animType = newAnimType;
        CurrentAnimationIsRunning.current = false;
        currentMixer.removeEventListener('loop', switchAction);
        onFinished && onFinished();
      };
      currentMixer?.addEventListener('loop', switchAction);
    }
  };

  // const handleSwitchAnimation = (newAnimType: AnimationType, onFinished: any) => {
  //   //console.log('handleSwitchAnimation newAnimType:', newAnimType);
  //   //const currentMixer = HorseManRunMixerMap.get(HorseManCurrentAnimationType.current)[horseIdx];
  //   //const currentMixers = HorseManRunMixerMap.get(HorseManCurrentAnimationType.current);

  //   if (!CurrentAnimationIsRunning.current) {
  //     CurrentAnimationIsRunning.current = true;
  //     //CurrentLookAtAnimationType.current.hCode = lookAtTrackNumber.current;
  //     const currentMixer = HorseManRunMixerHCodeMap.get(CurrentLookAtAnimationType.current.hCode)?.get(
  //       CurrentLookAtAnimationType.current.animType
  //     );
  //     const currentAction = HorseManRunActionHCodeMap.get(CurrentLookAtAnimationType.current.hCode)?.get(
  //       CurrentLookAtAnimationType.current.animType
  //     );
  //     const switchAction = () => {
  //       //currentAction.clampWhenFinished = true;
  //       // const newAction = HorseManRunActionHCodeMap.get(CurrentLookAtAnimationType.current.hCode)?.get(newAnimType);
  //       // newAction.time = 0.2;
  //       // newAction.loop = THREE.LoopOnce;
  //       // newAction.clampWhenFinished = false;
  //       // newAction.play();
  //       // // // newAction.time = 1;
  //       // // //currentAction.crossFadeTo(newAction, 0.2, false);
  //       // const newMixer = HorseManRunMixerHCodeMap.get(CurrentLookAtAnimationType.current.hCode)?.get(newAnimType);
  //       // newMixer.setTime(1);
  //       // newMixer.update(0.03);
  //       // // newAction.play();
  //       // currentAction.loop = THREE.LoopRepeat;
  //       // currentAction.clampWhenFinished = false;
  //       // currentAction.play();
  //       CurrentLookAtAnimationType.current.animType = newAnimType;
  //       CurrentAnimationIsRunning.current = false;
  //       currentMixer.removeEventListener('finished', switchAction);
  //       currentMixer.removeEventListener('loop', switchAction);
  //       onFinished && onFinished();
  //     };
  //     //currentAction.loop = THREE.LoopOnce;
  //     // currentAction.clampWhenFinished = true;
  //     // currentAction.play();
  //     //currentAction.paused = true;
  //     currentMixer?.addEventListener('finished', switchAction);
  //     currentMixer?.addEventListener('loop', switchAction);
  //   }
  // };

  const lastActTimeScaleRef = useRef(0.5);
  const currentRealFpsSz = useRef([]).current;
  useEffect(() => {
    let actTimeScale = 1;
    if (HAnimationTimeScale.current) {
      actTimeScale = HAnimationTimeScale.current;
    } else {
      if (currentRealFps <= 15) return;

      if (currentRealFpsSz.length >= 11) return;
      let avgFps = currentRealFps;
      //取前10秒中后5秒的平均帧率
      if (currentRealFpsSz.length === 10) {
        const szCount = currentRealFpsSz.length;
        let fpsCount = 0;
        for (let index = szCount - 5; index < szCount; index++) {
          fpsCount += currentRealFpsSz[index];
        }
        avgFps = fpsCount / 5;
      }
      currentRealFpsSz.push(currentRealFps);
      if (avgFps <= 50) {
        actTimeScale = 1.3;
      } else if (avgFps <= 100) {
        actTimeScale = 1.1;
      } else if (avgFps <= 150) {
        actTimeScale = 0.7;
      } else {
        actTimeScale = 0.5;
      }
      //console.log('avgFps:', avgFps);
    }
    if (actTimeScale != lastActTimeScaleRef.current) {
      lastActTimeScaleRef.current = actTimeScale;
      //console.log('useEffect currentRealFps actTimeScale:', { actTimeScale });
      HorseManRunActionMap.forEach((val) => {
        val.forEach((actionHorseRun) => {
          actionHorseRun.timeScale = actTimeScale; // 0.4;
        });
      });
    }
  }, [currentRealFps, HorseManRunActionMap]);

  // 动画切换相机
  const animateCameraTransition = (startCamera, endCamera) => {
    const startPos = startCamera.position.clone();
    const endPos = endCamera.position.clone();
    // const endPos =
    //   endCamera === Camera.current ? CurrentLookAtHModel.current.position.clone() : new THREE.Vector3(0, 50, -100); //endCamera.position.clone();
    //console.log('startPosstartPos11 :', startPos, endPos);
    const duration = 1;
    const ease = 'power4.inOut';
    gsap.to(startCamera.position, {
      duration,
      ease,
      x: endPos.x,
      y: endPos.y,
      z: endPos.z,
      onComplete: () => {
        //
      },
    });
    setTimeout(() => {
      loadingShow();
      ActiveCamera.current = endCamera;
      startCamera.position.copy(startPos);
      Controls.current = new OrbitControls(ActiveCamera.current, Render.current.domElement);
      // Controls.current.addEventListener('change', () => {
      //   console.log('Camera position:', ActiveCamera.current.position);
      //   //renderScene();
      // });
      CurrentLookAtHModel.current && Controls.current.target.copy(CurrentLookAtHModel.current.position);
      Controls.current.maxPolarAngle = Math.PI / 2;
      Controls.current.minPolarAngle = Math.PI / 4;
      Controls.current.maxDistance = 200;
      Controls.current.minDistance = 6;
      Controls.current.enabled = false;
      if (endCamera === Camera2.current) {
        Controls.current.enabled = true;
      }
      Controls.current.update();
    }, duration * 1000);
  };

  //#endregion

  //#region init renderScene
  // const fps = useRef(0);
  // const lastCalledTime = useRef(performance.now());
  const fps2 = useRef(0);
  const lastCalledTime2 = useRef(performance.now());

  const clock = new THREE.Clock();
  let isPlayPause = false;
  // let prevSwitchAnimaTime = 0;
  // let cAnimaType = HorseManCurrentAnimationType.current;
  const cAHCodeInfo = {
    hCode: '1',
    animaType: HorseManCurrentAnimationType.current,
    prevTime: 0,
  };
  const cAnimaHCodeInfoSz = [
    {
      ...cAHCodeInfo,
      hCode: '1',
    },
    {
      ...cAHCodeInfo,
      hCode: '2',
    },
    {
      ...cAHCodeInfo,
      hCode: '3',
    },
    {
      ...cAHCodeInfo,
      hCode: '4',
    },
    {
      ...cAHCodeInfo,
      hCode: '5',
    },
    {
      ...cAHCodeInfo,
      hCode: '6',
    },
    {
      ...cAHCodeInfo,
      hCode: '7',
    },
  ];
  const cAnimaSz = [AnimationType.ShakeHead, AnimationType.Stand];
  // 渲染画面
  const renderScene = useCallback(() => {
    // console.log('renderScene renderScene ', Date.now());
    // const delta = (performance.now() - lastCalledTime.current) / 1000;
    // fps.current = Math.round(1 / delta);
    // setCurrentRealFps(fps.current);
    // lastCalledTime.current = performance.now();
    //console.log(fps.current + ' fps');
    fps2.current++;
    if (performance.now() - lastCalledTime2.current >= 1000) {
      lastCalledTime2.current = performance.now();
      //console.log('Current fps(1s):' + fps2.current);
      setCurrentRealFps(fps2.current);
      fps2.current = 0;

      // if (pathCount.current === 0) {
      //   const resHorsePaths: any[] = [];
      //   for (let index = 0; index < aiRaceResult.current.length; index++) {
      //     const chorse = aiRaceResult.current[index];
      //     const pathPre = chorse.speedData[pathIndex.current];
      //     resHorsePaths.push({
      //       gameHorseId: chorse.gameHorseId,
      //       ranking: chorse.ranking,
      //       trackNumber: chorse.trackNumber,
      //       interval: 0.5,
      //       speedData: {
      //         xa: -pathPre.xa,
      //         ya: pathPre.za,
      //         za: 0,
      //         t: pathPre.t,
      //         ranking: pathPre.ranking,
      //       },
      //     });
      //   }
      //   handleRaceData && handleRaceData(resHorsePaths);
      // }
    }

    // HorseManRunMixerMap.get(HorseManCurrentAnimationType.current)?.forEach((item) => {
    //   item.update(0.02);
    // });
    // const cDelta = clock.getDelta();
    // let cccIdx = 0;
    HorseManRunMixerHCodeMap?.forEach((mixerMap, hCode) => {
      // const cAnimaHCodeInfo = cAnimaHCodeInfoSz[cccIdx];
      // if (cAnimaSz.includes(HorseManCurrentAnimationType.current)) {
      //   if (cAnimaHCodeInfo.prevTime === 0) cAnimaHCodeInfo.prevTime = Date.now();
      //   if (Date.now() - cAnimaHCodeInfo.prevTime > 4000) {
      //     const rdm = Math.random();
      //     cAnimaHCodeInfo.animaType = cAnimaSz[rdm > 0.5 ? 1 : 0];
      //     cAnimaHCodeInfo.prevTime = Date.now() + 3000 * rdm;
      //     //console.log('cAnimaHCodeInfo:', { cAnimaHCodeInfo });
      //   }
      // } else {
      //   cAnimaHCodeInfo.animaType = HorseManCurrentAnimationType.current;
      // }
      // cccIdx++;
      // if (CurrentLookAtAnimationType.current.hCode === hCode) {
      //   mixerMap.get(CurrentLookAtAnimationType.current.animType)?.update(0.02);
      // } else {
      //   //mixerMap.get(HorseManCurrentAnimationType.current)?.update(0.02);
      //   cAnimaHCodeInfoSz.forEach((ahcItem) => {
      //     if (ahcItem.hCode === hCode) {
      //       mixerMap.get(ahcItem.animaType)?.update(0.02);
      //     }
      //   });
      // }
      if (CurrentLookAtAnimationType.current.hCode === hCode) {
        mixerMap.get(CurrentLookAtAnimationType.current.animType)?.update(0.02);
      } else mixerMap.get(HorseManCurrentAnimationType.current)?.update(0.02);
    });

    if (HNumberModelMap.size > 0) {
      //pathCount.current < 1 只跑一圈
      if (pathCount.current < 1 && racePathPlay.current) {
        isPlayPause = false;
        //每秒40帧 // 25= 1000/40
        if (performance.now() - lastTimestampMS.current >= 25) {
          lastTimestampMS.current = performance.now();
          handleRenderScene && handleRenderScene();
          if (pathIndex.current < aiRaceResult.current[0].speedData.length) {
            // if (HorseOffsetCamVector3.current.x > 0) {
            //   HorseOffsetCamVector3.current.x -= 0.0298 * pathPlaySpeed.current;
            //   HorseOffsetCamVector3.current.y -= 0.0083 * pathPlaySpeed.current;
            //   HorseOffsetCamVector3.current.z -= 0.0166 * pathPlaySpeed.current;
            //   //const HorseOffsetCamVector3 = useRef({ x: 0, y: 3, z: 15 });
            //   //const HorseOffsetCamVector3 = useRef({ x: 17.9, y: 6.64, z: 30 });
            // }
            const hRBeginV3Cam = HRaceBeginOffsetCamVector3.current.camOffset;
            const hRBeginV3Tar = HRaceBeginOffsetCamVector3.current.targetOffset;
            const hRBeginV3CamOri = HRaceBeginOffsetCamVector3.current.camOffsetOri;
            const hRBeginV3TarOri = HRaceBeginOffsetCamVector3.current.targetOffsetOri;
            if (hRBeginV3Cam.x > 0) {
              // hRBeginV3Cam.x -= (Math.round((hRBeginV3CamOri.x / 5 / 40) * 10000) / 10000) * pathPlaySpeed.current;
              // hRBeginV3Cam.y -= (Math.round((hRBeginV3CamOri.y / 5 / 40) * 10000) / 10000) * pathPlaySpeed.current;
              // hRBeginV3Cam.z += (Math.round((hRBeginV3CamOri.z / 5 / 40) * 10000) / 10000) * pathPlaySpeed.current;
              // hRBeginV3Tar.z -= (Math.round((hRBeginV3TarOri.z / 5 / 40) * 10000) / 10000) * pathPlaySpeed.current;
              hRBeginV3Cam.x -= parseFloat((hRBeginV3CamOri.x / 5 / 40).toFixed(5)) * pathPlaySpeed.current;
              hRBeginV3Cam.y -= parseFloat((hRBeginV3CamOri.y / 5 / 40).toFixed(5)) * pathPlaySpeed.current;
              hRBeginV3Cam.z -= parseFloat((hRBeginV3CamOri.z / 5 / 40).toFixed(5)) * pathPlaySpeed.current;
              hRBeginV3Tar.z -= parseFloat((hRBeginV3TarOri.z / 5 / 40).toFixed(5)) * pathPlaySpeed.current;
              //console.log('HRaceBeginOffsetCamVector3:', JSON.stringify(HRaceBeginOffsetCamVector3.current));
            }

            for (let index = 0; index < HNumberModelMap.size; index++) {
              const raceRes = aiRaceResult.current[index];
              const numModel = HNumberModelMap.get(raceRes.trackNumber) as THREE.Object3D;
              if (numModel) {
                const path = raceRes.speedData[pathIndex.current];
                numModel.position.set(path.xa, path.ya, path.za);

                if (path.isZero) {
                  TrackArenaUtilInstance.current.handlePalyBroadcast(path.t, setRaceAudioText);
                  if (pathPlaySpeed.current === 1) {
                    gsap.to([numModel.rotation], {
                      y: -Math.PI / 2 + path.r,
                      direction: segCount.current / 40,
                    });
                  }
                }
                if (pathPlaySpeed.current !== 1) {
                  numModel.rotation.y = -Math.PI / 2 + path.r;
                }
                // if (path.isZero && index === 0) {
                //   path.t % 12 === 0 && SoundArenaUtil.skillsWhip.sound.play();
                //   path.t % 30 === 0 && SoundArenaUtil.skillsOvertake.sound.play();
                // }

                //保证马已经起跑
                if (path.t > 80) {
                  // if (path.ranking === 1 && path.xa < pathTerminusCamVector3.targetPos.x + 40) {
                  //   //处理第一名冲线
                  //   handleSwitchHCode1TerminusCam(raceRes.trackNumber);
                  // }
                  //镜头过终点线
                  if (path.xa < pathTerminusCamVector3.targetPos.x + 20) {
                    // handleCamTerminus({
                    //   gameHorseId: raceRes.gameHorseId,
                    //   trackNumber: raceRes.trackNumber,
                    //   speedData: {
                    //     ranking: path.ranking,
                    //     isEnd: true,
                    //   },
                    // });
                  }
                  if (path.xa < pathTerminusCamVector3.targetPos.x + 30) {
                    //handleSwitchTerminusNear(rRank);
                    //处理当前观看中的马冲线
                    raceRes.trackNumber === lookAtTrackNumber.current &&
                      handleSwitchHCodeTerminusCam(raceRes.trackNumber);
                  }
                }
                const hnbModel = HNumberBoardModelMap.get(raceRes.trackNumber + '');
                if (hnbModel) {
                  hnbModel.rotation.y = -(-Math.PI / 2 + path.r);
                  // //处理号码牌 旋转后位置不居中的问题
                  // path.r < Math.PI * 2 && (hnbModel.position.z = (path.r - Math.PI) / 10);
                }
                if (HModelTrackNumbers.includes(lookAtTrackNumber.current)) {
                  if (raceRes.trackNumber === lookAtTrackNumber.current) {
                    handlePathCamera(numModel);
                  }
                } else if (path.t <= 12) {
                  //起跑的前12秒 镜头对准最外侧的马
                  // raceRes.trackNumber === HModelTrackNumbers[HModelTrackNumbers.length - 1] &&
                  //   handlePathCamera(numModel);
                  raceRes.trackNumber === HModelTrackNumbers[0] && handlePathCamera(numModel);
                } else if (path.ranking === 1) {
                  handlePathCamera(numModel);
                }
              }
            }
            pathIndex.current++;
          } else {
            handleSwitchTerminusCam();
            pathIndex.current = 0;
            pathCount.current++;
          }
        }
      } else {
        if (!isPlayPause) {
          isPlayPause = true;
          HorseManCurrentAnimationType.current = AnimationType.Stand;
          CurrentLookAtAnimationType.current.animType = AnimationType.Stand;
          cAnimaHCodeInfoSz.forEach((ahcItem) => {
            ahcItem.prevTime = 0;
            ahcItem.animaType = AnimationType.Stand;
          });
        }
      }
    }
    Render.current.render(Scene.current, ActiveCamera.current);
    ReqAFrameId.current = window.requestAnimationFrame(renderScene);
  }, []);

  const init = useCallback(() => {
    loadManager.current = new THREE.LoadingManager();
    loadManager.current.onLoad = () => setLoaded(100);
    // loadManager.current.onStart = (_, loaded, total) => {
    //   console.log('loadManager.current.onStart', { _, loaded, total });
    //   setLoaded((loaded / total) * 100);
    // };
    loadManager.current.onProgress = (_, loaded, total) => {
      const ctotal = total < 300 ? 300 : total;
      //console.log('loadManager.current.onProgress', { _, loaded, total, ctotal, parss: (loaded / ctotal) * 100 });
      setLoaded((loaded / ctotal) * 100);
    };

    SoundArenaUtil.init(loadManager);

    Render.current = new THREE.WebGLRenderer({ antialias: true });
    RenderBody.current.append(Render.current.domElement);
    Scene.current = new THREE.Scene();
    Camera.current = new THREE.PerspectiveCamera();
    Camera2.current = new THREE.PerspectiveCamera();
    ModelObjBoxGroup.current = new THREE.Group();

    hNumberBoardGeo.current = new THREE.CircleGeometry(0.2, 30);
    //hNumberBoardGeo.current = new THREE.CylinderGeometry(0.2, 0.2, 0.01, 10);

    Render.current.setSize(BodyViewSize.w, BodyViewSize.h);
    Camera.current.aspect = BodyViewSize.w / BodyViewSize.h;

    Render.current.shadowMap.enabled = true;
    isPc() && Render.current.setPixelRatio(window.devicePixelRatio);
    Render.current.outputEncoding = THREE.sRGBEncoding;

    // // 创建辅助坐标
    // const axesHelper = new THREE.AxesHelper(10);
    // Scene.current.add(axesHelper);

    // camera
    Camera.current.fov = 45;
    Camera.current.near = 0.1;
    Camera.current.far = 1200;
    Camera.current.position.set(-450, 50, 50);
    Camera.current.lookAt(0, 0, 0);

    Camera2.current.fov = 45;
    Camera2.current.near = 0.1;
    Camera2.current.far = 1200;
    Camera2.current.position.set(-480, 20, 150); //8 120 -180
    //Camera2.current.position.add(new THREE.Vector3(100, 170, 130));
    Camera2.current.lookAt(-420, 1, 120);

    ActiveCamera.current = Camera.current;
    Controls.current = new OrbitControls(ActiveCamera.current, Render.current.domElement);
    Controls.current.enabled = false;
    // Controls.current.addEventListener('change', () => {
    //   //console.log('Camera position:', ActiveCamera.current.position, Controls.current.target);
    //   //renderScene();
    //   // HNumberBoardModelMap.forEach((bModel) => {
    //   //   bModel.quaternion.copy(ActiveCamera.current.quaternion);
    //   // });
    // });

    const loader = new GLTFLoader(loadManager.current);
    //预加载
    loader.load(horseManBaseModel, () => {
      //
    });
    TrackArenaUtilInstance.current = new TrackArenaUtil(
      loadManager.current,
      RaceAudioRef,
      HRaceIsPlayBroadcast.current
    );

    // document.addEventListener('keydown', function (event) {
    //   if (event.code === 'KeyC') {
    //     handleSwitchCamera();
    //   }
    // });
  }, []);

  const setView = () => {
    viewSizeCalc();
    if (Camera.current && Render.current && Scene.current) {
      Render.current.setSize(BodyViewSize.w, BodyViewSize.h);
      Camera.current.aspect = BodyViewSize.w / BodyViewSize.h;
      Camera.current.updateProjectionMatrix();
    }
  };
  const viewSizeCalc = function () {
    const clientWidth = document.body.clientWidth;
    const clientHeight = document.body.clientHeight;

    BodyViewSize.w = clientWidth;
    BodyViewSize.h = clientHeight;
    setBodyViewWH({ w: clientWidth, h: clientHeight });
  };

  const handleSceneEnd = useCallback(() => {
    window.removeEventListener('resize', setView);
    cancelAnimationFrame(ReqAFrameId.current);
    Meshs.forEach((obj3d) => {
      obj3d && Scene.current.remove(obj3d);
      obj3d.clear();
    });
    Render.current.forceContextLoss();
    Render.current.dispose();
    Render.current.domElement.remove();
    Scene.current.remove();
  }, []);

  const handleSceneBegin = useCallback(() => {
    //console.log('handleSceneBegin init:', Date.now());
    (document.querySelector('.mg-door-text') as HTMLElement).style.opacity = '1';
    init();
    loaderGlgRaceArena();
    loaderCreateRacePath();
    createSkydomeHdr();
    loaderGlgModelAnimations();
    createLight();
    setView();

    if (Controls.current) {
      Controls.current.enabled = true;
      // // Controls.current.maxAzimuthAngle = Math.PI / 4;
      // // Controls.current.minAzimuthAngle = -Math.PI / 5;
      Controls.current.maxPolarAngle = Math.PI / 2;
      Controls.current.minPolarAngle = Math.PI / 4;
      Controls.current.maxDistance = 100;
      Controls.current.minDistance = 4;
      Controls.current.update();
    }
    window.addEventListener('resize', setView);
  }, []);

  //#endregion

  useEffect(() => {
    try {
      handleSceneBegin();
    } catch (error) {
      console.error('init Rendering Error:', error);
      alert('The scene loading is abnormal. Refresh the page and try again!');
      window.location.reload();
    }

    return () => {
      handleSceneEnd();
    };
  }, []);

  useEffect(() => {
    if (loaded >= 100) {
      console.log('useEffect loaded >= 100 ', Date.now(), performance.now() - LoadingTimes.current);
      setTimeout(() => {
        loadingShow();
        handleHorseMansRunAction();
        renderScene();
        SoundArenaUtil.throughoutCrowdEnvSoundLoop.sound.play();
        SoundArenaUtil.throughoutWindSoundLoop.sound.play();
      }, 100);
    }
  }, [loaded]);

  return (
    <>
      <div className='mg-door-box absolute left-0 top-0 z-20 flex h-full w-full items-center justify-center  '>
        <div className='mg-door-top  absolute left-0 top-0  h-1/2 w-full bg-[rgba(0,0,0,1)]'></div>
        <div className='mg-door-button absolute bottom-0 left-0  h-1/2 w-full bg-[rgba(0,0,0,1)]'></div>
        <span className='mg-door-text static z-10 text-[1rem] text-white'>{loaded.toFixed(2)}%</span>
      </div>
      <div className='absolute left-2 top-12 text-base text-white '>FPS:{currentRealFps}</div>

      <div
        className={
          ' absolute bottom-10 left-0 flex w-full items-center justify-center ' + (raceAudioText === '' ? 'hidden' : '')
        }
        hidden={raceAudioText === ''}>
        <p className=' rounded  px-4 py-1 text-center text-2xl text-white '>{raceAudioText}</p>
        <audio preload='none' className=' hidden' ref={RaceAudioRef}></audio>
      </div>

      <div className=' flex items-center justify-center'>
        <select
          placeholder='倍速'
          onChange={handleSelectChange}
          className=' mx-2 my-1 w-14 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'>
          <option value='1'>1x</option>
          <option value='2'>2x</option>
          <option value='4'>4x</option>
          <option value='6'>6x</option>
          <option value='10'>10x</option>
        </select>
        <select
          placeholder='马动画倍速'
          defaultValue='0.5'
          onChange={handleHAnimScaleSelectChange}
          className=' mx-2 my-1 w-16 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'>
          <option value='0.4'>0.4</option>
          <option value='0.5'>0.5</option>
          <option value='0.7'>0.7</option>
          <option value='0.9'>0.9</option>
          <option value='1.1'>1.1</option>
          <option value='1.3'>1.3</option>
          <option value='1.5'>1.5</option>
        </select>
        <button
          className=' mx-2 my-1 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'
          onClick={() => {
            if (selectSpeed !== '1') {
              pathPlaySpeed.current = parseInt(selectSpeed);
              const resHorsePaths = TrackArenaUtilInstance.current.getRacePathByRaceData(
                raceDataInfo,
                segCount,
                pathPlaySpeed
              );
              aiRaceResult.current = resHorsePaths;
            }
            pathTerminusCamVector3.isUse = false;
            racePathPlay.current = true;
            HorseManCurrentAnimationType.current = AnimationType.Run;
            CurrentLookAtAnimationType.current.animType = AnimationType.Run;
            pathCount.current = 0;
            HorseRaceArenaModelObj.current.traverse((child: THREE.Mesh) => {
              if (child.isObject3D) {
                if (child.name === 'men') {
                  child.visible = false;
                }
              }
            });
            handleRaceStart && handleRaceStart(pathPlaySpeed.current);
            //handleRacePlaySpeed && handleRacePlaySpeed(pathPlaySpeed.current);
            SoundArenaUtil.throughoutCrowdEnvSoundLoop.sound.play();
            SoundArenaUtil.throughoutWindSoundLoop.sound.play();
            // SoundArenaUtil.countdownReady.sound.play();
            // SoundArenaUtil.countdownReady.sound.on('end', () => {
            //   SoundArenaUtil.countdownGo.sound.play();
            // });
          }}>
          Run
        </button>
        <button
          className=' mx-2 my-1 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'
          onClick={() => {
            racePathPlay.current = false;
            // SoundArenaUtil.crossingFinishLine?.sound?.play();
            // SoundArenaUtil.crowdCheersFinished?.sound?.play();
          }}>
          Pause
        </button>
        <button
          className=' mx-2 my-1 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'
          onClick={() => {
            // HorseManCurrentAnimationType.current = AnimationType.Sprint;
            // setTimeout(() => {
            //   HorseManCurrentAnimationType.current = AnimationType.Run;
            // }, 4 * 1000);
            if (lookAtTrackNumber.current === '-1') {
              alert('请先选择要观看的马！');
              return;
            }
            console.log('page Sprint onClick  000', CurrentLookAtAnimationType.current);
            handleSwitchAnimation(AnimationType.Sprint, () => {
              console.log('page Sprint onClick  111', CurrentLookAtAnimationType.current);

              handleSwitchAnimation(CurrentLookAtAnimationType.current.prevAnimType, () => {
                console.log('page Sprint onClick  222', CurrentLookAtAnimationType.current);
                //CurrentLookAtAnimationType.current.hCode = '';
              });
              //setTimeout(() => {}, 3 * 1000);
            });

            // HorseManCurrentAnimationType.current = AnimationType.Sprint;
            // console.log('page Sprint onClick  000', HorseManCurrentAnimationType.current);
            // setTimeout(() => {
            //   // handleSwitchAnimation(AnimationType.Run, () => {
            //   //   console.log('page Sprint onClick  222', CurrentLookAtAnimationType.current);
            //   // });
            //   console.log('page Sprint onClick  111', HorseManCurrentAnimationType.current);
            //   HorseManCurrentAnimationType.current = AnimationType.Run;
            // }, 3 * 1000);
          }}>
          Sprint
        </button>
        <button
          className=' mx-2 my-1 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'
          onClick={() => {
            if (lookAtTrackNumber.current === '-1') {
              alert('请先选择要观看的马！');
              return;
            }
            console.log('page Whiplash onClick  000', CurrentLookAtAnimationType.current);
            handleSwitchAnimation(AnimationType.Whiplash, () => {
              console.log('page Whiplash onClick  111', CurrentLookAtAnimationType.current);
              handleSwitchAnimation(CurrentLookAtAnimationType.current.prevAnimType, () => {
                console.log('page Whiplash onClick  222', CurrentLookAtAnimationType.current);
                //CurrentLookAtAnimationType.current.hCode = '';
              });
            });
            //HorseManCurrentAnimationType.current = AnimationType.Whiplash;
            // setTimeout(() => {
            //   handleSwitchAnimation(AnimationType.Run, 0);
            // }, 1000);

            //HorseManCurrentAnimationType.current = AnimationType.Whiplash;
            // setTimeout(() => {
            //   HorseManCurrentAnimationType.current = AnimationType.Run;
            // }, 1 * 1000);
          }}>
          Whiplash
        </button>
        <button
          className=' mx-2 my-1 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'
          onClick={() => {
            HorseManCurrentAnimationType.current = AnimationType.ShakeHead;
          }}>
          ShakeHead
        </button>
        {/* {HModelTrackNumbers.length > 0 &&
          HModelTrackNumbers.map((num, idx) => {
            return (
              <button
                key={idx}
                className=' mx-2 my-1 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'
                onClick={() => {
                  lookAtTrackNumber.current = num;
                  pathTerminusCamVector3.isUse = false;
                  //SoundArenaUtil.skillsOvertake.sound.play();
                }}>
                Horse {num}
              </button>
            );
          })} */}
        {/* <button
          className=' mx-2 my-1 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'
          onClick={() => (lookAtTrackNumber.current = -1)}>
          Horse Ranking 1
        </button> */}

        <select
          placeholder='Switch Horse'
          onChange={handleSelectHorseChange}
          className=' mx-2 my-1 w-44 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'>
          <option value='-1'>Horse Ranking 1</option>
          {HModelTrackNumbers.length > 0 &&
            HModelTrackNumbers.map((num, idx) => {
              return (
                <option key={idx} value={num + ''}>
                  Horse {num}
                </option>
              );
            })}
        </select>

        <button
          className=' mx-2 my-1 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'
          onClick={() => {
            handleSwitchCamera();
          }}>
          Switch Camera
        </button>
        <button
          className=' mx-2 my-1 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'
          onClick={() => {
            handleSwitchTerminusCam();
          }}>
          Terminus
        </button>

        <button
          className=' mx-2 my-1 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'
          onClick={() => {
            HorseOffsetCamVector3.current = HorseUserOffsetCamVector3.current;
          }}>
          User Horse
        </button>
      </div>
      <div className=' flex items-center justify-center overflow-hidden' ref={RenderBody}></div>
    </>
  );
}

export default forwardRef(TrackSantaArenaModel);
