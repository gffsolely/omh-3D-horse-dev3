// demo环境配置
// eslint-disable-next-line import/no-anonymous-default-export
export default {
  fileHost3d: process.env.NEXT_PUBLIC_3D_FILE_HOST || 'https://dkq0sb0nnrxd8.cloudfront.net',
  aiApiBaseHost: process.env.AI_API_BASE_HOST || 'https://development.omnihorse.io:7101/v1',
  aiApiBaseHostWS: process.env.AI_API_BASE_HOST_WS || 'wss://development.omnihorse.io:7101',
};
