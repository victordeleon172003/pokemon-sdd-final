---
spec: 02
titulo: Menú de ataques
estado: aprobado
---

# Spec 02 — Menú de ataques

## Objetivo

Dotar a Charizard de un menú desplegable con cuatro técnicas de PP limitados, que consumen PP al usarse y reutilizan las animaciones existentes, incluyendo un Lanzallamas visible con alcance de 400 px.

## Alcance

Esta funcionalidad añade un sistema de ataques con menú sobre el juego actual (Spec 01):

- Un menú desplegable con cuatro técnicas: Golpe, Lanzallamas, Garra Dragón y Giro Fuego.
- PP limitados por técnica; usar una técnica consume 1 PP y a 0 PP no puede ejecutarse.
- Reutilización de animaciones existentes de Charizard (`attack`, `shoot`, `swing`, `rotate`).
- Un proyectil de fuego procedural (dibujado por código) para Lanzallamas, con alcance de 400 px.
- Conservación de todo lo del Spec 01: movimiento, barras de vida, daño, animación `hurt`, derrota y reinicio a 100/100 al recargar.

**Dónde se integra:**

- `game.js`: lógica de movimientos, ejecución (`useMove`), proyectil, teclas y actualización del menú.
- `index.html`: contenedor del menú desplegable.
- `styles.css`: estilos del menú.
- `spritesheet.js` **no** se modifica.
- Controles: se conserva el movimiento con WASD/flechas; **J** ejecuta Golpe; **Tab** abre/cierra el menú; con el menú abierto, ↑/↓ o W/S navegan, **Enter** ejecuta y **Esc** cierra.

**Tabla de movimientos (valores definitivos):**

| # | Técnica | Animación | Tipo | Daño | Alcance | PP | Cooldown |
|---|---------|-----------|------|------|---------|----|----------|
| 1 | Golpe | `attack` | Cuerpo a cuerpo | 20 | 120 px | 25 | 400 ms |
| 2 | Lanzallamas | `shoot` | Proyectil (dirección de la mirada) | 40 | 400 px | 10 | 700 ms |
| 3 | Garra Dragón | `swing` | Cuerpo a cuerpo | 30 | 120 px | 15 | 600 ms |
| 4 | Giro Fuego | `rotate` | Cuerpo a cuerpo radial | 35 | 150 px | 10 | 800 ms |

**Flujo del menú y controles:**

- Cerrado: WASD/flechas mueven; J ejecuta Golpe (consume PP de Golpe).
- Tab abre/cierra (con `e.preventDefault()` para que el navegador no cambie el foco).
- Con el menú abierto: ↑/↓ o W/S cambian la selección; Enter ejecuta la seleccionada; Esc cierra.
- El menú abierto pausa el juego (movimiento y contacto del rival).
- Tras ejecutar una técnica, el menú se cierra.
- Las técnicas con 0 PP se muestran atenuadas/deshabilitadas.
- Sin teclas de atajo 1–4: solo menú + J.

## Exclusiones

Cosas que deliberadamente NO se implementan en este spec:

- No hay IA del rival (persecución o esquiva); se planificará en un spec aparte.
- No hay tipos/elementos, precisión ni golpes críticos.
- No hay restauración de PP (ni objetos, ni descanso).
- El rival no se mueve (sigue estático).
- No se añaden sprites nuevos: el fuego de Lanzallamas es procedural.
- No hay sonido ni persistencia (al recargar, PP y vida vuelven a sus valores iniciales).
- Nada fuera de las cuatro técnicas y el efecto de Lanzallamas.

## Modelo de datos

Movimientos (única fuente de verdad para lógica y menú):

- `MOVES: Array` — lista de las cuatro técnicas.
- `move.id: string` — identificador (`golpe`, `lanzallamas`, `garra`, `giro`).
- `move.nombre: string` — nombre visible.
- `move.anim: string` — animación reutilizada (`attack`, `shoot`, `swing`, `rotate`).
- `move.tipo: string` — `melee` o `proyectil`.
- `move.dano: number` — daño que aplica (20, 40, 30, 35).
- `move.rango: number` — alcance en px (120, 400, 120, 150).
- `move.pp: number` — PP actual (empieza en `maxPp`).
- `move.maxPp: number` — PP máximo (25, 10, 15, 10).
- `move.cooldownMs: number` — cooldown propio en ms (400, 700, 600, 800).

Estado del jugador (extiende el objeto `player` del Spec 01):

- `player.attackCooldowns: object` — tiempo restante por movimiento (`golpe`, `lanzallamas`, `garra`, `giro`).
- `player.activeMove: object|null` — movimiento en ejecución.
- `player.attacking: boolean` — ya existe; indica si hay una animación de ataque activa.
- `player.attackElapsedMs: number` — ya existe; tiempo transcurrido de la animación activa.

Estado del menú y proyectiles:

