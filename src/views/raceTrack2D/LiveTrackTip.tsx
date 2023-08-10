import Image from 'next/image';
import React from 'react';

// import { reflectRatingHorsePortait } from '@/utils';
// import { riderLevelIcon } from '@/utils/publicFn';

export default function LiveTrackTip({ horseInfo }) {
  return (
    <div className=' h-[11.75rem] w-[19.44rem] bg-[rgba(10,10,10,0.85)] p-[1.5rem] '>
      {horseInfo && (
        <>
          <div className=' flex h-[3.375rem] items-center'>
            {/* <Image
              alt=''
              width={280}
              height={280}
              src={reflectRatingHorsePortait(horseInfo?.rating)}
              className=' h-[3.38rem] w-[3.38rem]'
            /> */}
            <div className=' font-ttscr ml-[0.94rem] '>
              <h3 className=' w-[12rem] overflow-hidden text-ellipsis whitespace-nowrap text-[1.125rem] text-white  '>
                {horseInfo?.horseName}
                {/*+ ' ' + horseInfo?.horseCode */}
              </h3>
              <div className='text-[1rem]'>
                <span className={`${horseInfo?.rating}Text `}>{horseInfo?.rating}</span>
                <span className='SSSRText ml-[0.75rem] '>Lv{horseInfo?.grade}</span>
              </div>
            </div>
          </div>
          <hr className=' my-4 border-t border-[rgba(255,255,255,0.2)]'></hr>
          <div className=' flex h-[3.375rem] items-center'>
            <div className=' rider-gradient-bg h-[3.38rem] overflow-hidden'>
              <Image
                src={horseInfo?.horseManImage2dUrl}
                loader={() => horseInfo?.horseManImage2dUrl}
                alt=''
                width={120}
                height={120}
                className='mt-[0.6rem] scale-125'></Image>
            </div>
            <div className=' font-ttscr ml-[0.94rem] '>
              <h3 className=' w-[12rem] overflow-hidden text-ellipsis whitespace-nowrap text-[1.125rem] text-white  '>
                {horseInfo?.manName}
              </h3>
              <div className='text-[1rem]'>
                <span className={`${horseInfo?.rarity}Text `}>{horseInfo?.rarity}</span>
                {/* <Image
                  src={riderLevelIcon(horseInfo?.manGrade)}
                  alt=''
                  width={68}
                  height={68}
                  className='ml-[0.75rem] inline-block h-[2.13rem] w-[2.13rem] '></Image> */}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
