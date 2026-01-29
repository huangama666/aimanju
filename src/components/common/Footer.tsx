import React from "react";
import QRCodeDataUrl from "@/components/ui/qrcodedataurl";
import { 
  SakuraPetal, 
  AnimeStar, 
  ComicBubble, 
  ChineseCloud, 
  CuteEmoji, 
  JapaneseFan, 
  ComicSparkle,
  ChineseSeal 
} from '@/components/decorations/AnimeDecorations';

const Footer: React.FC = () => {
  return (
    <footer 
      className="bg-white/90 backdrop-blur-sm border-t border-orange-100 shadow-xl relative overflow-hidden"
    >
      {/* Footer装饰元素 */}
      <div className="absolute top-2 left-4 text-pink-400 animate-float opacity-20">
        <SakuraPetal className="w-6 h-6" />
      </div>
      <div className="absolute top-3 right-8 text-yellow-400 animate-sparkle opacity-25">
        <AnimeStar className="w-4 h-4" />
      </div>
      <div className="absolute bottom-2 left-1/4 text-blue-400 animate-wiggle opacity-15">
        <ComicSparkle className="w-4 h-4" />
      </div>
      <div className="absolute bottom-3 right-1/3 text-purple-400 animate-bounce-gentle opacity-20">
        <CuteEmoji className="w-5 h-5" type="wink" />
      </div>
      <div className="absolute top-1 left-1/3 text-green-400 animate-pulse-soft opacity-15">
        <JapaneseFan className="w-5 h-5" />
      </div>
      <div className="absolute bottom-1 right-8 text-red-400 animate-spin-slow opacity-10">
        <ChineseCloud className="w-8 h-5" />
      </div>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between items-center border-[0px] border-solid border-[transparent]">
          {/* 左侧署名 */}
          <div className="text-gray-600 text-sm font-medium relative">Powered By 黄啊码</div>
          
          {/* 中间宣传语 */}
          <div className="text-center relative">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text font-bold text-lg relative font-['MF-d49139c99ae604ff4878b061fa638778'] border-none border-[rgb(237,225,222)] border-[0px] text-[transparent] border-none border-[rgb(237,225,222)]">从灵感到荧幕，一站成梦</div>
          </div>
          
          {/* 右侧二维码 */}
          <div className="flex items-center relative">
            <QRCodeDataUrl 
              text="https://u.wechat.com/EAFA0oC-U-jposyd0De9pf8?s=2" 
              width={120}
              className="border border-orange-200 rounded-lg shadow-lg comic-shadow"
            />
            {/* 二维码装饰 */}
            <div className="absolute -top-2 -left-2 text-green-400 animate-wiggle opacity-40">
              <ComicBubble className="w-4 h-4" text="扫" />
            </div>
            <div className="absolute -bottom-2 -right-2 text-red-400 animate-bounce-gentle opacity-30">
              <JapaneseFan className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;