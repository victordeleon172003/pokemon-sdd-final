---
spec: 01
titulo: Barra de vida y daño
estado: aprobado
---

# Spec 01 — Barra de vida y daño

## Objetivo

Dotar a Charizard y a un rival de puntos de vida visibles que disminuyen al recibir ataques y que, al llegar a cero, dejan al Pokémon derrotado y sin poder actuar.

## Alcance

Esta funcionalidad añade un sistema básico de combate sobre el juego actual:

- Puntos de vida visibles (barras) para Charizard y para un rival.
- Un ataque de Charizard activado con la tecla **J**, con alcance máximo de 120 px y cooldown de 400 ms, que resta 20 puntos de vida al rival.
- Daño por contacto del rival: cuando Charizard está a 120 px o menos, el rival resta 10 puntos de vida con un cooldown de 800 ms.
- Estado de derrota cuando la vida llega a cero: barra vacía, mensaje de derrota y el Pokémon derrotado deja de actuar.

**Dónde se integra:**

- Archivo principal: `game.js` (bucle `update(dt)` y `render()`), sobre el canvas 2D existente.
- Controles: se conserva el movimiento con WASD y flechas; se añade la tecla **J** para atacar.
- Assets: se reutiliza el spritesheet de Charizard para el rival (con un tinte distinto). No se modifica `spritesheet.js`.
- Animaciones: se reutilizan las animaciones existentes `attack`, `jab` (ataque) y `hurt` (retroalimentación). El movimiento y las animaciones actuales de Charizard se conservan sin cambios.
- Opcionalmente, `index.html`: actualizar el texto de ayuda para mencionar "J para atacar".

**Valores fijos:** HP máximo 100 para ambos · daño Charizard→rival 20 · daño rival→Charizard 10 por contacto · alcance 120 px · cooldown de ataque 400 ms · cooldown de contacto del rival 800 ms · rival estático.

## Exclusiones

Cosas que deliberadamente NO se implementan en este spec:

- No hay fuego ni proyectiles (Lanzallamas y similares).
- No hay menú de cuatro ataques.
- No hay puntos de poder (PP).
- No hay niveles ni experiencia.
- No hay sistema de turnos ni inteligencia artificial para el rival (el rival es estático y solo hace daño por contacto).
- No se persiste el estado entre sesiones (al recargar, la vida vuelve a 100).

## Modelo de datos

Estado del jugador (extiende el objeto `player` actual):

- `player.hp: number` — vida actual, empieza en 100.
- `player.maxHp: 100` — vida máxima.
- `player.alive: boolean` — `true` mientras `hp > 0`.
- `player.attackCooldownMs: number` — tiempo restante de cooldown del ataque (ms).

Estado del rival (nuevo objeto):

- `rival.x: number`, `rival.y: number` — posición fija en pantalla.
- `rival.dir: string` — dirección de dibujo (por convención existente).
- `rival.hp: number` — vida actual, empieza en 100.
- `rival.maxHp: 100` — vida máxima.
- `rival.alive: boolean` — `true` mientras `hp > 0`.
- `rival.contactCooldownMs: number` — tiempo restante del cooldown de contacto (ms).

Constantes de combate:

- `MAX_HP = 100`
- `CHARIZARD_DAMAGE = 20`
- `RIVAL_DAMAGE = 10`
- `ATTACK_RANGE = 120` (px)
- `ATTACK_COOLDOWN_MS = 400`
- `CONTACT_COOLDOWN_MS = 800`

Función central:

- `applyDamage(target, amount)` — resta `amount` a `target.hp`, la limita a un mínimo de 0 y marca `target.alive = false` si llega a 0.

## Pasos de implementación

Cada paso deja el juego ejecutable. Para verificar, recargar la página en el navegador.

1. **Modelo de combate (sin dibujar).** Añadir a `player` los campos `hp`, `maxHp: 100`, `alive`; crear un `rival` con `x`, `y`, `dir`, `hp`, `maxHp: 100`, `alive`. Verificación: al recargar, ambos arrancan con `hp: 100` (comprobar en consola); el juego sigue moviéndose igual.

2. **Rival visible y barras de vida.** Pre-renderizar el rival con un tinte distinto en un canvas offscreen y dibujarlo en su posición. Dibujar dos barras de HP (fondo + relleno proporcional a `hp / maxHp`) en las esquinas superiores. Verificación: al recargar se ven ambos Pokémon y sus barras llenas 100/100; el movimiento y las animaciones de Charizard no cambian.

3. **`applyDamage(target, amount)`.** Restar `amount` a `target.hp`, limitar con `Math.max(0, ...)` y poner `target.alive = false` si llega a 0. Verificación: invocarla desde consola sobre el rival y ver que su barra baja; al sobrepasar el total, la barra queda en 0 y nunca muestra valores negativos.

4. **Ataque con tecla J.** Al pulsar J, si `player.alive` y el cooldown de 400 ms se cumplió, reproducir la animación `attack`/`jab` existente; si la distancia al rival es de 120 px o menos y el rival está vivo, aplicar 20 de daño y reiniciar el cooldown. Verificación: cerca del rival, pulsar J baja su barra en 20; lejos, no ocurre nada; el cooldown de 400 ms se respeta.

5. **Retroalimentación de daño.** Al recibir un golpe, reproducir `hurt`/parpadeo breve en el Pokémon dañado. Verificación: al impactar se aprecia visualmente el efecto de daño.

6. **Contacto del rival.** Si Charizard está a 120 px o menos del rival vivo, el rival aplica 10 de daño con cooldown de 800 ms (por contacto, sin IA ni turnos). Verificación: al acercarse, la barra de Charizard baja de 10 en 10 respetando el cooldown.

7. **Derrota.** Al llegar a 0, la barra queda vacía, aparece un mensaje de derrota (`"¡Rival derrotado!"` si cae el rival, `"¡Has sido derrotado!"` si cae Charizard) y el Pokémon derrotado deja de moverse y de atacar; el otro continúa. Verificación: al agotar una barra, aparece el mensaje y el derrotado queda inactivo; si Charizard sigue vivo, el movimiento original sigue funcionando.

**Archivos a tocar:** `game.js` (principal); opcionalmente el texto de ayuda en `index.html`. `spritesheet.js` **no** se modifica.

## Criterios de aceptación

1. Al iniciar, ¿ambos Pokémon muestran 100/100 HP? — Sí.
2. Al presionar J cerca del rival, ¿este pierde 20 HP? — Sí.
3. Si Charizard está demasiado lejos (más de 120 px), ¿el golpe no causa daño? — Sí.
4. Cuando Charizard toca al rival, ¿recibe 10 puntos de daño respetando el cooldown de 800 ms? — Sí.
5. ¿Ninguna barra de vida puede bajar de cero? — Sí.
6. Al llegar a cero, ¿aparece un mensaje de derrota y el Pokémon derrotado no puede seguir actuando? — Sí.
7. ¿El movimiento original de Charizard continúa funcionando mientras está vivo? — Sí.

## Decisión descartada

**Atacar con clic del ratón (en vez de la tecla J).** Se descartó porque obliga a calcular la caja de colisión del sprite bajo el cursor y a convertir las coordenadas del ratón al espacio del canvas (que se muestra escalado por CSS), lo que añade complejidad y puntos de fallo. Además resulta menos parecido a un juego tipo Smash. La tecla J es más simple de implementar y de verificar, y encaja con el movimiento por teclado ya existente.
