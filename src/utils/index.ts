export const isPc = function () {
  return !window.navigator.userAgent.match(
    /(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i
  );
};

/**
 * 生成随机len位数字
 */
export const getRandomUUID = (len = 8) => {
  let random = '';
  random = Math.ceil(Math.random() * 100000000000000)
    .toString()
    .substring(0, Math.ceil(len / 2));
  random = Date.now() + random;
  return random.length <= len ? random : random.substring(random.length - len, random.length);
};
