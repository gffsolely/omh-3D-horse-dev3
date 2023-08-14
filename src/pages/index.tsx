import Link from 'next/link';
import React from 'react';

import Layout from '@/components/layout/Layout';
import Seo from '@/components/Seo';

export default function indexPage() {
  return (
    <Layout>
      <Seo />
      <main>
        <div className=' ml-auto  mr-auto w-1/2 pt-4 text-center text-white'>
          horse Page
          <div>
            see:
            <Link href='/horse/horse-arena-standard' className=' text-blue-500 '>
              horse-arena-standard(老赛场模型 AI)
            </Link>
          </div>
        </div>
        <div className=' ml-auto  mr-auto w-1/2 pt-4 text-center text-white'>
          horse Page
          <div>
            see:
            <Link href='/horse/horse-arena-santa' className=' text-blue-500 '>
              horse-arena-santa(新赛场模型 AI 全景贴图)
            </Link>
          </div>
        </div>
        <div className=' ml-auto  mr-auto w-1/2 pt-4 text-center text-white'>
          horse Page
          <div>
            see:
            <Link href='/horse/horse-arena-santa-ws' className=' text-blue-500 '>
              horse-arena-santa-ws(赛场模型 AI WS 实时比赛)
            </Link>
          </div>
        </div>

        <div className=' ml-auto  mr-auto w-1/2 pt-4 text-center text-white'>
          horse Page
          <div>
            see:
            <Link href='/test/LiveTrackTest' className=' text-blue-500 '>
              LiveTrack(2D 比赛曲线&语音解说)
            </Link>
          </div>
        </div>
        <div className=' ml-auto  mr-auto w-1/2 pt-4 text-center text-white'>
          horse Page
          <div>
            see:
            <Link href='/test/LiveTrackTestWS' className=' text-blue-500 '>
              LiveTrack(2D 比赛曲线 WS)
            </Link>
          </div>
        </div>

        <div className='h-[1000px]'></div>
      </main>
    </Layout>
  );
}
