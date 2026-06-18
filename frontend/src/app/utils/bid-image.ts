/** Teto para banners BID (e-mail ~600px de largura). */
const MAX_BYTES = 1 * 1024 * 1024;
/** Maior lado em px — suficiente para banners de e-mail com boa qualidade. */
const MAX_SIDE = 1600;

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Falha ao gerar imagem.'))),
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Redimensiona e comprime para JPEG, mantendo o ficheiro final ≤ 1MB quando possível.
 */
export async function compressImageForBid(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Formato de imagem não suportado neste dispositivo.');
  }

  try {
    let { width: iw, height: ih } = bitmap;
    const scale = Math.min(1, MAX_SIDE / Math.max(iw, ih));
    let width = Math.round(iw * scale);
    let height = Math.round(ih * scale);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível processar a imagem.');

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.88;
    let blob = await canvasToJpegBlob(canvas, quality);

    while (blob.size > MAX_BYTES && quality > 0.42) {
      quality -= 0.07;
      blob = await canvasToJpegBlob(canvas, quality);
    }

    while (blob.size > MAX_BYTES && Math.max(width, height) > 512) {
      width = Math.max(256, Math.round(width * 0.82));
      height = Math.max(256, Math.round(height * 0.82));
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(bitmap, 0, 0, width, height);
      quality = Math.min(quality, 0.78);
      blob = await canvasToJpegBlob(canvas, quality);
    }

    if (blob.size > MAX_BYTES) {
      throw new Error('Não foi possível reduzir a imagem abaixo de 1MB.');
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'bid-image';
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
