import { Howl, Howler } from 'howler';

import { config } from '@/config';

interface SoundPlayer {
  name: string;
  fileName: string;
  sound: Howl;
  loop: boolean;
  duration?: number;
  audioStatus?: string;
}

export enum SoundNameType {
  countdown1 = 'countdown1',
  countdown2 = 'countdown2',
  countdown3 = 'countdown3',
  countdownGo = 'countdownGo',
  countdownReady = 'countdownReady',
  crossingFinishLine = 'crossingFinishLine',
  crowdCheersBeyond = 'crowdCheersBeyond',
  crowdCheersFinish = 'crowdCheersFinish',
  crowdCheersFinished = 'crowdCheersFinished',
  crowdCheersFinishAfter = 'crowdCheersFinishAfter',
  crowdCheersFinishNear = 'crowdCheersFinishNear',
  hoovesFewLoop = 'hoovesFewLoop',
  hoovesGroupLoop = 'hoovesGroupLoop',
  hoovesSingleLoop = 'hoovesSingleLoop',
  openingCrowdEnv = 'openingCrowdEnv',
  openingHorse = 'openingHorse',
  openingHorse2 = 'openingHorse2',
  skillsOvertake = 'skillsOvertake',
  skillsSprint = 'skillsSprint',
  skillsWhip = 'skillsWhip',
  startGameRingtone = 'startGameRingtone',
  throughoutCrowdEnvSoundLoop = 'throughoutCrowdEnvSoundLoop',
  throughoutWindSoundLoop = 'throughoutWindSoundLoop',
}

class TrackArenaSoundUtil {
  private static instance: TrackArenaSoundUtil;
  public static getInstance() {
    if (!TrackArenaSoundUtil.instance) {
      TrackArenaSoundUtil.instance = new TrackArenaSoundUtil();
    }
    return TrackArenaSoundUtil.instance;
  }

  private baseSoundUrl = config.fileHost3d + '/omh-game/models/sound/202309/08/race_v0.1/';
  private soundPlayerList: SoundPlayer[] = [
    { name: 'countdown1', fileName: 'countdown_1.mp3', sound: null, loop: false },
    { name: 'countdown2', fileName: 'countdown_2.mp3', sound: null, loop: false },
    { name: 'countdown3', fileName: 'countdown_3.mp3', sound: null, loop: false },
    { name: 'countdownGo', fileName: 'countdown_go.mp3', sound: null, loop: false },
    { name: 'countdownReady', fileName: 'countdown_ready.mp3', sound: null, loop: false },
    { name: 'crossingFinishLine ', fileName: 'crossing_finish_line .mp3', sound: null, loop: false },
    { name: 'crowdCheersBeyond', fileName: 'crowd_cheers_beyond.mp3', sound: null, loop: false },
    { name: 'crowdCheersFinish', fileName: 'crowd_cheers_finish.mp3', sound: null, loop: false },
    { name: 'crowdCheersFinished', fileName: 'crowd_cheers_finished.mp3', sound: null, loop: false },
    { name: 'crowdCheersFinishAfter', fileName: 'crowd_cheers_finish_after.mp3', sound: null, loop: false },
    { name: 'crowdCheersFinishNear', fileName: 'crowd_cheers_finish_near.mp3', sound: null, loop: false },
    { name: 'hoovesFewLoop', fileName: 'hooves_few_loop.mp3', sound: null, loop: true },
    { name: 'hoovesGroupLoop', fileName: 'hooves_group_loop.mp3', sound: null, loop: true },
    { name: 'hoovesSingleLoop', fileName: 'hooves_single_loop.mp3', sound: null, loop: true },
    { name: 'openingCrowdEnv', fileName: 'opening_crowd_env.mp3', sound: null, loop: false },
    { name: 'openingHorse', fileName: 'opening_horse.mp3', sound: null, loop: false },
    { name: 'openingHorse2', fileName: 'opening_horse2.mp3', sound: null, loop: false },
    { name: 'skillsOvertake', fileName: 'skills_overtake.mp3', sound: null, loop: false },
    { name: 'skillsSprint', fileName: 'skills_sprint.mp3', sound: null, loop: false },
    { name: 'skillsWhip', fileName: 'skills_whip.mp3', sound: null, loop: false },
    { name: 'startGameRingtone', fileName: 'start_game_ringtone.mp3', sound: null, loop: false },
    { name: 'throughoutCrowdEnvSoundLoop', fileName: 'throughout_crowd_env_sound_loop.mp3', sound: null, loop: true },
    { name: 'throughoutWindSoundLoop', fileName: 'throughout_wind_sound_loop.mp3', sound: null, loop: true },
  ];
  private soundPlayerMap: Map<string, SoundPlayer> = new Map();

