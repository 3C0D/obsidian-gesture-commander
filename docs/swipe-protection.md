# Protection contre déclenchement pendant click-and-drag (modifier + swipe)

Ce document décrit en détail l'implémentation utilisée dans ce dépôt pour empêcher qu'un geste "modifier + swipe" ne se déclenche pendant un clic maintenu (click-and-drag). Copiez les extraits ci-dessous dans l'autre plugin pour appliquer la même protection.

## Résumé

- Objectif : éviter que le geste de swipe (détecté quand des modificateurs sont pressés + mouvement du pointeur) ne se déclenche pendant un drag ou une sélection.
- Méthode : maintenir un état `mouse.isButtonDown` et refuser d'armer ou de conserver l'armement du geste quand un bouton est appuyé. Désarmer immédiatement si un `pointerdown` arrive alors que les modificateurs étaient déjà tenus.

## État nécessaire

```typescript
// Exemple minimal à copier
export class MouseState {
  /** True while any pointer button is held (between pointerdown and pointerup). */
  isButtonDown = false;
}

// Clé : un objet keyGesture similaire à :
export class KeyGestureState {
  armed = false; // modificateurs tenus et prêt à track
  isTracking = false; // on a seedé startX/startY
  done = false; // un swipe valide a déjà été réalisé
  startX = 0;
  startY = 0;
}
```

## Handlers à intégrer (extraits prêts à coller)

1) `pointerDownHandler`

```typescript
export function pointerDownHandler(plugin: any, _e: PointerEvent): void {
  // marquer l'état du bouton
  plugin.mouse.isButtonDown = true;
  // si le geste était armé (modificateurs tenus), désarmer immédiatement
  plugin.keyGesture.armed = false;
  plugin.keyGesture.isTracking = false;
  plugin.keyGesture.done = false;
}
```

2) `pointerUpHandler`

```typescript
export function pointerUpHandler(plugin: any, _e: PointerEvent): void {
  plugin.mouse.isButtonDown = false;
}
```

3) `keydownHandler` (armement du geste)

```typescript
const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta', 'AltGraph']);

export function keydownHandler(plugin: any, e: KeyboardEvent): void {
  const { keyGesture, settings } = plugin;
  if (!settings.useTrackpadSwipe) return;
  if (!MODIFIER_KEYS.has(e.key)) return;
  if (keyGesture.armed) return;
  // NE PAS armer si un bouton est enfoncé (click-and-drag)
  if (plugin.mouse.isButtonDown) return;
  // your modifier check here (exact-match)
  if (!areModifierKeysPressed(e, settings)) return;
  keyGesture.armed = true;
  keyGesture.done = false;
}
```

4) `keyupHandler` (désarmement)

```typescript
export function keyupHandler(plugin: any, e: KeyboardEvent): void {
  if (!MODIFIER_KEYS.has(e.key)) return;
  if (areModifierKeysPressed(e, plugin.settings)) return; // toujours match exact
  plugin.keyGesture.armed = false;
  plugin.keyGesture.isTracking = false;
  plugin.keyGesture.done = false;
}
```

5) `pointerBlockHandler` (optionnel : bloque les pointer events en capture quand armé)

```typescript
export function pointerBlockHandler(plugin: any, e: PointerEvent): void {
  if (!plugin.keyGesture.armed) return;
  // sécurité : si bouton enfoncé, ne PAS bloquer (c'est un drag)
  if (plugin.mouse.isButtonDown) return;
  e.preventDefault();
  e.stopPropagation();
}
```

6) `mousemoveHandler` (mesure et déclenchement du swipe)

```typescript
export function mousemoveHandler(plugin: any, e: MouseEvent): void {
  const { keyGesture, settings } = plugin;
  if (!keyGesture.armed || keyGesture.done) return;

  // premier mousemove après arming : seed start position
  if (!keyGesture.isTracking) {
    keyGesture.isTracking = true;
    keyGesture.startX = e.clientX;
    keyGesture.startY = e.clientY;
    e.preventDefault();
    return;
  }

  const deltaX = e.clientX - keyGesture.startX;
  const deltaY = e.clientY - keyGesture.startY;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  const threshold = settings.trackpadThreshold;

  if (absX > threshold || absY > threshold) {
    // action en fonction de la direction
    // ... (ex: toggle, reveal)
    keyGesture.done = true;
    keyGesture.isTracking = false;
  }
  e.preventDefault();
}
```

> Remarques importantes :
> - La fonction `areModifierKeysPressed` doit vérifier un "exact match" :
>   - chaque modificateur requis doit être pressé
>   - chaque modificateur non requis doit ne PAS être pressé
> - Gestion spéciale pour `AltGraph` (certains claviers signalent AltGr comme Alt+Ctrl simultanés).

## Intégration dans l'autre plugin

- Copier `MouseState` et `KeyGestureState` (ou adapter vos structures existantes).
- Coller les handlers ci-dessus aux emplacements correspondant aux écouteurs clavier/pointeur.
- Veiller à enregistrer les listeners en phase de capture pour `pointerdown`/`pointerup` si vous souhaitez désarmer tôt.

Exemple d'enregistrement recommandé :

```typescript
window.addEventListener('pointerdown', (e) => pointerDownHandler(plugin, e), { capture: true });
window.addEventListener('pointerup', (e) => pointerUpHandler(plugin, e), { capture: true });
window.addEventListener('keydown', (e) => keydownHandler(plugin, e));
window.addEventListener('keyup', (e) => keyupHandler(plugin, e));
window.addEventListener('pointermove', (e) => pointerBlockHandler(plugin, e), { capture: true });
window.addEventListener('mousemove', (e) => mousemoveHandler(plugin, e));
```

## Pourquoi coller exactement ceci ?

- Le coeur du problème est temporel : il faut refuser d'armer si un bouton est enfoncé et désarmer immédiatement si un `pointerdown` survient quand les modificateurs étaient déjà tenus.
- Cette stratégie évite les faux positifs pendant les sélections/drag et réduit les interférences avec d'autres plugins.

---

Si vous voulez, je peux également :
- Fournir un extrait prêt à coller (un seul fichier TypeScript autonome).
- Ajouter un court README d'intégration pour l'autre plugin.

