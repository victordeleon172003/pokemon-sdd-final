---
name: crear-spec
description: Convierte un plan refinado y aprobado de una funcionalidad del juego Pokémon (Charizard, canvas 2D) en una especificación Markdown dentro de specs/. Uso cuando se invoque /crear-spec con el número y nombre de la funcionalidad.
metadata:
  opencode/slash: "true"
---

# crear-spec

Escribe la especificación de una funcionalidad para el ejercicio SDD. **No implementa código ni crea commits**: solo produce el documento Markdown y se detiene para permitir su revisión.

## Entrada

Se invoca así (número + nombre de la funcionalidad):

```
/crear-spec <NN> <nombre-de-la-funcionalidad>
```

Ejemplo:
```
/crear-spec 01 moverse-con-teclado
```

El plan a convertir debe existir previamente y contar con **aprobación explícita** del usuario. Si no existe un plan aprobado o falta el número/nombre, pregúntalo o indica que no procede: la skill no inventa un plan por su cuenta.

## Salida

Un único archivo Markdown:

```
specs/<NN>-<nombre-de-la-funcionalidad>.md
```

Si la carpeta `specs/` no existe, créala. Nunca sobrescribir un spec existente sin confirmación. Nombre en minúsculas, separando palabras con guiones, así `01-moverse-con-teclado.md`.

## Contenido obligatorio de cada spec

El archivo DEBE incluir, en orden:

1. **Frontmatter** con `spec` (número), `titulo` y `estado: aprobado`.
2. **Objetivo** — exactamente una frase que define qué se logra al terminar.
3. **Alcance** — qué incluye la funcionalidad y dónde se integra en el juego (archivos, pantalla, controles).
4. **Exclusiones** — mínimo **dos** cosas que deliberadamente NO se implementan (p. ej. "no persistir entre sesiones", "sin ataques", "sin animación de daño").
5. **Modelo de datos** — nombres concretos y sus propiedades/tipos, ej. `player.x`, `player.dir`. Solo lo necesario para el spec.
6. **Pasos de implementación** — lista **numerada** de pasos pequeños y en orden. Cada paso debe dejar el juego **funcionando** (los pasos siguientes suponen que el anterior ya se probó). Indicar en cada paso cómo verificarlo rápido (recargar en el navegador).
7. **Criterios de aceptación** — mínimo **tres** criterios verificables con respuesta **sí/no**.
8. **Decisión descartada** — una alternativa considerada y rechazada, con su **justificación** breve.

Referencias técnicas permitidas (consultar sin leer `spritesheet.js` completo):
- `README.md` (reglas para la IA y animaciones disponibles).
- `spritesheet.js` solo cabecera (líneas 1–37) y el bloque de la animación necesaria con `grep`.
- Estructura actual: `index.html`, `styles.css`, `game.js`.

## Reglas de proceso

- **Prohibido**: escribir o modificar código del juego (`index.html`, `styles.css`, `game.js`, `spritesheet.js`, assets), instalar dependencias o hacer commits.
- Completado el documento, **detenerse**: no continuar con specs 01/02 ni con implementación. Resumir al usuario qué archivo se creó, qué contiene y pedir su revisión.
- No usar emojis en el documento. Responder en español.