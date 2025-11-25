// Fallback types to avoid "Cannot find type definition file for 'vite/client'" error
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