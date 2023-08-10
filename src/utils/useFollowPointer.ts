import { useState, RefObject, useEffect } from "react";

export function useFollowPointer(ref: RefObject<HTMLElement>) {
  const [point, setPoint] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const handlePointerMove = ({ clientX, clientY }: MouseEvent) => {
      const element = ref.current!;
      const x = clientX - element.offsetLeft - element.offsetWidth / 2;
      const y = clientY - element.offsetTop - element.offsetHeight / 2;
      // const x = clientX - element.offsetWidth / 2;
      // const y = clientY - element.offsetHeight / 2;
      // console.log('handlePointerMove clientX {x,y}:', { x: clientX, y: clientY })
      // console.log('element w h :', { w: element.offsetWidth, h: element.offsetHeight })
      // console.log('element offsetLeft {x,y}  :', { x: element.offsetLeft, y: element.offsetTop })
      // console.log('element elementX {x,y}:', { x, y })
      setPoint({ x, y });
    };

    window.addEventListener("pointermove", handlePointerMove);

    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return point;
}