- `menu.open: boolean` — si el menú está abierto.
- `menu.selection: number` — índice seleccionado (0–3).
- `projectiles: Array` — proyectiles de fuego activos.
- `projectile.x`, `projectile.y: number` — posición.
- `projectile.dir: string` — dirección de viaje.
- `projectile.remaining: number` — distancia restante hasta agotar los 400 px.
- `projectile.damage: number` — daño al impactar.

Función central:

- `useMove(move)` — valida `player.alive`, `move.pp > 0` y el cooldown del movimiento; descuenta 1 PP; activa la animación del movimiento; aplica el efecto según `move.tipo`.

## Pasos de implementación

Cada paso deja el juego ejecutable. Para verificar, recargar la página en el navegador.

1. **Modelo de movimientos.** Definir `MOVES` con id, nombre, animación, daño, tipo, rango, `pp`/`maxPp` (25/10/15/10) y `cooldownMs`; añadir cooldowns independientes en el jugador. Sin UI todavía. Verificación: el juego se comporta igual que antes y, al inspeccionar, los cuatro movimientos existen con sus PP iniciales.

2. **Ejecución generalizada.** Implementar `useMove(move)` que valida `player.alive`, `pp > 0` y el cooldown del movimiento; descuenta 1 PP; activa la animación del movimiento con su `totalMs`; aplica daño cuerpo a cuerpo. **J** pasa a llamar a `useMove(Golpe)`. Verificación: J causa 20 de daño a ≤120 px y descuenta 1 PP de Golpe.

3. **Las cuatro técnicas.** Conectar cada técnica a su animación, daño, alcance y cooldown de la tabla. **Importante:** en este paso Lanzallamas solo reproduce su animación (`shoot`) como prueba; **no consume PP ni causa daño todavía** (el Lanzallamas funcional llega en el Paso 5). Verificación: Golpe, Garra Dragón y Giro Fuego aplican su daño cuando corresponde; las técnicas con 0 PP no se ejecutan.

4. **Menú HTML/CSS desplegable.** Añadir el contenedor del menú en `index.html` y sus estilos en `styles.css`, generado desde `MOVES`; tab abrir/cerrar, navegación ↑/↓ o W/S, Enter ejecuta, Esc cierra; el menú abierto pausa el juego; las técnicas con 0 PP salen deshabilitadas; se cierra tras ejecutar. Verificación visual: las cuatro técnicas con sus PP (25/25, 10/10, 15/15, 10/10) y la navegación.

5. **Lanzallamas funcional (proyectil).** Al ejecutar Lanzallamas, crear un proyectil de fuego dibujado por código desde `frame.head` en la dirección de `player.dir`, que viaja hasta 400 px. Si alcanza al rival vivo, aplica 40 de daño y activa su `hurt`. **A partir de este paso, Lanzallamas consume 1 PP** y descuenta su cooldown. Verificación: el fuego sale de Charizard en la dirección de la mirada, alcanza al rival y le baja la barra; con 0 PP no se ejecuta.

6. **Integración y regresión.** Revisar que el menú abierto pausa movimiento y contacto del rival, que Charizard derrotado no puede atacar ni abrir/usar el menú, y que al recargar vuelven 100/100 de vida y los PP iniciales. Verificación final: se conservan barras, `hurt`, mensajes de derrota y reinicio.

**Archivos a tocar:** `game.js`, `index.html`, `styles.css`. `spritesheet.js` **no** se modifica.

## Criterios de aceptación

1. Al pulsar Tab, ¿aparece el menú con las cuatro técnicas y sus PP iniciales (Golpe 25/25, Lanzallamas 10/10, Garra Dragón 15/15, Giro Fuego 10/10)? — Sí.
2. ¿Usar una técnica descuenta exactamente 1 PP de esa técnica y no de las otras? — Sí.
3. ¿Cuando una técnica está a 0 PP deja de poder ejecutarse, incluido Golpe con J? — Sí.
4. ¿J ejecuta Golpe, causa 20 de daño a ≤120 px y consume 1 PP de Golpe? — Sí.
5. ¿Garra Dragón causa 30 de daño a ≤120 px y Giro Fuego 35 en un radio de ≤150 px? — Sí.
6. ¿Lanzallamas muestra un fuego visible en la dirección de la mirada, alcanza hasta 400 px y causa 40 de daño al impactar al rival vivo? — Sí.
7. ¿El menú abierto pausa el juego y se cierra tras ejecutar una técnica? — Sí.
8. ¿Se conservan las barras de vida, la animación `hurt`, los mensajes de derrota y el reinicio a 100/100 y PP iniciales al recargar? — Sí.

## Decisión descartada

**Teclas de atajo 1–4 además del menú.** Se descartó por decisión del usuario: mantener un único flujo de acceso claro (menú desplegable + J para Golpe) evita duplicar la vía de acceso a las técnicas y posibles conflictos con futuras teclas. El menú desplegable con Tab ya cubre la selección de las cuatro técnicas.
