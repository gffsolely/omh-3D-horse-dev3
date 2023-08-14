import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

import { config } from '@/config';
import { isPc } from '@/utils';

import reacPathAI from '~/models/json/rece-standard-6horse.json';
function HorseModel() {
  const [loaded, setLoaded] = useState(0);
  const loadManager = useRef<THREE.LoadingManager>();
  const Body = useRef<any>();
  const Scene = useRef<THREE.Scene>(); // 场景
  const Camera = useRef<THREE.PerspectiveCamera>(); // 透视相机
  const Camera2 = useRef<THREE.PerspectiveCamera>();
  const ActiveCamera = useRef<THREE.PerspectiveCamera>();
  const Render = useRef<THREE.WebGLRenderer>(); // 渲染器
  const Controls = useRef<OrbitControls>();
  const Meshs = useRef<THREE.Object3D[]>([]).current; //物品列表
  const ReqAFrameId = useRef(0);
  const ModelObjHorse = useRef<THREE.Object3D>();
  const ModelObjBoxGroup = useRef<THREE.Group>();
  const HorseCamVector3 = useRef<THREE.Vector3>();
  const HorseRunHorseModel = useRef(null);
  const HorseRunMixers = useRef<THREE.AnimationMixer[]>([]).current;
  const HorseRunModelObjs = useRef([]).current;
  const HorseRunActions = useRef<THREE.AnimationAction[]>([]).current;

  const HorseNumberMap = useRef<Map<string, THREE.Object3D>>(new Map()).current;
  const segCount = useRef(20); //每秒40帧 //把每0.5秒的点继续分割 20 // 0.1秒分割4
  const aiRaceResult = useRef([]);
  const pathIndex = useRef(0);
  const pathLength = useRef(1);
  const pathCount = useRef(0);
  const lastTimestampMS = useRef(0);
  const racePathPlay = useRef(false);
  const raceHorseCount = useRef(12);
  const pathPlaySpeed = useRef(4); //曲线播放速度 //1 1倍速，2 2倍速,...
  const hNumberBoardGeo = useRef<THREE.CircleGeometry>(null);
  const hModelIsRun = useRef(false);
  const lookAtTrackNumber = useRef(-1);
  const hModelTrackNumbers = useRef([]).current;

  const [selectedActionIdx, setSelectedActionIdx] = useState(1);
  const BodyViewSize = useRef<{ w: number; h: number }>({
    w: 2560,
    h: 1550,
  }).current;
  const [bodyViewWH, setBodyViewWH] = useState({ w: 2560, h: 1550 });

  // saddle;2马鞍; // stirrup; 3马镫; // rein; 1缰绳; // saddlePad 4鞍垫
  enum HorseEquipType {
    Rein = 1,
    Saddle = 2,
    Stirrup = 3,
    SaddlePad = 4,
  }

  //#region fileHost3d
  const royalEsplanadeHdr = config.fileHost3d + '/omh-game/models/hdr/royal_esplanade_1k.hdr';
  const horseRunBlackModel = config.fileHost3d + '/omh-game/models/model/202307/18/horse_digital_base_run.glb';
  const horseRaceArenaModel = config.fileHost3d + '/omh-game/models/model/202306/14/horse_race_arena.glb';

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

  //#region loaderGlgModel

  const loaderGlgModel = useCallback((hNumber = '1', r = 0, hPosVec3: THREE.Vector3) => {
    const loader = new GLTFLoader(loadManager.current);

    const baseColorTextrue = getDigitalHTexture(horseBaseTextrueUrl);
    const lightTextrue = getDigitalHTexture(horseBaselightTextrueUrl);
    loader.load(horseRunBlackModel, (obj) => {
      // console.log('horseRunBlackModel  hNumber:', hNumber, obj);
      const model = obj.scene;
      model.position.copy(hPosVec3);
      model.rotation.y = Math.PI / 2 + r;
      model.name = 'horseRunBlackModel' + hNumber;
      model.castShadow = true;

      HorseRunModelObjs.push(obj);
      HorseNumberMap.set('number' + hNumber, model);
      model.traverse(function (child: any) {
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
          child.material.needsUpdate = true;
        }
      });

      const hTexture = getTextureByNumber(hNumber);
      const hMesh = new THREE.Mesh(
        hNumberBoardGeo.current,
        new THREE.MeshBasicMaterial({ map: hTexture, side: THREE.DoubleSide })
      );
      hMesh.position.set(0, 2.3, 0);
      hMesh.rotation.y = -model.rotation.y;
      hMesh.name = 'horseNumberBoard' + hNumber;
      model.add(hMesh);

      setHorseEquipTexture(
        { type: HorseEquipType.Saddle, baseTextrueUrl: horseEquipSaddle_R, lightTextrueUrl: horseEquipSaddleLED_R },
        model
      );
      setHorseEquipTexture(
        { type: HorseEquipType.Rein, baseTextrueUrl: horseEquipRein_R, lightTextrueUrl: null },
        model
      );
      setHorseEquipTexture(
        { type: HorseEquipType.SaddlePad, baseTextrueUrl: horseEquipSweatpad_R, lightTextrueUrl: null },
        model
      );
      setHorseEquipTexture(
        { type: HorseEquipType.Stirrup, baseTextrueUrl: horseEquipStirrup_R, lightTextrueUrl: null },
        model
      );
      Scene.current.add(model);
      //全部马模型加载完成
      if (hModelTrackNumbers.length === HorseRunModelObjs.length) {
        handleHorsesRunAction(1);
        Camera.current.position.copy(model.position);
        const ccv = HorseCamVector3.current.clone(); //new THREE.Vector3(HorseCamVector3.current.x, HorseCamVector3.current.y, HorseCamVector3.current.z);
        Camera.current.position.add(ccv);
        Camera.current.lookAt(model.position);
        if (Controls.current) {
          Controls.current.target.copy(model.position);
          Controls.current.update();
        }
      }
    });
  }, []);

  const loaderGlgRaceArena = useCallback(() => {
    const loader = new GLTFLoader(loadManager.current);
    loader.load(horseRaceArenaModel, (obj) => {
      //console.log('horseRaceArenaModel  obj:', obj);
      const model = obj.scene;
      //model.scale.set(0.6, 0.6, 0.6);
      model.position.set(0, 0, 0);
      //model.rotation.y = Math.PI;
      model.name = 'horseRaceArenaModel';
      model.castShadow = true;
      model.receiveShadow = true;
      model.traverse(function (child: any) {
        if (child.isObject3D) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
        if (child.isMesh) {
          if (child.name === 'Plane_Water001') {
            //child.visible = false;
            child.position.y = 0.2;
            //console.log('child', child);
          }
          if (child.name === 'side') {
            //child.visible = false;  //transparent  opacity
            child.material.transparent = true;
            child.material.opacity = 0.5;
            //console.log('child', child);
          }
          child.material.needsUpdate = true;
        }
      });
      Scene.current.add(model);
    });
  }, []);

  /** 初始化灯光 */
  const createLight = useCallback(() => {
    // const ambientLight = new THREE.AmbientLight('#ffffff', 3);
    // Scene.current.add(ambientLight);
    const derlight = new THREE.DirectionalLight(0xffffff, 2);
    derlight.position.set(0, 200, -200); // 光照位置
    derlight.target.position.set(0, 0, 0); // 光照方向
    derlight.castShadow = true;
    Scene.current.add(derlight);
  }, []);

  //#endregion

  //#region  handle functions

  const loaderCreateRacePath = useCallback(() => {
    const raceDataInfo = reacPathAI.data.gameRaceInfo;
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
            const cxaPre = pathPre.xa;
            const cyaPre = -pathPre.ya * 0.9;
            const path = chorse.speedData[index2];
            const cxa = path.xa;
            const cya = -path.ya * 0.9;
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

      aiRaceResult.current = resHorsePaths;
      pathLength.current = resHorsePaths[0].speedData.length;
      //const rds = BoxViewSize.w < 600 ? 2 : 5;
      for (let index = 0; index < raceRes.length; index++) {
        //当前赛道最多支持12匹马
        if (index < 12) {
          const chorse = aiRaceResult.current[index];
          const path = chorse.speedData[0];
          loaderGlgModel(chorse.trackNumber + '', path.r, new THREE.Vector3(path.xa, path.ya, path.za));
          hModelTrackNumbers.push(chorse.trackNumber);
        }
      }
    }
  }, []);

  const handlePathCamera = (hNumModel) => {
    if (Camera.current && hNumModel && Controls.current) {
      ModelObjHorse.current = hNumModel;
      Camera.current.position.copy(hNumModel.position);
      const ccv = HorseCamVector3.current.clone();
      Camera.current.position.add(ccv);
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

  const setHorseEquipTexture = (modelObj, modelDHorse) => {
    const baseColorTextrue = getDigitalHTexture(modelObj.baseTextrueUrl);
    const lightTextrue = getDigitalHTexture(modelObj.lightTextrueUrl);
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
  };
  const getDigitalHTexture = (textureUrl) => {
    if (textureUrl && textureUrl.length > 0) {
      const texture = new THREE.TextureLoader(loadManager.current).load(textureUrl);
      texture.encoding = THREE.sRGBEncoding;
      texture.flipY = false;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
    }
    return null;
  };

  const getTextureByNumber = (hNumber) => {
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

  const getTrackColor = (value) => {
    const valueStr = value.toString();
    if (valueStr === '1') {
      return '#FF3831';
    } else if (valueStr === '2') {
      return '#FF8A1B';
    } else if (valueStr === '3') {
      return '#FFE81D';
    } else if (valueStr === '4') {
      return '#21E084';
    } else if (valueStr === '5') {
      return '#24439E';
    } else if (valueStr === '6') {
      return '#12C4FF';
    } else if (valueStr === '7') {
      return '#5F32BE';
    } else if (valueStr === '8') {
      return '#901F1F';
    } else if (valueStr === '9') {
      return '#B1AE04';
    } else if (valueStr === '10') {
      return '#E85B8D';
    } else if (valueStr === '11') {
      return '#CB90E1';
    } else if (valueStr === '12') {
      return '#005FFF';
    } else {
      return '#ff0000';
    }
  };

  // function handlePauseAnimation() {
  //   HorseRunActions.forEach((action) => {
  //     gsap.to(action, {
  //       timeScale: 0,
  //       duration: 3,
  //       onComplete: () => {
  //         action.stop();
  //         hModelIsRun.current = false;
  //       },
  //     });
  //   });
  // }

  // 切换相机
  const animateCameraTransition = (startCamera, endCamera) => {
    const startPos = startCamera.position.clone();
    const endPos = endCamera.position.clone();
    console.log('startPosstartPos11 :', startPos, endPos);
    const duration = 1;
    const ease = 'power4.inOut';
    gsap.to(startCamera.position, {
      duration,
      ease,
      x: endPos.x,
      y: endPos.y,
      z: endPos.z,
      onComplete: () => {
        loadingShow();
        ActiveCamera.current = endCamera;
        startCamera.position.copy(startPos);
        Controls.current = new OrbitControls(ActiveCamera.current, Render.current.domElement);
        if (Controls.current) {
          ModelObjHorse.current && Controls.current.target.copy(ModelObjHorse.current.position);
          Controls.current.update();
        }
      },
    });
  };

  //#endregion

  //#region init renderScene

  // 渲染画面
  const renderScene = useCallback(() => {
    if (HorseNumberMap.size > 0) {
      //pathCount.current < 1 只跑一圈
      if (pathCount.current < 1 && racePathPlay.current) {
        hModelIsRun.current = true;
        //每秒40帧 // 25= 1000/40
        if (performance.now() - lastTimestampMS.current >= 25) {
          lastTimestampMS.current = performance.now();
          if (pathIndex.current < aiRaceResult.current[0].speedData.length) {
            for (let index = 0; index < HorseNumberMap.size; index++) {
              const raceRes = aiRaceResult.current[index];
              const numModel = HorseNumberMap.get('number' + raceRes.trackNumber) as THREE.Object3D;
              if (numModel) {
                const path = raceRes.speedData[pathIndex.current];
                numModel.position.set(path.xa, path.ya, path.za);
                numModel.rotation.y = Math.PI / 2 + path.r;
                const hnbModel = Scene.current.getObjectByName('horseNumberBoard' + raceRes.trackNumber);
                hnbModel && (hnbModel.rotation.y = -numModel.rotation.y);
                if (hModelTrackNumbers.includes(lookAtTrackNumber.current)) {
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
        if (hModelIsRun.current) {
          hModelIsRun.current = false;
          //handlePauseAnimation();
          HorseRunMixers.forEach((item) => {
            item.stopAllAction();
          });
        }
      }
    }
    ReqAFrameId.current = window.requestAnimationFrame(() => renderScene());
    Render.current.render(Scene.current, ActiveCamera.current);
    hModelIsRun.current &&
      HorseRunMixers.forEach((item) => {
        item.update(0.02);
      });
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

    HorseCamVector3.current = new THREE.Vector3(4, 4, 14); //基础相机位置
    hNumberBoardGeo.current = new THREE.CircleGeometry(0.2, 20);

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
    Camera.current.far = 1000;
    Camera.current.position.set(0, 10, 300);
    Camera.current.lookAt(0, 0, 0);

    Camera2.current.fov = 45;
    Camera2.current.near = 0.1;
    Camera2.current.far = 1000;
    Camera2.current.position.set(0, 70, -130); //8 120 -180
    //Camera2.current.position.add(new THREE.Vector3(100, 170, 130));
    Camera2.current.lookAt(0, 0, 0);

    ActiveCamera.current = Camera.current;
    Controls.current = new OrbitControls(ActiveCamera.current, Render.current.domElement);
    Controls.current.enabled = false;
    // Controls.current.addEventListener('change', () => {
    //   // if (ActiveCamera.current === Camera.current) {
    //   //   HorseCamVector3.current.copy(ActiveCamera.current.position);
    //   // }
    //   //console.log('Camera position:', ActiveCamera.current.position);
    //   //renderScene();
    // });

    new RGBELoader(loadManager.current).load(royalEsplanadeHdr, (hdrTexture) => {
      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
      Scene.current.environment = hdrTexture;
      Render.current.outputEncoding = THREE.sRGBEncoding;
    });

    document.addEventListener('keydown', function (event) {
      if (event.code === 'KeyC') {
        handleSwitchCamera();
      }
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

    // const needH = (clientWidth * 9) / 16;
    // const needW = (clientHeight * 16) / 9;
    // let useW = 0;
    // let useH = 0;
    // if (needH >= clientHeight) {
    //   useW = needW;
    //   useH = clientHeight;
    // }
    // if (needW >= clientWidth) {
    //   useW = clientWidth;
    //   useH = needH;
    // }
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
    (document.querySelector('.mg-door-text') as HTMLElement).style.opacity = '1';
    init();
    createLight();
    loaderGlgRaceArena();
    loaderCreateRacePath();
    renderScene();
    setView();
    if (Controls.current) {
      Controls.current.enabled = true;
      // Controls.current.maxAzimuthAngle = Math.PI / 4;
      // Controls.current.minAzimuthAngle = -Math.PI / 5;
      // Controls.current.maxPolarAngle = Math.PI / 2;
      // Controls.current.minPolarAngle = Math.PI / 2.6;
      // Controls.current.maxDistance = 5;
      // Controls.current.minDistance = 2;
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

  const loadingHide = (onComplete = null) => {
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
  const loadingShow = (onComplete = null) => {
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
  return (
    <>
      <div className='mg-door-box absolute left-0 top-0 z-20 flex h-full w-full items-center justify-center  '>
        <div className='mg-door-top  absolute left-0 top-0  h-1/2 w-full bg-[rgba(0,0,0,1)]'></div>
        <div className='mg-door-button absolute bottom-0 left-0  h-1/2 w-full bg-[rgba(0,0,0,1)]'></div>
        <span className='mg-door-text static z-10 text-[1rem] text-white'>{loaded.toFixed(2)}%</span>
      </div>
      <div className=' flex items-center justify-center'>
        <button
          className=' mx-2 my-1 rounded bg-blue-400 px-2 py-1 text-base text-white shadow shadow-blue-200'
          onClick={() => {
            racePathPlay.current = true;
            pathCount.current = 0;
            handleHorsesRunAction(1);
          }}>
          Run
        </button>
        {hModelTrackNumbers.length > 0 &&
          hModelTrackNumbers.map((num, idx) => {
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

export default function HorseBase() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  return (
    <div className='mg-main relative h-full w-full  cursor-pointer bg-[#666]'>{isMounted ? <HorseModel /> : null}</div>
  );
}