  /** 倒数-1 */
  public countdown1: SoundPlayer = null;
  public countdown2: SoundPlayer = null;
  public countdown3: SoundPlayer = null;
  public countdownGo: SoundPlayer = null;
  public countdownReady: SoundPlayer = null;
  /** 冲过终点线BGM */
  public crossingFinishLine: SoundPlayer = null;
  /** 观众欢呼-超越 */
  public crowdCheersBeyond: SoundPlayer = null;
  /** 观众欢呼-冲过终点线 */
  public crowdCheersFinish: SoundPlayer = null;
  /** 观众欢呼-冲过终点线后 */
  public crowdCheersFinished: SoundPlayer = null;
  /** 观众欢呼-临近终点 */
  public crowdCheersFinishAfter: SoundPlayer = null;
  /** 观众掌声-即将冲线 */
  public crowdCheersFinishNear: SoundPlayer = null;
  /** 马蹄声-少量马-循环 */
  public hoovesFewLoop: SoundPlayer = null;
  public hoovesGroupLoop: SoundPlayer = null;
  /** 马蹄声-单匹马-循环 */
  public hoovesSingleLoop: SoundPlayer = null;
  /** 开场观众环境 */
  public openingCrowdEnv: SoundPlayer = null;
  /** 开场-马 */
  public openingHorse: SoundPlayer = null;
  public openingHorse2: SoundPlayer = null;
  public skillsOvertake: SoundPlayer = null;
  /** 技能-冲刺 */
  public skillsSprint: SoundPlayer = null;
  /** 技能-挥鞭 */
  public skillsWhip: SoundPlayer = null;
  /** 开始比赛铃声 */
  public startGameRingtone: SoundPlayer = null;
  /** 整场比赛观众环境音-循环 */
  public throughoutCrowdEnvSoundLoop: SoundPlayer = null;
  /** 整场比赛跑起来的风声-循环 */
  public throughoutWindSoundLoop: SoundPlayer = null;

