import React, { useState, useRef } from 'react';
import * as htmlToImage from 'html-to-image';
import DiffuseShader, { DiffuseShaderHandle } from './components/DiffuseShader';
import ControlPanel from './components/ControlPanel';
import { CoverConfig } from './types';

const App: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  
  const [config, setConfig] = useState<CoverConfig>({
    title: 'The Art of\nDiffusion.',
    subtitle: 'Exploring the boundaries between \ncolor, light, and code.',
    colors: ['#FF5733', '#C70039', '#900C3F', '#581845', '#FFC300'],
    speed: 0.5,
    grain: 0.15,
    blur: 40,
    scale: 1.0,
    fontFamily: 'Inter'
  });

  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const shaderRef = useRef<DiffuseShaderHandle>(null);

  const handleDownload = async () => {
    if (!captureRef.current) return;

    try {
      // 1. Capture high-quality native shader output (2x scale for crispness)
      // Pass the blur value so the shader can bake it into the image perfectly
      if (shaderRef.current) {
        const nativeShaderUrl = shaderRef.current.getCanvasDataURL(2, config.blur);
        if (nativeShaderUrl) {
            setSnapshotUrl(nativeShaderUrl);
            // Allow a brief moment for the React state to update and the <img> to render
            await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Ensure fonts are loaded
      await document.fonts.ready;
      
      const options = {
        quality: 1.0,
        backgroundColor: '#ffffff',
        pixelRatio: 2, // High res for text elements
        cacheBust: true,
      };

      // Always export as PNG per requirement
      const dataUrl = await htmlToImage.toPng(captureRef.current, options);

      const link = document.createElement('a');
      link.download = `flux-cover-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating cover image:', err);
      alert('Could not generate image. Please try again.');
    } finally {
      // Clean up the snapshot overlay
      setSnapshotUrl(null);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-black overflow-hidden">
      {/* Main Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center bg-[#050505] p-8 overflow-hidden">
        
        {/* The "Artboard" */}
        <div 
            ref={captureRef}
            className="relative aspect-[3/4] h-full max-h-[90vh] w-auto bg-white shadow-2xl overflow-hidden"
            style={{ boxShadow: '0 0 100px rgba(0,0,0,0.5)' }}
        >
            {/* Background Layer: Either WebGL Shader (Live) or Static Snapshot (Export) */}
            <div className="absolute inset-0 z-0 bg-black">
                 {/* Hide live shader during export to prevent conflicts and ensure we capture the processed image */}
                 <div className={`w-full h-full ${snapshotUrl ? 'hidden' : 'block'}`}>
                    <DiffuseShader 
                        ref={shaderRef}
                        colors={config.colors} 
                        speed={config.speed} 
                        grain={config.grain} 
                        scale={config.scale}
                    />
                 </div>

                 {/* High Quality Snapshot Overlay for Export */}
                 {/* The blur is already baked into this image by the shader component, so we don't need CSS filters here. */}
                 {/* This ensures 'html-to-image' sees a clean, opaque image, fixing edge shadows and blend mode issues. */}
                 {snapshotUrl && (
                    <img 
                        src={snapshotUrl} 
                        className="absolute inset-0 w-full h-full object-cover z-[1]" 
                        alt="High res render" 
                    />
                 )}
            </div>

            {/* Visual Blur Layer (Live Only) */}
            {/* We hide this during export because the snapshot above already has the blur applied */}
            {!snapshotUrl && config.blur > 0 && (
                <div 
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{ backdropFilter: `blur(${config.blur}px)` }}
                />
            )}

            {/* Text Overlay Layer */}
            <div 
                className="absolute inset-0 z-20 p-12 flex flex-col justify-between pointer-events-none mix-blend-difference text-white transition-all duration-300"
                style={{ 
                  // Use user selected font, but always fallback to Noto Sans SC for Chinese support
                  fontFamily: `"${config.fontFamily}", "Noto Sans SC", sans-serif` 
                }}
            >
                <div className="space-y-4">
                     <h1 className="text-6xl font-extrabold tracking-tighter leading-none whitespace-pre-wrap">
                        {config.title}
                    </h1>
                </div>
                
                <div className="border-t border-white/40 pt-6">
                    <p className="text-lg font-medium leading-relaxed opacity-90 whitespace-pre-wrap tracking-wide">
                        {config.subtitle}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-widest opacity-60 font-sans">
                        <span>{lang === 'zh' ? 'Flux 视觉生成' : 'Flux Generation'}</span>
                        <span>•</span>
                        <span>2024</span>
                    </div>
                </div>
            </div>
            
            {/* Decorative Noise Overlay (Static texture for paper feel) */}
            <div 
                className="absolute inset-0 z-30 opacity-20 pointer-events-none mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            />
        </div>
      </div>

      {/* Controls Sidebar */}
      <ControlPanel 
        config={config} 
        setConfig={setConfig} 
        onDownload={handleDownload}
        lang={lang}
        setLang={setLang}
      />
    </div>
  );
};

export default App;