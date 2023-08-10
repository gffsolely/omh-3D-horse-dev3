import dev from './dev';
import demo from './prod';

const envConfigs = {
  dev,
  demo,
};
export const curEnv = process.env.NEXT_PUBLIC_ENV || 'dev';
export const __VERSION__ = 1.1;
export const config = {
  ...envConfigs[curEnv],
  curEnv,
};
//console.log('global config:', { config });
