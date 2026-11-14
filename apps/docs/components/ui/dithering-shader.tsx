"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export type DitheringShaderShape = "wave" | "shimmer" | "flag";
export type DitheringShaderType =
  | "void-no-dither"
  | "4x4"
  | "8x8"
  | "Bayer"
  | "noise-1"
  | "noise-2"
  | "noise-3"
  | "noise-4";

export interface DitheringShaderProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: DitheringShaderShape;
  type?: DitheringShaderType;
  /** Background color (any CSS color). Defaults to the site theme background. */
  colorBack?: string;
  /** Dithered foreground color (any CSS color). Defaults to the site teal accent. */
  colorFront?: string;
  /** Dot size in CSS pixels. */
  pxSize?: number;
  /** Animation speed multiplier. 0 renders a static frame. */
  speed?: number;
}

const SHAPE_INDEX: Record<DitheringShaderShape, number> = { wave: 0, shimmer: 1, flag: 2 };
const TYPE_INDEX: Record<DitheringShaderType, number> = {
  "void-no-dither": 0,
  "4x4": 1,
  "8x8": 2,
  Bayer: 2,
  "noise-1": 3,
  "noise-2": 4,
  "noise-3": 5,
  "noise-4": 6,
};

const VERTEX_SHADER = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uPxSize;
uniform vec3 uColorBack;
uniform vec3 uColorFront;
uniform int uShape;
uniform int uType;

// Compact recursive Bayer matrices (values in [0, 1)).
float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float shapeValue(vec2 p, float t) {
  if (uShape == 0) { // wave: layered diagonal sine bands
    float w1 = sin(p.x * 5.0 + t * 1.4);
    float w2 = sin((p.x * 0.6 + p.y * 1.1) * 7.0 - t * 0.9);
    float w3 = sin(p.y * 9.0 + t * 0.6);
    return 0.5 + 0.24 * w1 + 0.16 * w2 + 0.10 * w3;
  }
  if (uShape == 1) { // shimmer: radial ripples from the center
    float r = length(p * 2.0 - 1.0) * 9.0;
    return 0.5 + 0.35 * sin(r - t * 2.0);
  }
  // flag: a single gentle vertical swell
  return 0.5 + 0.35 * sin(p.y * 5.0 + p.x * 2.5 + t);
}

float ditherThreshold(vec2 pixel) {
  if (uType == 0) return 0.5;            // void-no-dither
  if (uType == 1) return bayer4(pixel);  // 4x4
  if (uType == 2) return bayer8(pixel);  // 8x8 / Bayer
  float level = uType == 3 ? 1.0 : (uType == 4 ? 2.0 : (uType == 5 ? 3.0 : 4.0));
  return hash12(pixel) * (level / 4.0) + (0.5 - level / 8.0); // noise-1..4
}

void main() {
  vec2 pixel = floor(gl_FragCoord.xy / uPxSize);
  vec2 uv = (pixel * uPxSize) / uResolution;
  float aspect = uResolution.x / uResolution.y;
  float value = shapeValue(vec2(uv.x * aspect, uv.y), uTime);
  float threshold = ditherThreshold(pixel);
  vec3 color = mix(uColorBack, uColorFront, step(threshold, value));
  gl_FragColor = vec4(color, 1.0);
}
`;

/** Theme-matched defaults: paper white + teal in light mode, ink + bright teal in dark mode. */
const THEME_COLORS = {
  light: { back: "#ffffff", front: "#14b8a6" },
  dark: { back: "#0a0a0b", front: "#2dd4bf" },
} as const;

/** Tracks the Nextra dark-mode class on <html> so unstyled colors follow the theme. */
function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

export function DitheringShader({
  shape = "wave",
  type = "8x8",
  colorBack,
  colorFront,
  pxSize = 3,
  speed = 0.6,
  className,
  ...props
}: DitheringShaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<{
    uColorBack: { value: THREE.Color };
    uColorFront: { value: THREE.Color };
  } | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const isDark = useDarkMode();
  const colors =
    colorBack && colorFront
      ? { back: colorBack, front: colorFront }
      : isDark
        ? THEME_COLORS.dark
        : THEME_COLORS.light;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Raw color pipeline: hex uniforms map 1:1 to screen values.
    THREE.ColorManagement.enabled = false;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" });
    } catch {
      setWebglFailed(true);
      return;
    }
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const canvas = renderer.domElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPxSize: { value: pxSize },
      uColorBack: { value: new THREE.Color(colors.back) },
      uColorFront: { value: new THREE.Color(colors.front) },
      uShape: { value: SHAPE_INDEX[shape] },
      uType: { value: TYPE_INDEX[type] },
    };
    uniformsRef.current = uniforms;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    const bufferSize = new THREE.Vector2();
    const resize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight, false);
      renderer.getDrawingBufferSize(bufferSize);
      uniforms.uResolution.value.copy(bufferSize);
      uniforms.uPxSize.value = pxSize * renderer.getPixelRatio();
    };

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clock = new THREE.Clock();
    let raf = 0;
    let time = 0;
    const render = () => {
      uniforms.uTime.value = time;
      renderer.render(scene, camera);
    };
    const start = () => {
      if (!raf) {
        clock.getDelta();
        raf = requestAnimationFrame(function loop() {
          if (!media.matches) time += clock.getDelta() * speed;
          render();
          raf = requestAnimationFrame(loop);
        });
      }
    };
    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    resize();
    if (media.matches) render();
    else start();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (!raf) render();
    });
    resizeObserver.observe(container);
    media.addEventListener("change", onMotionChange);

    function onMotionChange() {
      if (media.matches) {
        stop();
        render();
      } else {
        start();
      }
    }

    return () => {
      stop();
      resizeObserver.disconnect();
      media.removeEventListener("change", onMotionChange);
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
      uniformsRef.current = null;
    };
    // Rebuild on style-affecting prop changes; colors are patched separately below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, type, pxSize, speed]);

  // Patch colors live without rebuilding the renderer (theme switch stays smooth).
  useEffect(() => {
    const materialUniforms = uniformsRef.current;
    if (!materialUniforms) return;
    materialUniforms.uColorBack.value.set(colors.back);
    materialUniforms.uColorFront.value.set(colors.front);
  }, [colors.back, colors.front]);

  return (
    <div
      ref={containerRef}
      role="presentation"
      aria-hidden="true"
      className={cn("h-full w-full", className)}
      {...props}
    >
      {webglFailed ? (
        <div
          className="h-full w-full"
          style={{
            background: `linear-gradient(135deg, ${colors.back} 0%, ${colors.front}22 55%, ${colors.back} 100%)`,
          }}
        />
      ) : null}
    </div>
  );
}

export default DitheringShader;