  private currentloadCount = 0;
  private isLoadCompleted = false;
  private isInit = false;
  // private onLoad?(): void;
  // private onProgress?(loaded: number, total: number): void;
  private loadManager = null;
  constructor() {
    //
  }
  init(loadManager = null) {
    // console.log('TrackArenaSoundUtil isInit:', {
    //   isInit: this.isInit,
    //   isLoadCompleted: this.isLoadCompleted,
    // });
    this.loadManager = loadManager;
    if (this.isInit) {
      //只初始化一次
      return;
    }
    this.isInit = true;
    //console.log('TrackArenaSoundUtil init:', Date.now());
    // this.onLoad = onLoad;
    // this.onProgress = onProgress;
    this.soundPlayerList.forEach((sPlayer) => {
      this.initSound(sPlayer);
      this.soundPlayerMap.set(sPlayer.name, sPlayer);
      switch (sPlayer.name) {
        case SoundNameType.countdown1:
          this.countdown1 = sPlayer;
          break;
        case SoundNameType.countdown2:
          this.countdown2 = sPlayer;
          break;
        case SoundNameType.countdown3:
          this.countdown3 = sPlayer;
          break;
        case SoundNameType.countdownGo:
          this.countdownGo = sPlayer;
          break;
        case SoundNameType.countdownReady:
          this.countdownReady = sPlayer;
          break;
        case SoundNameType.crossingFinishLine:
          this.crossingFinishLine = sPlayer;
          break;
        case SoundNameType.crowdCheersBeyond:
          this.crowdCheersBeyond = sPlayer;
          break;
        case SoundNameType.crowdCheersFinish:
          this.crowdCheersFinish = sPlayer;
          break;
        case SoundNameType.crowdCheersFinished:
          this.crowdCheersFinished = sPlayer;
          break;
        case SoundNameType.crowdCheersFinishAfter:
          this.crowdCheersFinishAfter = sPlayer;
          break;
        case SoundNameType.crowdCheersFinishNear:
          this.crowdCheersFinishNear = sPlayer;
          break;
        case SoundNameType.hoovesFewLoop:
          this.hoovesFewLoop = sPlayer;
          break;
        case SoundNameType.hoovesGroupLoop:
          this.hoovesGroupLoop = sPlayer;
          break;
        case SoundNameType.hoovesSingleLoop:
          this.hoovesSingleLoop = sPlayer;
          break;
        case SoundNameType.openingCrowdEnv:
          this.openingCrowdEnv = sPlayer;
          break;
        case SoundNameType.openingHorse:
          this.openingHorse = sPlayer;
          break;
        case SoundNameType.openingHorse2:
          this.openingHorse2 = sPlayer;
          break;
        case SoundNameType.skillsOvertake:
          this.skillsOvertake = sPlayer;
          break;
        case SoundNameType.skillsSprint:
          this.skillsSprint = sPlayer;
          break;
        case SoundNameType.skillsWhip:
          this.skillsWhip = sPlayer;
          break;
        case SoundNameType.startGameRingtone:
          this.startGameRingtone = sPlayer;
          break;
        case SoundNameType.throughoutCrowdEnvSoundLoop:
          this.throughoutCrowdEnvSoundLoop = sPlayer;
          break;
        case SoundNameType.throughoutWindSoundLoop:
          this.throughoutWindSoundLoop = sPlayer;
          break;
        default:
          break;
      }
    });
  }
  /**
   * 初始化播放器
   * 每段音频初始化一个播放器，并放入播放列表对象中。
   */
  private initSound(soundPlayer: SoundPlayer) {
    const sUrl = this.baseSoundUrl + soundPlayer.fileName;
    this.loadManager?.current.itemStart(sUrl);
    const sound = new Howl({
      src: [sUrl],
      html5: true,
      volume: 1, //音量
      loop: soundPlayer.loop,
    });
    soundPlayer.sound = sound;
    //加载事件监听
    sound.once('load', () => {
      //console.log('initSound load:', soundPlayer);
      this.loadManager?.current.itemEnd(sUrl);
      soundPlayer.duration = sound.duration();
      this.currentloadCount++;
      if (this.currentloadCount === this.soundPlayerList.length) {
        this.isLoadCompleted = true;
      }
    });
    sound.on('play', () => {
      //console.log('initSound play:', soundPlayer);
      soundPlayer.audioStatus = 'play';
    });
    sound.on('seek', () => {
      //console.log('initSound seek:', soundPlayer);
      if (sound.playing()) {
        //
      }
    });
    sound.on('end', () => {
      //console.log('initSound end:', soundPlayer);
      soundPlayer.audioStatus = 'end';
    });
    sound.on('stop', () => {
      //console.log('initSound stop:', soundPlayer);
      soundPlayer.audioStatus = 'stop';
    });
  }
  getSoundPlayer(soundName: SoundNameType) {
    return this.soundPlayerMap.get(soundName);
  }
}

export default TrackArenaSoundUtil.getInstance();
