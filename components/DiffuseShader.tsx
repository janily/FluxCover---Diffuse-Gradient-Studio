import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

interface DiffuseShaderProps {
  colors: string[];
  speed: number;
  grain: number;
  scale: number;
  className?: string;
}

export interface DiffuseShaderHandle {
  getCanvasDataURL: (scaleFactor?: number, blurRadius?: number) => string | null;
}

// Helper to convert hex to vec3
const hexToRgb = (hex: string): [number, number, number] => {
  const bigint = parseInt(hex.replace('#', ''), 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return [r, g, b];
};

const DiffuseShader = forwardRef<DiffuseShaderHandle, DiffuseShaderProps>(({ colors, speed, grain, scale, className }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const programRef = useRef<WebGLProgram | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);

  // Store latest props in refs to access them inside getCanvasDataURL without closure staleness
  const propsRef = useRef({ colors, speed, grain, scale });
  useEffect(() => {
    propsRef.current = { colors, speed, grain, scale };
  }, [colors, speed, grain, scale]);

  const renderFrame = (gl: WebGLRenderingContext, program: WebGLProgram, width: number, height: number, time: number) => {
    gl.viewport(0, 0, width, height);
    
    const { colors, grain, scale } = propsRef.current;

    // Update Uniforms
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time);
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), width, height);
    gl.uniform1f(gl.getUniformLocation(program, 'u_grain'), grain);
    gl.uniform1f(gl.getUniformLocation(program, 'u_scale'), scale);

    // Update Colors
    colors.slice(0, 5).forEach((hex, i) => {
        const rgb = hexToRgb(hex);
        gl.uniform3f(gl.getUniformLocation(program, `u_c${i + 1}`), rgb[0], rgb[1], rgb[2]);
    });
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  useImperativeHandle(ref, () => ({
    getCanvasDataURL: (scaleFactor = 2, blurRadius = 0) => {
      const gl = glRef.current;
      const program = programRef.current;
      const canvas = canvasRef.current;
      if (!gl || !program || !canvas) return null;

      const originalWidth = canvas.width;
      const originalHeight = canvas.height;

      // 1. Resize canvas for high-res capture (Super-sampling)
      // We use clientWidth/Height to ensure we capture the correct aspect ratio and base resolution
      const targetWidth = Math.floor(canvas.clientWidth * scaleFactor);
      const targetHeight = Math.floor(canvas.clientHeight * scaleFactor);
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // 2. Render the frame at high res
      renderFrame(gl, program, targetWidth, targetHeight, timeRef.current);

      // 3. Read pixels directly from WebGL (Higher fidelity than drawImage)
      const pixels = new Uint8Array(targetWidth * targetHeight * 4);
      gl.readPixels(0, 0, targetWidth, targetHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      // 4. Flip Y-axis (WebGL coordinates start at bottom-left, Canvas is top-left)
      const flippedPixels = new Uint8Array(targetWidth * targetHeight * 4);
      for (let i = 0; i < targetHeight; i++) {
        const srcRow = i * targetWidth * 4;
        const dstRow = (targetHeight - i - 1) * targetWidth * 4;
        flippedPixels.set(pixels.subarray(srcRow, srcRow + targetWidth * 4), dstRow);
      }

      // 5. Put pixels onto a temp 2D canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = targetWidth;
      tempCanvas.height = targetHeight;
      const ctx = tempCanvas.getContext('2d');
      
      if (!ctx) {
        // Restore
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        renderFrame(gl, program, originalWidth, originalHeight, timeRef.current);
        return null;
      }

      // Use Uint8ClampedArray for ImageData
      const imageData = new ImageData(new Uint8ClampedArray(flippedPixels), targetWidth, targetHeight);
      ctx.putImageData(imageData, 0, 0);

      // Restore original WebGL canvas size immediately
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      renderFrame(gl, program, originalWidth, originalHeight, timeRef.current);

      // 6. Apply Blur Processing if requested
      if (blurRadius > 0) {
         const scaledBlur = blurRadius * scaleFactor;
         // Calculate padding needed to avoid edge darkness. 
         // 3x sigma is usually safe for Gaussian blur.
         const pad = Math.ceil(scaledBlur * 3);
         
         // Create a larger canvas to hold the image + padded edges for clamping
         // We assemble the image WITHOUT filter first to ensure edges are perfectly replicated
         const clampedCanvas = document.createElement('canvas');
         clampedCanvas.width = targetWidth + (pad * 2);
         clampedCanvas.height = targetHeight + (pad * 2);
         const cCtx = clampedCanvas.getContext('2d');
         
         if (cCtx) {
            // Disable smoothing to prevent "fading" at the edges when stretching 1px strips.
            // This fixes the dark shadow/vignette artifact around the exported image.
            cCtx.imageSmoothingEnabled = false;

            // A. "Clamp-to-Edge" Simulation
            // To prevent dark edges without zooming/stretching the image (which changes the art),
            // we replicate the edge pixels into the padding area.

            // 1. Draw Center (Main Image) at the offset
            cCtx.drawImage(tempCanvas, pad, pad, targetWidth, targetHeight);

            // 2. Draw Edges (Stretch 1px edge to fill padding)
            // Left Edge
            cCtx.drawImage(tempCanvas, 0, 0, 1, targetHeight, 0, pad, pad, targetHeight);
            // Right Edge
            cCtx.drawImage(tempCanvas, targetWidth - 1, 0, 1, targetHeight, targetWidth + pad, pad, pad, targetHeight);
            // Top Edge
            cCtx.drawImage(tempCanvas, 0, 0, targetWidth, 1, pad, 0, targetWidth, pad);
            // Bottom Edge
            cCtx.drawImage(tempCanvas, 0, targetHeight - 1, targetWidth, 1, pad, targetHeight + pad, targetWidth, pad);

            // 3. Draw Corners (Stretch 1px corner to fill corner padding)
            // Top-Left
            cCtx.drawImage(tempCanvas, 0, 0, 1, 1, 0, 0, pad, pad);
            // Top-Right
            cCtx.drawImage(tempCanvas, targetWidth - 1, 0, 1, 1, targetWidth + pad, 0, pad, pad);
            // Bottom-Left
            cCtx.drawImage(tempCanvas, 0, targetHeight - 1, 1, 1, 0, targetHeight + pad, pad, pad);
            // Bottom-Right
            cCtx.drawImage(tempCanvas, targetWidth - 1, targetHeight - 1, 1, 1, targetWidth + pad, targetHeight + pad, pad, pad);

            // B. Apply blur to the whole assembled canvas and crop back to original size
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = targetWidth;
            finalCanvas.height = targetHeight;
            const fCtx = finalCanvas.getContext('2d');
            
            if (fCtx) {
                fCtx.filter = `blur(${scaledBlur}px)`;
                // Draw the padded/clamped canvas shifted so the center image aligns with the final canvas 0,0
                // Since the center image is at (pad, pad) in clampedCanvas, we draw clampedCanvas at (-pad, -pad)
                fCtx.drawImage(clampedCanvas, -pad, -pad);
                return finalCanvas.toDataURL('image/png');
            }
         }
      }

      return tempCanvas.toDataURL('image/png');
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Optimization: Enable antialias and disable premultipliedAlpha for better export quality
    const gl = canvas.getContext('webgl', { 
        preserveDrawingBuffer: true,
        premultipliedAlpha: false, // Important for transparency/edges
        antialias: true, // Enable MSAA if available
        alpha: true
    });
    
    if (!gl) return;
    glRef.current = gl;

    const vertexShaderSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec3 u_c1;
      uniform vec3 u_c2;
      uniform vec3 u_c3;
      uniform vec3 u_c4;
      uniform vec3 u_c5;
      uniform float u_grain;
      uniform float u_scale;

      // Simplex noise function
      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

      float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                 -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
          + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      void main() {
        vec2 st = gl_FragCoord.xy / u_resolution.xy;
        st.x *= u_resolution.x / u_resolution.y;
        
        // Slow movement
        float t = u_time * 0.1;
        
        // Create moving blobs using noise
        float n1 = snoise(st * u_scale + vec2(t, t * 0.4));
        float n2 = snoise(st * (u_scale * 1.2) - vec2(t * 0.8, t * 0.2));
        float n3 = snoise(st * (u_scale * 0.8) + vec2(-t * 0.3, t * 0.7));

        // Mix colors based on noise values
        vec3 color = mix(u_c1, u_c2, smoothstep(-1.0, 1.0, n1));
        color = mix(color, u_c3, smoothstep(-0.8, 0.8, n2));
        color = mix(color, u_c4, smoothstep(-0.6, 0.6, n3 * n1));
        color = mix(color, u_c5, smoothstep(0.2, 0.9, length(st - 0.5)));

        // Add grain
        float grain = (random(st * u_time) - 0.5) * u_grain;
        color += grain;

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fs = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link failed:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);
    programRef.current = program;

    // Set up a full screen quad
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    return () => {
      if (glRef.current && programRef.current) {
        glRef.current.deleteProgram(programRef.current);
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Uniform update loop
  useEffect(() => {
    const animate = () => {
      const gl = glRef.current;
      const program = programRef.current;
      const canvas = canvasRef.current;

      if (gl && program && canvas) {
        // Resize if needed - Use Device Pixel Ratio for sharpness
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = Math.floor(canvas.clientWidth * dpr);
        const displayHeight = Math.floor(canvas.clientHeight * dpr);

        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
          canvas.width = displayWidth;
          canvas.height = displayHeight;
        }

        timeRef.current += 0.01 * propsRef.current.speed;
        
        renderFrame(gl, program, canvas.width, canvas.height, timeRef.current);
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []); // Empty dependency array as we use refs for props

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
    />
  );
});

export default DiffuseShader;