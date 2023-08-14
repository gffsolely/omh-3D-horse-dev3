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
  getTextureByNumber,
  HorseEquipType,
  loadingHide,
  loadingShow,
} from './TrackArenaUtil';

function TrackSantaArenaModel({ raceDataInfo }, ref) {
  // console.log('TrackSantaArenaModel init:', Date.now());
  const [loaded, setLoaded] = useState(0);
  const loadManager = useRef<THREE.LoadingManager>();
  const Body = useRef(null);
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
  const HorseOffsetCamVector3 = useRef({ x: 0, y: 2, z: 10 }); // (0, 2, 10); //(21, 4, -3); //基础相机位置与目标位置的偏移量
  // const HorseRunMixers = useRef<THREE.AnimationMixer[]>([]).current;
  // const HorseRunModelObjs = useRef([]).current;
  // const HorseRunActions = useRef<THREE.AnimationAction[]>([]).current;
  // const HorseManRunMixers = useRef<THREE.AnimationMixer[]>([]).current;
  // const HorseManRunModelObjs = useRef([]).current;
  // const HorseManRunActions = useRef<THREE.AnimationAction[]>([]).current;
  const HorseManRunModelObjs = useRef([]).current;
  const HorseManRunMixerMap = useRef<Map<string, THREE.AnimationMixer[]>>(new Map()).current; //key为：动画1 动画2 动画3
  const HorseManRunActionMap = useRef<Map<string, THREE.AnimationAction[]>>(new Map()).current;
  const HorseManBaseAnimationMap = useRef<Map<string, THREE.AnimationClip[]>>(new Map()).current;
  const HorseManCurrentAnimationType = useRef(AnimationType.Stand);

  const HNumberModelMap = useRef<Map<string, THREE.Object3D>>(new Map()).current;
  const HNumberBoardModelMap = useRef<Map<string, THREE.Object3D>>(new Map()).current;
  const HModelTrackNumbers = useRef([]).current;
  const HManNumberModelMap = useRef<Map<string, THREE.Object3D>>(new Map()).current;

  const segCount = useRef(20); //每秒40帧 //把每0.5秒的点继续分割 20 // 0.1秒分割4
  const aiRaceResult = useRef([]);
  const pathIndex = useRef(0);
  const pathLength = useRef(1);
  const pathCount = useRef(0);
  const lastTimestampMS = useRef(0);
  const racePathPlay = useRef(false);
  const pathPlaySpeed = useRef(1); //曲线播放速度 //1 1倍速，2 2倍速,...
  const hNumberBoardGeo = useRef<THREE.CircleGeometry>(null);
  const hModelIsRun = useRef(false);
  const lookAtTrackNumber = useRef(-1);
  const SpotLightModel = useRef<THREE.SpotLight>(null);
  const pathTerminusCamVector3 = useRef({
    isUse: false,
    targetPos: { x: -215, y: 1, z: -120 },
    camPos: { x: -215.7, y: 3.7, z: -143 },
  }).current;

  const TrackArenaUtilInstance = useRef<TrackArenaUtil>(null);

  const [selectedActionIdx, setSelectedActionIdx] = useState(1);
  const BodyViewSize = useRef<{ w: number; h: number }>({
    w: 2560,
    h: 1550,
  }).current;
  const [bodyViewWH, setBodyViewWH] = useState({ w: 2560, h: 1550 });
  const [selectSpeed, setSelectSpeed] = useState('1');

  //#region fileHost3d
  //const royalEsplanadeHdr = config.fileHost3d + '/omh-game/models/hdr/royal_esplanade_1k.hdr';
  const scene360Hdr = config.fileHost3d + '/omh-game/models/hdr/202308/08/HDR_Alien_4K.hdr';
  //const royalEsplanadeHdr = '/models/texture/hdr/blouberg_sunrise_2_1k.hdr';
  //const horseRunBlackModel = config.fileHost3d + '/omh-game/models/model/202307/18/horse_digital_base_run.glb';
  // const horseManSprintModel = config.fileHost3d + '/omh-game/models/model/202308/05/horse_man_sprint_v0.1.glb';
  // const horseManRunModel = config.fileHost3d + '/omh-game/models/model/202308/05/horse_man_run_v0.1.glb';
  // const horseManStandModel = config.fileHost3d + '/omh-game/models/model/202308/05/horse_man_stand_v0.1.glb';
  // const horseBaseRunModel = config.fileHost3d + '/omh-game/models/model/202308/05/horse_base_run_v0.1.glb';
  // const horseManBaseRunModel = config.fileHost3d + '/omh-game/models/model/202308/05/horse_man_base_run_v0.1.glb';
  const horseManBaseModel =
    config.fileHost3d + '/omh-game/models/model/202308/05/horse_man/horse_man_base_model_v0.2.glb';
  const horseManAnimSprintModel =
    config.fileHost3d + '/omh-game/models/model/202308/05/horse_man/horse_man_animation_sprint_v0.3.glb';
  const horseManAnimRunModel =
    config.fileHost3d + '/omh-game/models/model/202308/05/horse_man/horse_man_animation_run_v0.3.glb';
  const horseManAnimStandModel =
    config.fileHost3d + '/omh-game/models/model/202308/05/horse_man/horse_man_animation_stand_v0.3.glb';
  const horseRaceArenaModel = config.fileHost3d + '/omh-game/models/model/202308/05/horse_race_arena_santa_v0.5.glb';

  const floorTextureRoughness = config.fileHost3d + '/omh-game/models/textures/202306/05/terrain-roughness.jpg';
  const floorTextureNormal = config.fileHost3d + '/omh-game/models/textures/202306/05/terrain-normal.jpg';

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

      const hTexture = getTextureByNumber(hNumber);
      const hMesh = new THREE.Mesh(
        hNumberBoardGeo.current,
        new THREE.MeshBasicMaterial({ map: hTexture, side: THREE.DoubleSide })
      );
      hMesh.position.set(0, 3, 0);
      hMesh.rotation.y = -model.rotation.y;
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
        handleHorseMansRunAction();
        //handlePathCamera(model);
        CurrentLookAtHModel.current = model;
        //起点相机位置 赛场模型 field_008
        Camera.current.position.set(-424.78, 5.89, 140);
        const cVector3 = new THREE.Vector3(-437.915, 1, 120);
        Camera.current.lookAt(cVector3);
        Controls.current.target.copy(cVector3);
        Controls.current.update();
      }
    });
  }, []);

  const loaderGlgModelAnimations = useCallback(async () => {
    const loader = new GLTFLoader(loadManager.current);
    // hAnimationType = 'stand'
    // let cHorseManModel = horseManStandModel;
    // if (hAnimationType === 'run') cHorseManModel = horseManRunModel;
    // else if (hAnimationType === 'sprint') cHorseManModel = horseManSprintModel;
    // loader.load(horseManAnimStandModel, (obj) => {
    //   console.log('horseManAnimStandModel obj :', obj);
    //   HorseManBaseAnimationMap.set('stand', obj.animations);
    // });
    // loader.load(horseManAnimRunModel, (obj) => {
    //   console.log('horseManAnimRunModel obj :', obj);
    //   HorseManBaseAnimationMap.set('run', obj.animations);
    // });
    // loader.load(horseManAnimSprintModel, (obj) => {
    //   console.log('horseManAnimSprintModel obj :', obj);
    //   HorseManBaseAnimationMap.set('sprint', obj.animations);
    // });
    let obj = await loader.loadAsync(horseManAnimStandModel);
    HorseManBaseAnimationMap.set(AnimationType.Stand, obj.animations);
    obj = await loader.loadAsync(horseManAnimRunModel);
    HorseManBaseAnimationMap.set(AnimationType.Run, obj.animations);
    obj = await loader.loadAsync(horseManAnimSprintModel);
    HorseManBaseAnimationMap.set(AnimationType.Sprint, obj.animations);
  }, []);

  const loaderGlgRaceArena = useCallback(() => {
    const loader = new GLTFLoader(loadManager.current);
    loader.load(horseRaceArenaModel, (obj) => {
      //console.log('horseRaceArenaModel  obj:', obj);
      const model = obj.scene;
      model.position.set(62, 19.4, 39.5);
      model.rotation.y = -Math.PI;
      model.name = 'horseRaceArenaModel';
      model.castShadow = true;
      model.receiveShadow = true;

      model.traverse(function (child: THREE.Mesh) {
        if (child.isObject3D) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.name === 'qipao_G') {
            //console.log('child.position', child.position);
            child.position.set(204, 0, -0.4); //起点位置 赛场模型 field_008
          }
        }
        if (child.isMesh) {
          if (child.name === 'qipao_G') {
            //console.log('child.position', child.position);
            child.position.set(204, 0, -0.4); //起点位置 赛场模型 field_008
          }
          // if (child.name === '网格094') {
          //   const mat = child.material as THREE.MeshStandardMaterial;
          //   mat.transparent = true;
          //   mat.opacity = 0.2;
          //   mat.needsUpdate = true;
          // }
        }
      });

      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1300, 1300),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(0, 0, 0),
          roughnessMap: TrackArenaUtilInstance.current.getDigitalHTexture(floorTextureRoughness),
          normalMap: TrackArenaUtilInstance.current.getDigitalHTexture(floorTextureNormal),
        })
      );
      plane.position.y = -21;
      plane.rotation.x = -Math.PI / 2;
      plane.receiveShadow = true;
      model.add(plane);

      Scene.current.add(model);
    });
  }, []);

  /** 初始化灯光 */
  const createLight = useCallback(() => {
    // const ambientLight = new THREE.AmbientLight('#ffffff', 3);
    // Scene.current.add(ambientLight);
    const derlight = new THREE.DirectionalLight(0xffffff, 2);
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
    Scene.current.add(skydome);

    // const skybox = new GroundProjectedSkybox(panoramaTexture);
    // skybox.scale.setScalar(1000);
    // Scene.current.add(skybox);

    Scene.current.environment = panoramaTexture;
    Render.current.outputEncoding = THREE.sRGBEncoding;
  };

  //#endregion

  //#region  handle functions

  const handleSelectChange = (e) => {
    //console.log('handleSelectChange e:', e);
    setSelectSpeed(e.target.value);
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
        HModelTrackNumbers.push(chorse.trackNumber);
      }
    }
  }, []);

  const handlePathCamera = (hNumModel) => {
    if (pathTerminusCamVector3.isUse) return;
    if (Camera.current && hNumModel && Controls.current) {
      CurrentLookAtHModel.current = hNumModel;
      Camera.current.position.copy(hNumModel.position);
      const hcv = HorseOffsetCamVector3.current;
      Camera.current.position.add(new THREE.Vector3(hcv.x, hcv.y, hcv.z));
      Camera.current.lookAt(hNumModel.position);

      // Camera2.current.position.copy(hNumModel.position);
      // Camera2.current.position.add(new THREE.Vector3(-20, 30, 2)); //相机2 增加相对与目标物体的位置偏移
      // Camera2.current.lookAt(0, 0, 0);

      Controls.current.target.copy(hNumModel.position);
      Controls.current.update();
      if (SpotLightModel.current) {
        SpotLightModel.current.position.set(hNumModel.position.x - 10, 20, hNumModel.position.z - 10);
        SpotLightModel.current.target = hNumModel;
      }
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
  /**
   *
   * @param animationType 动画列表索引  // run 正常跑; sprint 疾跑 ; stand 待机
   *
   */
  const handleHorseMansRunAction = () => {
    HorseManBaseAnimationMap.forEach((cAnimations, ckey) => {
      if (cAnimations && cAnimations.length >= 1) {
        const horseManRunMixers = [];
        HorseManRunModelObjs.forEach((obj) => {
          const cModel = obj.scene;
          const mixerLeftHorse = new THREE.AnimationMixer(cModel);
          const actionHorseRun = mixerLeftHorse.clipAction(cAnimations[0]);
          actionHorseRun.loop = THREE.LoopRepeat;
          let actDuration = 4;
          if (ckey === 'sprint') actDuration = 2;
          else if (ckey === 'stand') actDuration = 16;
          actionHorseRun.setDuration(actDuration);
          actionHorseRun.time = Math.random() * 2;
          actionHorseRun.play();
          //horseManRunActions.push(actionHorseRun);
          horseManRunMixers.push(mixerLeftHorse);
        });
        HorseManRunMixerMap.set(ckey, horseManRunMixers);
        //HorseManRunActionMap.set(ckey, horseManRunActions);
      }
    });
  };

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
      Controls.current.minDistance = 10;
      Controls.current.enabled = false;
      if (endCamera === Camera2.current) {
        Controls.current.enabled = true;
      }
      Controls.current.update();
    }, duration * 1000);
  };

  //#endregion

  //#region init renderScene

  // 渲染画面
  const renderScene = useCallback(() => {
    HorseManRunMixerMap.get(HorseManCurrentAnimationType.current)?.forEach((item) => {
      item.update(0.02);
    });
    if (HNumberModelMap.size > 0) {
      //pathCount.current < 1 只跑一圈
      if (pathCount.current < 1 && racePathPlay.current) {
        //每秒40帧 // 25= 1000/40
        if (performance.now() - lastTimestampMS.current >= 25) {
          lastTimestampMS.current = performance.now();
          if (pathIndex.current < aiRaceResult.current[0].speedData.length) {
            for (let index = 0; index < HNumberModelMap.size; index++) {
              const raceRes = aiRaceResult.current[index];
              const numModel = HNumberModelMap.get('number' + raceRes.trackNumber) as THREE.Object3D;
              if (numModel) {
                const path = raceRes.speedData[pathIndex.current];
                numModel.position.set(path.xa, path.ya, path.za);

                if (pathPlaySpeed.current === 1) {
                  if (pathIndex.current % segCount.current === 0) {
                    gsap.to([numModel.rotation], {
                      y: -Math.PI / 2 + path.r,
                      direction: segCount.current / 4 / 10,
                    });
                  }
                } else {
                  numModel.rotation.y = -Math.PI / 2 + path.r;
                }
                const hnbModel = HNumberBoardModelMap.get(raceRes.trackNumber + '');
                hnbModel && (hnbModel.rotation.y = -numModel.rotation.y);
                if (HModelTrackNumbers.includes(lookAtTrackNumber.current)) {
                  if (raceRes.trackNumber === lookAtTrackNumber.current) {
                    handlePathCamera(numModel);
                  }
                } else if (path.ranking === 1) {
                  handlePathCamera(numModel);
                }
              }
            }
            pathIndex.current++;
          } else {
            pathIndex.current = 0;
            pathCount.current++;
          }
        }
      } else {
        HorseManCurrentAnimationType.current = AnimationType.Stand;
      }
    }
    try {
      Render.current.render(Scene.current, ActiveCamera.current);
      ReqAFrameId.current = window.requestAnimationFrame(() => renderScene());
    } catch (error) {
      console.error('RenderScene Rendering Error:', error);
      alert('The scene loading is abnormal. Refresh the page and try again!');
      window.location.reload();
    }
  }, []);

  const init = useCallback(() => {
    loadManager.current = new THREE.LoadingManager();
    loadManager.current.onLoad = () => setLoaded(100);
    loadManager.current.onStart = (_, loaded, total) => setLoaded((loaded / total) * 100);
    loadManager.current.onProgress = (_, loaded, total) => {
      setLoaded((loaded / total) * 100);
    };

    Render.current = new THREE.WebGLRenderer({ antialias: true });
    Body.current.append(Render.current.domElement);
    Scene.current = new THREE.Scene();
    Camera.current = new THREE.PerspectiveCamera();
    Camera2.current = new THREE.PerspectiveCamera();
    ModelObjBoxGroup.current = new THREE.Group();

    hNumberBoardGeo.current = new THREE.CircleGeometry(0.2, 30);

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
    //   console.log('Camera position:', ActiveCamera.current.position);
    //   //renderScene();
    // });

    TrackArenaUtilInstance.current = new TrackArenaUtil(loadManager.current);

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

  const handleSceneBegin = useCallback(async () => {
    //console.log('handleSceneBegin init:', Date.now());
    (document.querySelector('.mg-door-text') as HTMLElement).style.opacity = '1';
    init();
    createLight();
    createSkydomeHdr();
    loaderGlgRaceArena();
    await loaderGlgModelAnimations();
    loaderCreateRacePath();
    renderScene();
    setView();
    if (Controls.current) {
      Controls.current.enabled = true;
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
    handleSceneBegin();
    return () => {
      handleSceneEnd();
    };
  }, []);

  useEffect(() => {
    if (loaded >= 100) {
      setTimeout(() => {
        loadingShow();
        renderScene();
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
      <div className=' flex items-center justify-center'>
        <select
          placeholder='倍速'
          onChange={handleSelectChange}
          className=' mx-2 my-1 w-14 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'>
          <option value='1'>1x</option>
          <option value='2'>2x</option>
          <option value='4'>4x</option>
          <option value='6'>6x</option>
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
            pathCount.current = 0;
          }}>
          Run
        </button>
        <button
          className=' mx-2 my-1 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'
          onClick={() => {
            HorseManCurrentAnimationType.current = AnimationType.Sprint;
          }}>
          Sprint
        </button>
        {HModelTrackNumbers.length > 0 &&
          HModelTrackNumbers.map((num, idx) => {
            return (
              <button
                key={idx}
                className=' mx-2 my-1 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'
                onClick={() => (lookAtTrackNumber.current = num)}>
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
      <div className=' flex items-center justify-center overflow-hidden' ref={Body}></div>
    </>
  );
}

export default forwardRef(TrackSantaArenaModel);
