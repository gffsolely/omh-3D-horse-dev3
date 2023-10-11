import { useCallback, useEffect, useRef, useState } from 'react';

export default function HorseModel() {
  const [loaded, setLoaded] = useState(0);
  const Body = useRef<any>();
  const ReqAFrameId = useRef(0);

  const BodyViewSize = useRef<{ w: number; h: number }>({
    w: 1920,
    h: 1080,
  }).current;
  const [bodyViewWH, setBodyViewWH] = useState(BodyViewSize);

  const [isMounted, setIsMounted] = useState(false);
  const [gpuCardInfo, setGpuCardInfo] = useState({ brand: '', card: '', cardVersion: '', integrated: false });
  const [screenInfo, setScreenInfo] = useState({ width: 0, height: 0, pixelRatio: 1 });
  const [currentFps, setCurrentFps] = useState(0);

  const init = useCallback(() => {
    const canvas = document.createElement('canvas');
    Body.current.append(canvas);
    if (canvas) {
      const extractValue = (reg, str) => {
        const matches = str.match(reg);
        return matches && matches[0];
      };
      const gl = canvas.getContext('webgl');
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

      const layer = extractValue(/(ANGLE)/g, renderer);
      //const sss = 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3050 Ti Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)';
      const card = extractValue(/((NVIDIA|AMD|Intel)[^\d]*[^\s]+)/, renderer);
      console.log('cardcard:', card);
      const tokens = card.split(' ');
      tokens.shift();

      const manufacturer = extractValue(/(NVIDIA|AMD|Intel)/g, card);
      const cardVersion = tokens.pop();
      const brand = tokens.join(' ');
      const integrated = manufacturer === 'Intel';

      console.log('gpuCardInfo:', {
        card,
        manufacturer,
        cardVersion,
        brand,
        integrated,
        vendor,
        renderer,
      });
      setGpuCardInfo({ brand, card, cardVersion, integrated });

      const screenWidth = window.screen.width; // 屏幕宽度
      const screenHeight = window.screen.height; // 屏幕高度

      console.log(`屏幕宽度：${screenWidth}px`);
      console.log(`屏幕高度：${screenHeight}px`);
      console.log(`屏幕像素比：${window.devicePixelRatio}`);
      setScreenInfo({ width: screenWidth, height: screenHeight, pixelRatio: window.devicePixelRatio });
    }
  }, []);

  const fps = useRef(0);
  const lastCalledTime = useRef(performance.now());
  const fps2 = useRef(0);
  const lastCalledTime2 = useRef(performance.now());
  // let fps = 0;
  // let lastCalledTime = performance.now();
  // let fps2 = 0;
  // let lastCalledTime2 = performance.now();

  // 渲染画面
  const renderScene = useCallback(() => {
    const delta = (performance.now() - lastCalledTime.current) / 1000;
    fps.current = Math.round(1 / delta);
    lastCalledTime.current = performance.now();
    //console.log(fps.current + ' fps');
    fps2.current++;
    if (performance.now() - lastCalledTime2.current >= 1000) {
      lastCalledTime2.current = performance.now();
      //console.log(fps2.current + ' fps2-------------');
      setCurrentFps(fps2.current);
      fps2.current = 0;
    }
    ReqAFrameId.current = window.requestAnimationFrame(() => renderScene());
  }, []);

  const setView = () => {
    viewSizeCalc();
  };
  const viewSizeCalc = function () {
    const clientWidth = document.documentElement.clientWidth;
    const clientHeight = document.documentElement.clientHeight;

    const needH = (clientWidth * 9) / 16;
    const needW = (clientHeight * 16) / 9;

    let useW = 0;
    let useH = 0;
    if (needH > clientHeight) {
      useW = needW;
      useH = clientHeight;
    }
    if (needW > clientWidth) {
      useW = clientWidth;
      useH = needH;
    }

    if (useW > 300) {
      const remsize = (useW / 2560) * 16;
      document.documentElement.style.fontSize = (remsize > 26 ? 26 : remsize) + 'px';
    } else {
      document.documentElement.style.fontSize = '5px';
    }
    BodyViewSize.w = useW;
    BodyViewSize.h = useH;
    setBodyViewWH({ w: useW, h: useH });
  };

  const handleExport = () => {
    const msgTxtSz = ['提取需求中的内容，并能制作对应的数据表格', '叶朵朵等烦了。| |14|物品|旁白|黑色蕾丝裙的小肩'];
    const link = document.createElement('a');
    link.download = 'aaajson-file.jsonl';
    link.href = 'data:text/plain,' + msgTxtSz.join('\n');
    link.click();
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);
  useEffect(() => {
    if (isMounted) {
      init();

      renderScene();
      setView();
      window.addEventListener('resize', setView);
    }

    return () => {
      //
    };
  }, [isMounted]);

  useEffect(() => {
    if (loaded >= 100) {
      setTimeout(() => {
        //loadingShow();
      }, 500);
    }
  }, [loaded]);

  return (
    <div className=' h-full w-full bg-black'>
      {isMounted && (
        <div className=' relative mx-auto pt-20 ' style={{ width: bodyViewWH.w, height: bodyViewWH.h }}>
          <button className=' text-lg  text-white ' onClick={handleExport}>
            导出
          </button>
          <div className=' mx-auto  w-3/4 border border-[#FFFFFF33] bg-[#00000099]  py-2 text-white'>
            <ul role='list' className='h-full w-full'>
              <li className='flex justify-start px-4  py-6 transition '>
                <div className='w-1/4'>
                  <span className=' text-[2.75rem]'>GPU信息</span>
                </div>
              </li>
              <li className='flex justify-start px-4  py-6 transition '>
                <div className='w-1/4'>
                  <span className=' text-[2.75rem]'>品牌</span>
                </div>
                <div className=' ml-2 text-[2.5rem]'>{gpuCardInfo.brand}</div>
              </li>
              <li className='flex justify-start px-4  py-6 transition '>
                <div className='w-1/4'>
                  <span className=' text-[2.75rem]'>型号</span>
                </div>
                <div className=' ml-2 text-[2.5rem]'>{gpuCardInfo.card}</div>
              </li>
              <li className='flex justify-start px-4  py-6 transition '>
                <div className='w-1/4'>
                  <span className=' text-[2.75rem]'>版本</span>
                </div>
                <div className=' ml-2 text-[2.5rem]'>{gpuCardInfo.cardVersion}</div>
              </li>
              <li className='flex justify-start px-4  py-6 transition '>
                <div className='w-1/4'>
                  <span className=' text-[2.75rem]'>集成显卡</span>
                </div>
                <div className=' ml-2 text-[2.5rem]'>{gpuCardInfo.integrated + ''}</div>
              </li>
            </ul>
            <ul role='list' className='mt-10 h-full w-full'>
              <li className='flex justify-start px-4  py-6 transition '>
                <div className='w-1/4'>
                  <span className=' text-[2.75rem]'>屏幕信息</span>
                </div>
              </li>
              <li className='flex justify-start px-4  py-6 transition '>
                <div className='w-1/4'>
                  <span className=' text-[2.75rem]'>宽</span>
                </div>
                <div className=' ml-2 text-[2.5rem]'>{screenInfo.width}</div>
              </li>
              <li className='flex justify-start px-4  py-6 transition '>
                <div className='w-1/4'>
                  <span className=' text-[2.75rem]'>宽</span>
                </div>
                <div className=' ml-2 text-[2.5rem]'>{screenInfo.height}</div>
              </li>
              <li className='flex justify-start px-4  py-6 transition '>
                <div className='w-1/4'>
                  <span className=' text-[2.75rem]'>像素比例</span>
                </div>
                <div className=' ml-2 text-[2.5rem]'>{screenInfo.pixelRatio} (物理像素 / 屏幕像素)</div>
              </li>
              <li className='flex justify-start px-4  py-6 transition '>
                <div className='w-1/4'>
                  <span className=' text-[2.75rem]'>帧率</span>
                </div>
                <div className=' ml-2 text-[2.5rem]'>{currentFps}(空闲状态时的值)</div>
              </li>
            </ul>
          </div>

          <div className=' flex items-center justify-center overflow-hidden' ref={Body}></div>
        </div>
      )}
    </div>
  );
}
