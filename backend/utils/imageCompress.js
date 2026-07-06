const fs = require("fs");
const path = require("path");
const Jimp = require("jimp");

const PROFILES = {
  "bid-banner": { maxSide: 1600, maxBytes: 800 * 1024 },
  avatar: { maxSide: 1280, maxBytes: 400 * 1024 },
  "email-inline": { maxSide: 600, maxBytes: 200 * 1024 },
};

async function encodeJpeg(image, quality) {
  return image.quality(quality).getBufferAsync(Jimp.MIME_JPEG);
}

/**
 * Comprime buffer de imagem para JPEG dentro do perfil indicado.
 * @returns {Promise<{ buffer: Buffer, mime: string }>}
 */
async function compressBuffer(input, profileName = "bid-banner") {
  const profile = PROFILES[profileName] || PROFILES["bid-banner"];
  let image = await Jimp.read(input);
  image = image.scaleToFit(profile.maxSide, profile.maxSide, Jimp.RESIZE_BICUBIC);

  let quality = 85;
  let buffer = await encodeJpeg(image, quality);

  while (buffer.length > profile.maxBytes && quality > 42) {
    quality -= 7;
    buffer = await encodeJpeg(image, quality);
  }

  let { bitmap } = image;
  while (buffer.length > profile.maxBytes && Math.max(bitmap.width, bitmap.height) > 256) {
    const width = Math.max(256, Math.round(bitmap.width * 0.82));
    const height = Math.max(256, Math.round(bitmap.height * 0.82));
    image = image.resize(width, height, Jimp.RESIZE_BICUBIC);
    bitmap = image.bitmap;
    quality = Math.min(quality, 78);
    buffer = await encodeJpeg(image, quality);
  }

  if (buffer.length > profile.maxBytes) {
    const err = new Error(
      `Não foi possível comprimir a imagem abaixo de ${Math.round(profile.maxBytes / 1024)} KB.`,
    );
    err.statusCode = 400;
    throw err;
  }

  return { buffer, mime: "image/jpeg" };
}

/**
 * Comprime ficheiro no disco (substitui por .jpg). Retorna caminho absoluto final.
 */
async function compressImageAtPath(absPath, profileName = "bid-banner") {
  if (!absPath || !fs.existsSync(absPath)) return absPath;
  const input = fs.readFileSync(absPath);
  const { buffer } = await compressBuffer(input, profileName);
  const parsed = path.parse(absPath);
  const jpgPath = path.join(parsed.dir, `${parsed.name}.jpg`);
  fs.writeFileSync(jpgPath, buffer);
  if (jpgPath !== absPath && fs.existsSync(absPath)) {
    try {
      fs.unlinkSync(absPath);
    } catch (_) {}
  }
  return jpgPath;
}

/**
 * Comprime ficheiro enviado via multer (req.files[field][0]).
 */
async function compressMulterUpload(req, field, profileName = "bid-banner") {
  const file = req.files?.[field]?.[0];
  if (!file?.path) return;
  const finalPath = await compressImageAtPath(file.path, profileName);
  file.path = finalPath;
  file.filename = path.basename(finalPath);
  if (file.mimetype) file.mimetype = "image/jpeg";
}

module.exports = {
  PROFILES,
  compressBuffer,
  compressImageAtPath,
  compressMulterUpload,
};
