export default function Rem() {
  const recalc = function () {
    const clientWidth = document.documentElement.clientWidth;
    const clientHeight = document.documentElement.clientHeight;

    const needH = (clientWidth * 9) / 16;
    const needW = (clientHeight * 16) / 9;

    let useW = 0;
    let useH = 0;
    if (needH >= clientHeight) {
      useW = needW;
      useH = clientHeight;
    }
    if (needW >= clientWidth) {
      useW = clientWidth;
      useH = needH;
    }

    if (useW > 300) {
      const remsize = (useW / 1920) * 16;
      document.documentElement.style.fontSize = (remsize > 26 ? 26 : remsize) + 'px';
    } else {
      document.documentElement.style.fontSize = '13px';
    }
    document.body.style.height = useH + 'px';
    document.body.style.width = useW + 'px';
  };
  recalc();
  (function (doc, win) {
    const resizeEvt = 'orientationchange' in window ? 'orientationchange' : 'resize';
    if (!doc.addEventListener) return;
    win.addEventListener(resizeEvt, recalc, false);
    doc.addEventListener('DOMContentLoaded', recalc, false);
  })(document, window);
}
