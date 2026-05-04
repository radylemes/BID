import { environment } from '../../environments/environment';

type EnvWithUploads = typeof environment & { uploadsPublicBase?: string };

/**
 * Prefixo HTTP para ficheiros públicos em `uploads/` (avatars, banners).
 * - **Por omissão** (sem `uploadsPublicBase`): `/uploads/…` na mesma origem — típico com Nginx a servir ficheiros na raiz do site.
 * - **`uploadsPublicBase: '/api'`**: URLs em `/api/uploads/…` quando só o Node expõe estáticos sob a API.
 */
function uploadsUrlPrefix(): string {
  const base = (environment as EnvWithUploads).uploadsPublicBase;
  if (base != null && String(base).trim() !== '') {
    return `${String(base).replace(/\/+$/, '')}/uploads`;
  }
  return '/uploads';
}

/**
 * URL pública para ficheiros gravados em `backend/uploads/` (ex.: avatares, banners).
 */
export function uploadsPublicUrl(relativePath: string): string {
  if (!relativePath || relativePath === 'db') return '';
  if (relativePath.startsWith('http')) return relativePath;
  let clean = relativePath.replace(/\\/g, '/').replace(/^\//, '');
  const uploadsIdx = clean.indexOf('uploads/');
  if (uploadsIdx >= 0) clean = clean.slice(uploadsIdx + 'uploads/'.length);
  return `${uploadsUrlPrefix()}/${clean}`;
}
