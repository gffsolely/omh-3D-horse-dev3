import gsap from 'gsap';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

import { config } from '@/config';
import { isPc } from '@/utils';

import TrackArenaUtil, {
  AnimationType,
  getFontTextByNumber,
  getVideoTexture,
  HorseEquipType,
  loadingHide,
  loadingShow,
} from './TrackArenaUtil';

function TrackSantaArenaModelWS({ raceDataInfo, handleRenderScene }, ref) {
  // console.log('TrackSantaArenaModel init:', Date.now());
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

  const HorseRaceArenaModelObj = useRef(null);
  const HorseManRunModelObjs = useRef([]).current;
  const HorseManRunMixerMap = useRef<Map<string, THREE.AnimationMixer[]>>(new Map()).current; //key为：动画1 动画2 动画3
  const HorseManRunActionMap = useRef<Map<string, THREE.AnimationAction[]>>(new Map()).current; //key为：动画1 动画2 动画3
  const HorseManBaseAnimationMap = useRef<Map<string, THREE.AnimationClip[]>>(new Map()).current;
  const HAnimationTimeScale = useRef(null); //模型动画播放速度的倍数   //150fps及以上为 0.4

  const HorseManCurrentAnimationType = useRef(AnimationType.Stand);

  const HNumberModelMap = useRef<Map<string, THREE.Object3D>>(new Map()).current;
  const HNumberBoardModelMap = useRef<Map<string, THREE.Object3D>>(new Map()).current;
  const HModelTrackNumbers = useRef([]).current;

  const segCount = useRef(20); //每秒40帧 //把每0.5秒的点继续分割 20 // 0.1秒分割4
  const aiRaceResult = useRef([]);
  const aiRaceResultCurr = useRef([]);
  const aiRaceResultPre = useRef([]);
  const pagePathPreT = useRef(-1);
  const pathIndex = useRef(0);
  const pagePathIndex = useRef(0);
  const lastTimestampMS = useRef(0);
  const hNumberBoardGeo = useRef<THREE.CircleGeometry>(null);
  const lookAtTrackNumber = useRef(-1);
  const SpotLightModel = useRef<THREE.SpotLight>(null);

  const HorseOffsetCamVector3 = useRef({ x: 17.9, y: 6.64, z: 30 });
  const pathTerminusCamVector3 = useRef({
    isUse: false,
    targetPos: { x: -198, y: 1, z: -120 },
    camPos: { x: -198.6, y: 3.41, z: -98.21 },
  }).current;
  const raceIsStarted = useRef(false);

  const TrackArenaUtilInstance = useRef<TrackArenaUtil>(null);

  const BodyViewSize = useRef<{ w: number; h: number }>({
    w: 2560,
    h: 1550,
  }).current;
  const [bodyViewWH, setBodyViewWH] = useState({ w: 2560, h: 1550 });

  const [currentRealFps, setCurrentRealFps] = useState(0);
  const playBroadcastIsOn = useRef(true);
  const playBroadcastSTOId = useRef(null);
  const RaceAudioRef = useRef(null);
  const [raceAudioText, setRaceAudioText] = useState('');

  //#region fileHost3d
  const scene360Hdr = config.fileHost3d + '/omh-game/models/hdr/202308/08/HDR_Alien_4K.hdr';
  const horseManBaseModel =
    config.fileHost3d + '/omh-game/models/model/202308/05/horse_man/horse_man_base_model_v0.2.glb';
  const horseManAnimSprintModel =
    config.fileHost3d + '/omh-game/models/model/202308/05/horse_man/horse_man_animation_sprint_v0.3.glb';
  const horseManAnimRunModel =
    config.fileHost3d + '/omh-game/models/model/202308/05/horse_man/horse_man_animation_run_v0.3.glb';
  const horseManAnimStandModel =
    config.fileHost3d + '/omh-game/models/model/202308/05/horse_man/horse_man_animation_stand_v0.3.glb';
  const horseRaceArenaModel = config.fileHost3d + '/omh-game/models/model/202308/05/horse_race_arena_santa_v0.12.glb';
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
    setRaceData,
    setRaceBroadcastData,
    stopRace,
  }));

  //#region  useImperativeHandle funs

  const setRaceBroadcastData = (broadcast) => {
    if (!playBroadcastIsOn.current) return;
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
  };

  const stopRace = () => {
    HorseManCurrentAnimationType.current = AnimationType.Stand;
  };

  const setRaceData = (data) => {
    //console.log('TrackSantaArenaModelWS setRaceData', { data });
    const currPathT = data[0]?.speedData?.t === undefined ? -1 : data[0].speedData.t;
    if (aiRaceResultPre.current.length <= 0 && data && data.length > 0) {
      pagePathPreT.current = data[0]?.speedData?.t === undefined ? -1 : data[0].speedData.t;
      aiRaceResultPre.current = data;
      console.log('TrackSantaArenaModelWS setRaceData', { data });
      for (let index = 0; index < aiRaceResultPre.current.length; index++) {
        //当前赛道最多支持12匹马
        if (index < 12) {
          const chorse = aiRaceResultPre.current[index];
          const path = chorse.speedData;
          loaderGlgModel(chorse.trackNumber + '', path.direction, new THREE.Vector3(-path.xa, 1, path.ya));
          HModelTrackNumbers.push(chorse.trackNumber);
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
        !raceIsStarted.current && handleArenaRaceStart();
        aiRaceResultCurr.current = data;
        const resHorsePaths: any[] = [];
        for (let index = 0; index < aiRaceResultPre.current.length; index++) {
          const chorse = aiRaceResultPre.current[index];
          resHorsePaths.push({
            gameHorseId: chorse.gameHorseId,
            ranking: chorse.ranking,
            trackNumber: chorse.trackNumber,
            speedData: [],
          });
          const pathPre = chorse.speedData;
          const cxaPre = -pathPre.xa;
          const cyaPre = pathPre.ya;
          const path = aiRaceResultCurr.current[index].speedData;
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
        aiRaceResult.current = resHorsePaths;
        pathIndex.current = 0;
        aiRaceResultPre.current = aiRaceResultCurr.current;
      }
    }
  };

  //#endregion

  //#region loaderGlgModel

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

      HorseManRunModelObjs.push(obj);
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
      HNumberModelMap.set('number' + hNumber, model);

      const hMesh = getFontTextByNumber(loadManager, hNumber);
      hMesh.position.set(0, 2.9, 0);
      hMesh.rotation.y = -Math.PI / 2;
      hMesh.name = 'horseNumberBoard' + hNumber;
      model.add(hMesh);
      HNumberBoardModelMap.set(hNumber, hMesh);

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
      if (HModelTrackNumbers.length === HorseManRunModelObjs.length) {
        //handleHorseMansRunAction();
        //handlePathCamera(model);
        CurrentLookAtHModel.current = model;
        //起点相机位置 赛场模型 field_008
        Camera.current.position.set(-420, 7.64, 151.1);
        const cmodel = HNumberModelMap.get('number' + HModelTrackNumbers[0]);
        const cVector3 = cmodel.position;
        Camera.current.lookAt(cVector3);
        Controls.current.target.copy(cVector3);
        Controls.current.update();
      }
    });
  }, []);
  const loaderGlgModelAnimations = useCallback(() => {
    const loader = new GLTFLoader(loadManager.current);
    loader.load(horseManAnimStandModel, (obj) => {
      HorseManBaseAnimationMap.set(AnimationType.Stand, obj.animations);
    });
    loader.load(horseManAnimRunModel, (obj) => {
      HorseManBaseAnimationMap.set(AnimationType.Run, obj.animations);
    });
    loader.load(horseManAnimSprintModel, (obj) => {
      HorseManBaseAnimationMap.set(AnimationType.Sprint, obj.animations);
    });

    // let obj = await loader.loadAsync(horseManAnimStandModel);
    // HorseManBaseAnimationMap.set(AnimationType.Stand, obj.animations);
    // obj = await loader.loadAsync(horseManAnimRunModel);
    // HorseManBaseAnimationMap.set(AnimationType.Run, obj.animations);
    // obj = await loader.loadAsync(horseManAnimSprintModel);
    // HorseManBaseAnimationMap.set(AnimationType.Sprint, obj.animations);
  }, []);

  const loaderGlgRaceArena = useCallback(() => {
    const loader = new GLTFLoader(loadManager.current);
    loader.load(horseRaceArenaModel, (obj) => {
      //console.log('horseRaceArenaModel  obj:', obj);
      const model = obj.scene;
      model.position.set(62, 19.4, 39);
      model.rotation.y = -Math.PI;
      model.name = 'horseRaceArenaModel';
      model.castShadow = true;
      model.receiveShadow = true;

      model.traverse(function (child: THREE.Mesh) {
        if (child.isObject3D) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.name === 'qipao_G') {
            child.position.set(204, 0, -0.4); //起点位置 赛场模型 field_008
          }
          if (child.name === 'Finish_G') {
            child.position.x = -16;
          }
          if (child.name === 'guanggao_10') {
            child.visible = false;
          }
          if (child.name === 'jianzhu_20' || child.name === 'jianzhu_11' || child.name === 'jianzhu_12') {
            child.visible = false;
          }
        }
        if (child.isMesh) {
          if (child.name === 'qipao_G') {
            child.position.set(204, 0, -0.4); //起点位置 赛场模型 field_008
          }
        }
      });
      HorseRaceArenaModelObj.current = model;
      Scene.current.add(model);
    });
    //horseRaceArenaPlacardModel
    const wallVTexture = getVideoTexture(horseArenaPlacardVideo, loadManager, false);
    loader.load(horseRaceArenaPlacardModel, (obj) => {
      //console.log('horseRaceArenaPlacardModel  obj:', obj);
      const model = obj.scene;
      model.position.set(-438, 0, 100);
      model.rotation.y = -Math.PI;
      model.name = 'horseRaceArenaPlacard01';
      model.receiveShadow = true;
      Scene.current.add(model);

      const wallMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(8.6, 8.6 * (9 / 16)),
        new THREE.MeshBasicMaterial({
          map: wallVTexture,
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
    const derlight = new THREE.DirectionalLight(0xffffff, 3.5);
    derlight.position.set(0, 300, 0);
    derlight.target.position.set(0, 0, 0);
    //derlight.castShadow = true;
    Scene.current.add(derlight);
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
  }, []);

  const createSkydomeHdr = () => {
    const panoramaTexture = new RGBELoader(loadManager.current).load(scene360Hdr);
    panoramaTexture.mapping = THREE.EquirectangularReflectionMapping;
    const skydomeMaterial = new THREE.MeshBasicMaterial({
      map: panoramaTexture,
      side: THREE.BackSide,
    });

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

    Scene.current.environment = panoramaTexture;
    Render.current.outputEncoding = THREE.sRGBEncoding;
  };

  //#endregion

  //#region  handle functions

  const handleArenaRaceStart = () => {
    raceIsStarted.current = true;
    pathTerminusCamVector3.isUse = false;
    HorseManCurrentAnimationType.current = AnimationType.Run;
    HorseRaceArenaModelObj.current?.traverse((child: THREE.Mesh) => {
      if (child.isObject3D) {
        if (child.name === 'men') {
          child.visible = false;
        }
      }
    });
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
        HorseManRunModelObjs.forEach((obj) => {
          const cModel = obj.scene;
          const mixerLeftHorse = new THREE.AnimationMixer(cModel);
          const actionHorseRun = mixerLeftHorse.clipAction(cAnimations[0]);
          actionHorseRun.loop = THREE.LoopRepeat;
          //actionHorseRun.setDuration(actDuration);
          actionHorseRun.timeScale = 0.4;
          actionHorseRun.time = Math.random() * 2;
          actionHorseRun.play();
          horseManRunActions.push(actionHorseRun);
          horseManRunMixers.push(mixerLeftHorse);
        });
        HorseManRunMixerMap.set(ckey, horseManRunMixers);
        HorseManRunActionMap.set(ckey, horseManRunActions);
      }
    });
  };

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

  const handlePathCamera = (hNumModel) => {
    if (pathTerminusCamVector3.isUse) return;
    if (Camera.current && hNumModel && Controls.current) {
      CurrentLookAtHModel.current = hNumModel;
      Camera.current.position.copy(hNumModel.position);
      const hcv = HorseOffsetCamVector3.current;
      Camera.current.position.add(new THREE.Vector3(hcv.x, hcv.y, hcv.z));
      Camera.current.lookAt(hNumModel.position);

      Controls.current.target.copy(hNumModel.position);
      Controls.current.update();
    }
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

  // 动画切换相机
  const animateCameraTransition = (startCamera, endCamera) => {
    const startPos = startCamera.position.clone();
    const endPos = endCamera.position.clone();
    //console.log('startPosstartPos11 :', startPos, endPos);
    const duration = 1;
    const ease = 'power4.inOut';
    gsap.to(startCamera.position, {
      duration,
      ease,
      x: endPos.x,
      y: endPos.y,
      z: endPos.z,
    });
    setTimeout(() => {
      loadingShow();
      ActiveCamera.current = endCamera;
      startCamera.position.copy(startPos);
      Controls.current = new OrbitControls(ActiveCamera.current, Render.current.domElement);
      if (Controls.current) {
        CurrentLookAtHModel.current && Controls.current.target.copy(CurrentLookAtHModel.current.position);
        Controls.current.maxPolarAngle = Math.PI / 2;
        Controls.current.minPolarAngle = Math.PI / 4;
        Controls.current.maxDistance = 200;
        Controls.current.minDistance = 10;
        Controls.current.enabled = false;
        if (endCamera === Camera2.current) {
          Controls.current.enabled = true;
        }
        Controls.current.update();
      }
    }, duration * 1000);
  };

  //#endregion

  //#region init renderScene

  const fps2 = useRef(0);
  const lastCalledTime2 = useRef(performance.now());

  // 渲染画面
  const renderScene = useCallback(() => {
    // console.log('renderScene renderScene ', Date.now());
    fps2.current++;
    if (performance.now() - lastCalledTime2.current >= 1000) {
      lastCalledTime2.current = performance.now();
      //console.log('Current fps(1s):' + fps2.current);
      setCurrentRealFps(fps2.current);
      fps2.current = 0;
    }

    HorseManRunMixerMap.get(HorseManCurrentAnimationType.current)?.forEach((item) => {
      item.update(0.02);
    });
    if (HNumberModelMap.size > 0) {
      //pathCount.current < 1 只跑一圈
      if (aiRaceResult.current && aiRaceResult.current.length > 0) {
        //每秒40帧 // 25= 1000/40
        if (performance.now() - lastTimestampMS.current >= 25) {
          lastTimestampMS.current = performance.now();
          handleRenderScene && handleRenderScene();
          if (pathIndex.current < aiRaceResult.current[0].speedData.length) {
            if (HorseOffsetCamVector3.current.x > 0) {
              HorseOffsetCamVector3.current.x -= 0.0298;
              HorseOffsetCamVector3.current.y -= 0.0083;
              HorseOffsetCamVector3.current.z -= 0.0166;
            }
            for (let index = 0; index < HNumberModelMap.size; index++) {
              const raceRes = aiRaceResult.current[index];
              const numModel = HNumberModelMap.get('number' + raceRes.trackNumber) as THREE.Object3D;
              if (numModel) {
                const path = raceRes.speedData[pathIndex.current];
                numModel.position.set(path.xa, path.ya, path.za);

                if (pathIndex.current % segCount.current === 0) {
                  TrackArenaUtilInstance.current.handlePalyBroadcast(path.t, setRaceAudioText);
                  gsap.to([numModel.rotation], {
                    y: -Math.PI / 2 + path.r,
                    direction: segCount.current / 40,
                  });
                }
                const hnbModel = HNumberBoardModelMap.get(raceRes.trackNumber + '');
                if (hnbModel) {
                  hnbModel.rotation.y = -(-Math.PI / 2 + path.r);
                  //处理号码牌 旋转后位置不居中的问题
                  path.r < Math.PI * 2 && (hnbModel.position.z = (path.r - Math.PI) / 10);
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
            pagePathIndex.current++;
          }
        }
      }
    }
    ReqAFrameId.current = window.requestAnimationFrame(renderScene);
    Render.current.render(Scene.current, ActiveCamera.current);
  }, []);

  const init = useCallback(() => {
    loadManager.current = new THREE.LoadingManager();
    loadManager.current.onLoad = () => setLoaded(100);
    loadManager.current.onStart = (_, loaded, total) => setLoaded((loaded / total) * 100);
    loadManager.current.onProgress = (_, loaded, total) => {
      setLoaded((loaded / total) * 100);
    };

    Render.current = new THREE.WebGLRenderer({ antialias: true });
    RenderBody.current.append(Render.current.domElement);
    Scene.current = new THREE.Scene();
    Camera.current = new THREE.PerspectiveCamera();
    Camera2.current = new THREE.PerspectiveCamera();
    ModelObjBoxGroup.current = new THREE.Group();

    hNumberBoardGeo.current = new THREE.CircleGeometry(0.2, 20);

    Render.current.setSize(BodyViewSize.w, BodyViewSize.h);
    Camera.current.aspect = BodyViewSize.w / BodyViewSize.h;

    Render.current.shadowMap.enabled = true;
    isPc() && Render.current.setPixelRatio(window.devicePixelRatio);
    Render.current.outputEncoding = THREE.sRGBEncoding;

    // camera
    Camera.current.fov = 45;
    Camera.current.near = 0.1;
    Camera.current.far = 1000;
    Camera.current.position.set(-420, 7.64, 151.1);
    const cVector3 = new THREE.Vector3(-437.91, 1, 121);
    Camera.current.lookAt(cVector3);

    Camera2.current.fov = 45;
    Camera2.current.near = 0.1;
    Camera2.current.far = 1000;
    Camera2.current.position.set(0, 50, -100); //8 120 -180
    Camera2.current.lookAt(0, 0, 0);

    ActiveCamera.current = Camera.current;
    Controls.current = new OrbitControls(ActiveCamera.current, Render.current.domElement);
    Controls.current.target.copy(cVector3);
    Controls.current.enabled = false;

    TrackArenaUtilInstance.current = new TrackArenaUtil(loadManager.current);

    const loader = new GLTFLoader(loadManager.current);
    //预加载
    loader.load(horseManBaseModel, () => {
      //
    });
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
    createLight();
    createSkydomeHdr();
    loaderGlgModelAnimations();
    loaderGlgRaceArena();
    setView();
    if (Controls.current) {
      //Controls.current.enabled = true;
      // Controls.current.maxAzimuthAngle = Math.PI / 4;
      // Controls.current.minAzimuthAngle = -Math.PI / 5;
      Controls.current.maxPolarAngle = Math.PI / 2;
      Controls.current.minPolarAngle = Math.PI / 4;
      Controls.current.maxDistance = 100;
      Controls.current.minDistance = 10;
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
      console.log('useEffect loaded >= 100', Date.now());
      setTimeout(() => {
        loadingShow();
        !ReqAFrameId.current && renderScene();
        if (HorseManRunModelObjs.length > 0 && HModelTrackNumbers.length === HorseManRunModelObjs.length) {
          handleHorseMansRunAction();
        }
      }, 500);
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
        {HModelTrackNumbers.length > 0 &&
          HModelTrackNumbers.map((num, idx) => {
            return (
              <button
                key={idx}
                className=' mx-2 my-1 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'
                onClick={() => {
                  lookAtTrackNumber.current = num;
                  pathTerminusCamVector3.isUse = false;
                }}>
                Horse {num}
              </button>
            );
          })}
        <button
          className=' mx-2 my-1 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'
          onClick={() => (lookAtTrackNumber.current = -1)}>
          Horse Ranking 1
        </button>
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
            pathTerminusCamVector3.isUse = true;
            if (Camera.current && Controls.current) {
              const camPos = pathTerminusCamVector3.camPos;
              const targetPos = pathTerminusCamVector3.targetPos;
              Camera.current.position.set(camPos.x, camPos.y, camPos.z);
              const targetVector3 = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
              Camera.current.lookAt(targetVector3);
              Controls.current.target.copy(targetVector3);
              Controls.current.update();
            }
          }}>
          Terminus
        </button>
      </div>
      <div className=' flex items-center justify-center overflow-hidden' ref={RenderBody}></div>
    </>
  );
}

export default forwardRef(TrackSantaArenaModelWS);
