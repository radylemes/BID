# Deploy BID no aaPanel

## Erro `connect() failed (111: Connection refused)` na porta 4201

O log indica que o Nginx/Apache encaminha o site para `http://127.0.0.1:4201/` (`ng serve`). Em produção essa porta **não deve** estar em uso.

**Solução:** sirva os ficheiros estáticos do build Angular:

```text
/www/server/BID/frontend/dist/frontend/browser
```

(Se o projeto estiver em `BID_NEW/BID`, ajuste o caminho no Nginx.)

Use o ficheiro `deploy/nginx-bid-production.conf.example` (root + `try_files`; proxy só em `/api/`; `/uploads/` por `alias` no disco).

### Por que o aaPanel volta para a porta 4201

Sites criados como **projeto Node** no aaPanel geram automaticamente:

```nginx
location / {
    proxy_pass http://127.0.0.1:4201;
}
```

Sempre que guardar o projeto Node ou clicar em **Restart** no painel, o aaPanel **pode reescrever** o Nginx com esse proxy. Só editar o ficheiro `.conf` não basta se o projeto Node continuar ativo.

### Passos no aaPanel (ordem importante)

1. **Website** → **Node Project** (Projeto Node)
2. Localize o projeto do BID (ex.: `frontend`, `BIDfrontend`) — porta **4201**, script `watch` ou `ng serve`
3. Clique em **Stop** / **Desligar** (não precisa de `ng serve` em produção)
4. **Website** → site `bid.allianzparque.com.br` → **Configuração** (ícone de ficheiro / Configuration)
5. Substitua o bloco `location / { ... proxy_pass ... 4201 ... }` por:

   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

   Ou cole o `server { ... }` completo de `deploy/nginx-bid-production.conf.example`.

6. Confirme o **root**:

   ```nginx
   root /www/server/BID/frontend/dist/frontend/browser;
   ```

7. **Guardar** → **Reload** / **Service** → recarregar Nginx
8. **Não** volte a ligar o projeto Node na porta 4201 para este domínio em produção

### Alternativa definitiva

- Criar o site como **PHP/HTML estático** (não como Node), com o mesmo domínio e o Nginx do exemplo; ou
- Manter o backend só em **PM2** na porta **3005** (`deploy/ecosystem.config.cjs`) e o frontend apenas como ficheiros em `dist/`.

## Erro na porta 3005 (API)

O backend Node deve estar sempre ativo na porta definida em `backend/.env` (`PORT=3005`).

```bash
cd /www/server/BID_NEW/BID/backend
npm install --production
pm2 start /www/server/BID_NEW/BID/deploy/ecosystem.config.cjs
pm2 save
```

Confirme: `ss -tlnp | grep 3005`

## Build do frontend (inclui vídeo de login)

O vídeo fica em `frontend/src/assets/HOME-SITE.mp4` (~70 MB) e é copiado para o build.

```bash
cd /www/server/BID_NEW/BID/frontend
npm ci
npm run build
```

Verifique se existe:

```text
frontend/dist/frontend/browser/assets/HOME-SITE.mp4
```

## Vídeo não aparece (site OK com proxy 4201)

O `location /` envia **tudo** para o `ng serve`, incluindo `/assets/HOME-SITE.mp4` (~70 MB). O dev server costuma falhar nesse ficheiro; o login fica só com a imagem de poster.

**Correção:** adicione **antes** do `location / { proxy_pass ... 4201`:

```nginx
location ^~ /assets/ {
    root /www/server/BID/frontend/dist/frontend/browser;
    try_files $uri =404;
    expires 7d;
    add_header Cache-Control "public";
    access_log off;
    gzip off;
}
```

Confirme no servidor que o ficheiro existe (após `npm run build`):

```bash
ls -lh /www/server/BID/frontend/dist/frontend/browser/assets/HOME-SITE.mp4
```

Teste no browser: `https://bid.allianzparque.com.br/assets/HOME-SITE.mp4` → deve devolver **200**.

Nota: o `root` do site pode ficar em `dist/frontend`, mas este bloco usa explicitamente a pasta **`browser`**, onde o Angular gera os assets.

## Teste rápido do vídeo

Após o deploy estático, abra no browser:

```text
https://bid.allianzparque.com.br/assets/HOME-SITE.mp4
```

- **404** → falta build ou root do Nginx incorreto.
- **502 / connection refused** → ainda está em proxy para 4201.
- **200** → o ficheiro está OK; se o login não mostrar vídeo, limpe cache do browser.
