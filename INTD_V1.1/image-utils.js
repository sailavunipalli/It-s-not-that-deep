// =========================================================
//   INTD — Image helpers (shared)
//   Requires the heic2any CDN script to be loaded first.
//   iPhones hand us HEIC by default, which no browser can display,
//   so anything coming off a phone gets converted to JPEG on the way in.
// =========================================================

async function processFileForUpload(file) {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name);

  if (!isHeic) return file;

  const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
  const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
  return new File([convertedBlob], newName, { type: "image/jpeg" });
}

function isAcceptedImage(file) {
  return file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);
}
