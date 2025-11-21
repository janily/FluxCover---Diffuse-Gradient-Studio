import React, { useState } from 'react';
import { CoverConfig } from '../types';
import { generateCreativeContent } from '../services/gemini';

interface ControlPanelProps {
  config: CoverConfig;
  setConfig: React.Dispatch<React.SetStateAction<CoverConfig>>;
  onDownload: () => void;
  lang: 'en' | 'zh';
  setLang: (lang: 'en' | 'zh') => void;
}

const fontOptions = [
  { label: 'Inter (Default)', value: 'Inter' },
  { label: 'Playfair Display (Serif)', value: 'Playfair Display' },
  { label: 'Oswald (Condensed)', value: 'Oswald' },
  { label: 'Roboto Mono (Tech)', value: 'Roboto Mono' },
  { label: 'Lobster (Script)', value: 'Lobster' },
  { label: 'Abril Fatface (Display)', value: 'Abril Fatface' },
  { label: 'Cinzel (Cinematic)', value: 'Cinzel' },
];

const translations = {
  en: {
    title: "FLUX STUDIO",
    subtitle: "Diffuse Gradient Tool",
    conceptGenerator: "Concept Generator",
    conceptDesc: "Enter a theme to generate a matching palette and typography.",
    placeholder: "e.g. 'Brutalist Architecture'",
    generate: "Generate",
    typography: "Typography",
    fontFamily: "Font Family",
    titleContent: "Title Content",
    subtitleContent: "Subtitle Content",
    parameters: "Parameters",
    speed: "Fluid Velocity",
    blur: "Blur Radius",
    grain: "Noise Intensity",
    scale: "Pattern Scale",
    colors: "Color Palette",
    export: "Export Image",
    processing: "Processing..."
  },
  zh: {
    title: "FLUX 工作室",
    subtitle: "弥散渐变设计工具",
    conceptGenerator: "灵感生成器",
    conceptDesc: "输入主题以生成匹配的配色方案和排版风格。",
    placeholder: "例如：'赛博朋克' 或 '江南烟雨'",
    generate: "生成",
    typography: "排版设置",
    fontFamily: "字体系列",
    titleContent: "标题内容",
    subtitleContent: "副标题内容",
    parameters: "参数调整",
    speed: "流动速度",
    blur: "模糊半径",
    grain: "噪点强度",
    scale: "图案缩放",
    colors: "配色方案",
    export: "导出图片",
    processing: "处理中..."
  }
};

