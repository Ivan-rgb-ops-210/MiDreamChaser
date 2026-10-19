# MiDreamChaser

## Preparación local

El token de football-data.org es privado y no se guarda en Git. Cada checkout local necesita su propio archivo `DreamChaser/.env`.

1. Copiá `DreamChaser/.env.example` como `DreamChaser/.env`.
2. Reemplazá `pega_tu_api_token_aqui` por tu token de football-data.org.
3. Desde la carpeta raíz ejecutá `npm install` y luego `npm run dev`.

Si GitHub Desktop muestra cambios en `dist`, `node_modules` o `.vite`, son archivos generados y no deben incluirse en commits. El `.gitignore` raíz ya los excluye.

## Publicar en Vercel

La app está en `DreamChaser/`. Al importar este repositorio en Vercel, elegí `DreamChaser` como **Root Directory**. Vercel detecta Vite; el comando de build es `npm run build` y el directorio de salida es `dist`.

En **Project Settings → Environment Variables**, agregá `FOOTBALL_DATA_ORG_API_KEY` con el token de football-data.org para Production (y Preview si también querés habilitarlo en despliegues de prueba). No uses el prefijo `VITE_`: el token debe permanecer del lado del servidor. Las rutas `/api/football/...` se ejecutan como Vercel Function.

Después de guardar la variable, hacé un nuevo deployment para que entre en vigor. La app consulta la API externa desde esa función; los límites y permisos de datos dependen de tu cuenta de football-data.org.
