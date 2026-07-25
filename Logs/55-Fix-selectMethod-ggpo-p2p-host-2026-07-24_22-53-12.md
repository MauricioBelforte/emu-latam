# Log 55: Fix selectMethod llama ggpo-p2p-host cuando engine es ggpo

## Fecha
2026-07-24 22:53:12

## Descripción
El host llamaba `p2p-host` independientemente del engine al enviar un reto via método P2P. Cuando el engine era GGPO, esto significaba que `handleGGPOP2PHostRegisterGuest` no encontraba `hostManager` (creado solo por `ggpo-p2p-host`) y respondía "no active ggpo p2p host manager".

## Código original
```typescript
// ChallengeContext.tsx:109
const result = await (window as any).electron.ipcRenderer.invoke("p2p-host");
```

## Código nuevo
```typescript
// ChallengeContext.tsx:109
const result = await (window as any).electron.ipcRenderer.invoke(engine === "ggpo" ? "ggpo-p2p-host" : "p2p-host");
```

## Archivos modificados
- `client/src/context/ChallengeContext.tsx` — línea 109: `"p2p-host"` → `engine === "ggpo" ? "ggpo-p2p-host" : "p2p-host"`

## Tests
- `test_stable_flows.js`: 50/51 (mismo fail preexistente de config tolerante)
- `test_p2p_ggpo.js`: 39/39 (100%)
- `test_ggpo_p2p_wan.js`: 17/17 (100%)
- `test_bootstrap.js`: 34/34 (100%)
- TypeScript: 0 errores

## Commit
`d58bc53` en `main`