const ControlPanel: React.FC<ControlPanelProps> = ({ config, setConfig, onDownload, lang, setLang }) => {
  const [mood, setMood] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const t = translations[lang];

  const handleGenerate = async () => {
    if (!mood.trim()) return;
    setIsGenerating(true);
    const result = await generateCreativeContent(mood, lang);
    setConfig(prev => ({
      ...prev,
      title: result.title,
      subtitle: result.subtitle,
      colors: result.colors
    }));
    setIsGenerating(false);
  };

  const handleColorChange = (index: number, value: string) => {
    const newColors = [...config.colors];
    newColors[index] = value;
    setConfig({ ...config, colors: newColors });
  };

  const handleDownloadClick = async () => {
    setIsDownloading(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    onDownload();
    setIsDownloading(false);
  };

  return (
    <div className="w-full lg:w-96 bg-[#111] border-l border-[#222] h-full flex flex-col text-sm overflow-hidden font-sans text-neutral-300">
      <div className="p-6 border-b border-[#222] flex justify-between items-center">
        <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">
            {t.title}
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 mt-0.5">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
                className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors border border-[#333] px-2 py-1 rounded-sm"
            >
                {lang === 'en' ? 'CN' : 'EN'}
            </button>
            <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
        {/* Generator Section */}
        <section className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 block mb-2">{t.conceptGenerator}</label>
            <p className="text-xs text-neutral-500 leading-relaxed mb-3">
              {t.conceptDesc}
            </p>
          </div>
          <div className="flex gap-0 shadow-sm">
            <input
              type="text"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder={t.placeholder}
              className="flex-1 bg-[#1A1A1A] border border-[#333] border-r-0 rounded-l-sm px-3 py-2 focus:outline-none focus:border-white focus:bg-[#222] text-white placeholder-neutral-600 transition-colors text-xs"
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !mood}
              className="bg-white text-black px-4 py-2 rounded-r-sm font-bold text-[10px] uppercase disabled:opacity-50 hover:bg-neutral-200 transition-colors whitespace-nowrap flex items-center gap-2 tracking-wider"
            >
              {isGenerating ? (
                <span className="animate-spin block w-3 h-3 border-2 border-black border-t-transparent rounded-full"></span>
              ) : (
                <span>{t.generate}</span>
              )}
            </button>
          </div>
        </section>

        {/* Text Controls */}
        <section className="space-y-5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 border-b border-[#222] pb-2 block">{t.typography}</label>
          <div className="space-y-4">
            <div>
                <label className="text-xs text-neutral-400 mb-1.5 block">{t.fontFamily}</label>
                <select 
                    value={config.fontFamily}
                    onChange={(e) => setConfig({...config, fontFamily: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#333] rounded-sm px-3 py-2.5 focus:outline-none focus:border-white text-white appearance-none cursor-pointer text-xs"
                    style={{ fontFamily: config.fontFamily }}
                >
                    {fontOptions.map((font) => (
                        <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                            {font.label}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label className="text-xs text-neutral-400 mb-1.5 block">{t.titleContent}</label>
                <input
                    type="text"
                    value={config.title}
                    onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-[#333] rounded-sm px-3 py-2.5 focus:outline-none focus:border-white text-white text-xs"
                />
            </div>
            <div>
                <label className="text-xs text-neutral-400 mb-1.5 block">{t.subtitleContent}</label>
                <textarea
                    rows={2}
                    value={config.subtitle}
                    onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-[#333] rounded-sm px-3 py-2.5 focus:outline-none focus:border-white text-white resize-none text-xs leading-relaxed"
                />
            </div>
          </div>
        </section>

        {/* Visual Sliders */}
        <section className="space-y-5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 border-b border-[#222] pb-2 block">{t.parameters}</label>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-neutral-400">
                <span>{t.speed}</span>
                <span className="font-mono text-[10px] text-neutral-500">{(config.speed).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={config.speed}
              onChange={(e) => setConfig({ ...config, speed: parseFloat(e.target.value) })}
              className="w-full h-1 bg-[#222] rounded-full appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-neutral-400">
                <span>{t.blur}</span>
                <span className="font-mono text-[10px] text-neutral-500">{config.blur}PX</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={config.blur}
              onChange={(e) => setConfig({ ...config, blur: parseInt(e.target.value) })}
              className="w-full h-1 bg-[#222] rounded-full appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-neutral-400">
                <span>{t.grain}</span>
                <span className="font-mono text-[10px] text-neutral-500">{config.grain.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.01"
              value={config.grain}
              onChange={(e) => setConfig({ ...config, grain: parseFloat(e.target.value) })}
              className="w-full h-1 bg-[#222] rounded-full appearance-none cursor-pointer accent-white"
            />
          </div>

           <div className="space-y-2">
            <div className="flex justify-between text-xs text-neutral-400">
                <span>{t.scale}</span>
                <span className="font-mono text-[10px] text-neutral-500">{config.scale.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={config.scale}
              onChange={(e) => setConfig({ ...config, scale: parseFloat(e.target.value) })}
              className="w-full h-1 bg-[#222] rounded-full appearance-none cursor-pointer accent-white"
            />
          </div>
        </section>

        {/* Colors */}
        <section className="space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 border-b border-[#222] pb-2 block">{t.colors}</label>
          <div className="grid grid-cols-5 gap-2">
            {config.colors.map((color, idx) => (
              <div key={idx} className="relative aspect-square group rounded-sm overflow-hidden border border-[#333] hover:border-white transition-colors">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => handleColorChange(idx, e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
                <div 
                    className="w-full h-full" 
                    style={{ backgroundColor: color }} 
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="p-6 border-t border-[#222] bg-[#111]">
        <button
            onClick={handleDownloadClick}
            disabled={isDownloading}
            className="w-full bg-white hover:bg-neutral-200 text-black text-xs font-bold py-3.5 px-4 rounded-sm border border-transparent transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-widest"
        >
            {isDownloading ? t.processing : t.export}
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;