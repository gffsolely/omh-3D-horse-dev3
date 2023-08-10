import * as React from 'react';
import Image from 'next/image';

import styles from '@/styles';
import { navVariants } from '@/utils/motion';

export default function Header() {
  return (
    <div className={`${styles.xPaddings} relative py-8`}>
      <div className='gradient-01 absolute inset-0 w-[50%]' />
      <div
        className={`${styles.innerWidth} mx-auto flex justify-between gap-8`}
      >
        <img
          src='/svg/example/search.svg'
          alt='search'
          className='h-[24px] w-[24px] object-contain'
        />
        <h2 className='text-[24px] font-extrabold leading-[30.24px] text-white'>
          OMNILAND
        </h2>
        <img
          src='/svg/example/menu.svg'
          alt='menu'
          className='h-[24px] w-[24px] object-contain'
        />
      </div>
    </div>
  );
}
