/// <reference types="vite/client" />

// Web Speech API types (not in all TS DOM libs)
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((e: Event & { error?: string }) => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
declare var SpeechRecognition: { prototype: SpeechRecognition; new (): SpeechRecognition };
declare var webkitSpeechRecognition: { prototype: SpeechRecognition; new (): SpeechRecognition };

declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  const svgSrc: string;
  export default svgSrc;
}

declare module '*.png' {
  const pngSrc: string;
  export default pngSrc;
}

declare module '*.jpg' {
  const jpgSrc: string;
  export default jpgSrc;
}

declare module '*.jpeg' {
  const jpegSrc: string;
  export default jpegSrc;
}

declare module '*.gif' {
  const gifSrc: string;
  export default gifSrc;
}

declare module '*.webp' {
  const webpSrc: string;
  export default webpSrc;
}

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  [key: string]: any
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}