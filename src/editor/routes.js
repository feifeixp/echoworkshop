/* 地图连线走线缓存 */
import {S} from '../app/store.js';
import {computeLayout} from '../core/layout.js';

export let ROUTES=null;
export function setRoutes(lay){ROUTES={routes:lay.routes,snap:lay.pos}}
export function autoLayout(){const lay=computeLayout(S.G);for(const [id,p] of Object.entries(lay.pos)){S.G.nodes[id].x=p.x;S.G.nodes[id].y=p.y}S.G.layoutV=2;setRoutes(lay)}
export function adoptRoutes(){const lay=computeLayout(S.G);if(Object.entries(lay.pos).every(([id,p])=>S.G.nodes[id].x===p.x&&S.G.nodes[id].y===p.y))setRoutes(lay);else ROUTES=null}
export function routeFor(u,t){if(!ROUTES)return null;const r=ROUTES.routes[u+'>'+t];if(!r)return null;const s=ROUTES.snap,a=S.G.nodes[u],b=S.G.nodes[t];
  if(!s[u]||!s[t]||s[u].x!==a.x||s[u].y!==a.y||s[t].x!==b.x||s[t].y!==b.y)return null;return r}
