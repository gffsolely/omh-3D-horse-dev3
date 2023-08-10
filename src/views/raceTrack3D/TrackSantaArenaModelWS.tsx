import gsap from 'gsap';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

//import { GroundProjectedSkybox } from 'three/examples/jsm/objects/GroundProjectedSkybox';
import { config } from '@/config';
import { isPc } from '@/utils';

import TrackArenaUtil, { getTextureByNumber, HorseEquipType, loadingHide, loadingShow } from './TrackArenaUtil';

function TrackSantaArenaModelWS({ raceDataInfo }, ref) {
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
  const HorseCamVector3 = useRef<THREE.Vector3>();
  const HorseRunMixers = useRef<THREE.AnimationMixer[]>([]).current;
  const HorseRunModelObjs = useRef([]).current;
  const HorseRunActions = useRef<THREE.AnimationAction[]>([]).current;

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
  const hModelIsRun = useRef(false);
  const lookAtTrackNumber = useRef(-1);
  const SpotLightModel = useRef<THREE.SpotLight>(null);

  const TrackArenaUtilInstance = useRef<TrackArenaUtil>(null);

  const [selectedActionIdx, setSelectedActionIdx] = useState(1);
  const BodyViewSize = useRef<{ w: number; h: number }>({
    w: 2560,
    h: 1550,
  }).current;
  const [bodyViewWH, setBodyViewWH] = useState({ w: 2560, h: 1550 });

  //#region fileHost3d
  const royalEsplanadeHdr = config.fileHost3d + '/omh-game/models/hdr/royal_esplanade_1k.hdr';
  const scene360Hdr = config.fileHost3d + '/omh-game/models/hdr/202308/08/HDR_Alien_4K.hdr';
  const horseRunBlackModel = config.fileHost3d + '/omh-game/models/model/202307/18/horse_digital_base_run.glb';
  const horseRaceArenaModel = config.fileHost3d + '/omh-game/models/model/202308/05/horse_race_arena_santa_v0.4.glb';

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
  //#endregion

  useImperativeHandle(ref, () => ({
    setRaceData,
    stopRace,
  }));

  //#region  useImperativeHandle funs

  const stopRace = () => {
    if (hModelIsRun.current) {
      hModelIsRun.current = false;
      HorseRunMixers.forEach((item) => {
        item.stopAllAction();
      });
    }
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

    const baseColorTextrue = TrackArenaUtilInstance.current.getDigitalHTexture(horseBaseTextrueUrl);
    const lightTextrue = TrackArenaUtilInstance.current.getDigitalHTexture(horseBaselightTextrueUrl);
    loader.load(horseRunBlackModel, (obj) => {
      //console.log('horseRunBlackModel  hNumber:', hNumber);
      const model = obj.scene;
      model.position.copy(hPosVec3);
      model.rotation.y = -Math.PI / 2 + r;
      model.name = 'horseRunBlackModel' + hNumber;
      model.castShadow = true;

      HorseRunModelObjs.push(obj);
      model.traverse(function (child: THREE.Mesh) {
        if (child.isObject3D) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
        if (child.isMesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (child.name === 'Horse' && baseColorTextrue) {
            mat.map = baseColorTextrue;
            mat.emissive = new THREE.Color(lightTextrue ? 0xffffff : 0x000000);
            mat.emissiveMap = lightTextrue;
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
      hMesh.position.set(0, 2.3, 0);
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
      if (HModelTrackNumbers.length === HorseRunModelObjs.length) {
        handleHorsesRunAction(1);
        handlePathCamera(model);
      }
    });
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
        }
      });

      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1200, 1200),
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
    Scene.current.add(skydome);

    // const skybox = new GroundProjectedSkybox(panoramaTexture);
    // skybox.scale.setScalar(1000);
    // Scene.current.add(skybox);

    Scene.current.environment = panoramaTexture;
    Render.current.outputEncoding = THREE.sRGBEncoding;
  };

  //#endregion

  //#region  handle functions

  const handlePathCamera = (hNumModel) => {
    if (Camera.current && hNumModel && Controls.current) {
      CurrentLookAtHModel.current = hNumModel;
      Camera.current.position.copy(hNumModel.position);
      const ccv = HorseCamVector3.current.clone();
      Camera.current.position.add(ccv);
      Camera.current.lookAt(hNumModel.position);
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
   * @param animationIdx 动画列表索引  //0 左转; 1 正常跑; 2 疾跑
   *
   */
  const handleHorsesRunAction = (animationIdx = 1) => {
    HorseRunMixers.length = 0;
    HorseRunActions.length = 0;
    HorseRunModelObjs.forEach((obj) => {
      const cAnimations = obj.animations;
      const cModel = obj.scene;
      if (cAnimations && cAnimations.length >= 3) {
        setSelectedActionIdx(animationIdx);
        const mixerLeftHorse = new THREE.AnimationMixer(cModel);
        const actionHorseRun = mixerLeftHorse.clipAction(cAnimations[animationIdx]);
        actionHorseRun.loop = THREE.LoopRepeat;
        actionHorseRun.setDuration(animationIdx === 1 ? 4 : 2);
        actionHorseRun.play();
        HorseRunActions.push(actionHorseRun);
        HorseRunMixers.push(mixerLeftHorse);
      }
    });
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

  // 渲染画面
  const renderScene = useCallback(() => {
    hModelIsRun.current &&
      HorseRunMixers.forEach((item) => {
        item.update(0.02);
      });
    if (HNumberModelMap.size > 0) {
      //pathCount.current < 1 只跑一圈
      if (aiRaceResult.current && aiRaceResult.current.length > 0) {
        hModelIsRun.current = true;
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
                numModel.rotation.y = -Math.PI / 2 + path.r;
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
            pagePathIndex.current++;
          }
        }
      }
    }
    ReqAFrameId.current = window.requestAnimationFrame(() => renderScene());
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
    Body.current.append(Render.current.domElement);
    Scene.current = new THREE.Scene();
    Camera.current = new THREE.PerspectiveCamera();
    Camera2.current = new THREE.PerspectiveCamera();
    ModelObjBoxGroup.current = new THREE.Group();

    HorseCamVector3.current = new THREE.Vector3(4, 4, 10); //基础相机位置
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
    Camera.current.position.set(-450, 50, 50);
    Camera.current.lookAt(0, 0, 0);

    Camera2.current.fov = 45;
    Camera2.current.near = 0.1;
    Camera2.current.far = 1000;
    Camera2.current.position.set(0, 50, -100); //8 120 -180
    //Camera2.current.position.add(new THREE.Vector3(100, 170, 130));
    Camera2.current.lookAt(0, 0, 0);

    ActiveCamera.current = Camera.current;
    Controls.current = new OrbitControls(ActiveCamera.current, Render.current.domElement);
    Controls.current.target.copy(new THREE.Vector3(-300, 0, 60));
    Controls.current.enabled = false;

    TrackArenaUtilInstance.current = new TrackArenaUtil(loadManager.current);

    const loader = new GLTFLoader(loadManager.current);
    //预加载
    loader.load(horseRunBlackModel, () => {
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
    loaderGlgRaceArena();
    renderScene();
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
        {/* <button
          className=' mx-2 my-1 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'
          onClick={() => {
            racePathPlay.current = true;
            pathCount.current = 0;
            handleHorsesRunAction(1);
          }}>
          Run
        </button> */}
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
      </div>
      <div className=' flex items-center justify-center overflow-hidden' ref={Body}></div>
    </>
  );
}

export default forwardRef(TrackSantaArenaModelWS);
