# MiDreamChaser

## Preparación local

El token de football-data.org es privado y no se guarda en Git. Cada checkout local necesita su propio archivo `DreamChaser/.env`.

1. Copiá `DreamChaser/.env.example` como `DreamChaser/.env`.
2. Reemplazá `pega_tu_api_token_aqui` por tu token de football-data.org.
3. Desde la carpeta raíz ejecutá `npm install` y luego `npm run dev`.

Si GitHub Desktop muestra cambios en `dist`, `node_modules` o `.vite`, son archivos generados y no deben incluirse en commits. El `.gitignore` raíz ya los excluye.
