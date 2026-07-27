# Ley de Tierras — tres landings

Sitio multipágina sin dependencias. Debe servirse por HTTP porque las landings 1 y 3 cargan su contenido con `fetch()` desde archivos JSON.

## Desarrollo local

Desde la raíz del proyecto:

```bash
npm run dev
```

Luego abrir `http://localhost:4173`.

No hace falta ejecutar `npm install`: el proyecto no tiene dependencias.

## Build de producción

```bash
npm run build
```

El comando genera `dist/`, que contiene el sitio estático listo para subir a cualquier servidor web. Para probar exactamente ese resultado:

```bash
npm run preview
```

## Publicar en Vercel

El repositorio incluye `vercel.json`; Vercel ejecutará `npm run build` y publicará `dist/`.

1. Subir el proyecto a un repositorio Git.
2. En Vercel, elegir **Add New → Project** e importar el repositorio.
3. Mantener el framework como **Other**. La configuración de build y output se toma automáticamente de `vercel.json`.
4. Publicar.

También se puede desplegar con Vercel CLI desde la raíz:

```bash
npx vercel
```

Las URLs finales serán `/`, `/landing-1/`, `/landing-2/` y `/landing-3/`.

## Landing 1: scrollytelling

Editar `landing-1/config.json`.

- `title` e `intro`: portada del relato.
- `mediaBasePath`: carpeta base de los medios.
- `steps`: se puede agregar o quitar cualquier cantidad de pasos.
- Cada paso acepta `text`, `kicker`, `media`, `type` (`image` o `video`) y `alt`.

Colocar las imágenes o videos en:

```text
src/media/landing-1/
```

El ejemplo espera `campo-01.jpg` hasta `campo-10.jpg`. Se pueden cambiar esos nombres en el JSON. Para un video, por ejemplo:

```json
{
  "text": "Una frase del relato.",
  "kicker": "Un título breve",
  "media": "campo-03.mp4",
  "type": "video",
  "alt": "Descripción accesible del video"
}
```

Si un archivo no existe se muestra un placeholder con el nombre esperado.

## Landing 2: afiche

El texto se ajusta automáticamente y se genera como PNG de 1080 × 1920. La exportación usa `src/fonts/MalvinasSans-Regular.otf`. En navegadores compatibles se abre el menú nativo para compartir; en los demás se descarga el archivo.

## Landing 3: cuestionario

Editar `landing-3/config.json`. Cada pregunta contiene:

- `question` y `shortLabel`.
- `unit`, `min`, `max` y `step` para controlar la respuesta numérica.
- `actual` para el valor de comparación.
- `context` e `impact` para explicar el dato.

Los cinco datos incluidos son ilustrativos y deben reemplazarse antes de publicar. Cada resultado genera una placa PNG de 1080 × 1350 para compartir o descargar.
