export async function loadFFmpeg() {
  const [{ FFmpeg }, { default: coreBinary }, { default: wasmBinary }] = await Promise.all([
    import("@ffmpeg/ffmpeg"),
    import("@ffmpeg/core?binary"),
    import("@ffmpeg/core/wasm?binary"),
  ]);

  const ffmpeg = new FFmpeg();

  await ffmpeg.load({
    coreURL: URL.createObjectURL(new Blob([coreBinary], { type: "text/javascript" })),
    wasmURL: URL.createObjectURL(new Blob([wasmBinary], { type: "application/wasm" })),
  });

  return ffmpeg;
}
