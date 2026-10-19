/**
 * True when WebGL is backed by a real GPU. Software rasterizers (SwiftShader,
 * llvmpipe, Microsoft Basic Render) can run WebGL, but slowly enough to make
 * the page sluggish, so the hero falls back to its lighter layers there.
 */
let cached: boolean | undefined;

export function hasHardwareGpu(): boolean {
  if (cached !== undefined) return cached;
  if (typeof document === "undefined") return (cached = false);
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return (cached = false);
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(
      info
        ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
    );
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    cached = !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
  } catch {
    cached = false;
  }
  return cached;
}
