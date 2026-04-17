

## Objectif
Quand l'utilisateur crée un nouveau schéma (Dashboard → "Nouveau"), pouvoir importer directement un schéma JSON produit par Claude.AI, en plus des options existantes "Canevas vide" et "Choisir un template".

## Comportement utilisateur

```text
Dashboard
  ↓ clic "Nouveau"
TemplatePickerDialog
  ├─ [Canevas vide]
  ├─ [Importer un JSON]  ← NOUVEAU
  └─ [Utiliser ce template]
```

Sur clic "Importer un JSON" :
1. Ouvre le sélecteur de fichier (`.json`).
2. Lit le fichier, valide le contenu.
3. Pré-remplit le dialog "Créer le schéma" avec le nom + description du JSON.
4. À la création, le schéma est créé avec equipment / connections / zones / settings issus du JSON → ouvre l'éditeur.

Si le JSON est invalide → toast d'erreur clair avec ce qui manque.

## Format JSON attendu

Strictement le même format que les templates (déjà supporté par `createDiagram`) :

```json
{
  "name": "Mon archi GTB",
  "description": "Optionnel",
  "equipment": [ /* CanvasEquipment[] */ ],
  "connections": [ /* Connection[] */ ],
  "zones": [ /* Zone[] */ ],
  "settings": { /* DiagramSettings, optionnel */ },
  "images": [ /* optionnel */ ],
  "texts":  [ /* optionnel */ ]
}
```

Bonus : on accepte aussi un export JSON déjà fait via `ExportDialog` (même structure) → l'utilisateur peut ré-importer un schéma exporté.

## Validation

- Champ `name` requis (string non vide). Sinon on demande un nom dans le dialog suivant.
- `equipment`, `connections`, `zones` : tableaux (vides acceptés).
- Chaque `equipment[i]` doit avoir `canvasId`, `label`, `type`, `x`, `y`. Sinon → erreur listant le ou les éléments fautifs.
- Si certains `canvasId` sont en doublon → on les régénère silencieusement avec `crypto.randomUUID()` et on remappe les références dans `connections` (`fromId`/`toId`).

## Détails techniques

**1. Nouveau composant `ImportJsonButton`** (intégré dans `TemplatePickerDialog`)
- Input `<input type="file" accept=".json" hidden>` + bouton "Importer un JSON".
- Lit le fichier via `FileReader` → `JSON.parse` → validation.
- Appelle un nouveau callback `onImportJson(parsed)` exposé par `TemplatePickerDialog`.

**2. Modif `TemplatePickerDialog`**
- Ajout prop `onImportJson?: (data: ImportedDiagram) => void`.
- Ajout d'un 3ᵉ bouton "Importer un JSON" dans le `DialogFooter`.
- Petit hint sous les boutons : "Vous pouvez importer un schéma généré par Claude.AI ou un export JSON existant."

**3. Modif `Dashboard.tsx`**
- Nouveau handler `handleImportJson(data)` :
  - Pré-remplit `newName`, `newDescription`.
  - Stocke le payload dans un nouveau state `importedPayload` (à la place de `selectedTemplate`).
  - Ouvre le dialog "Créer le schéma" pour confirmation du nom.
- Dans `handleCreate`, si `importedPayload` est présent → appelle `createDiagram(name, desc, userId, importedPayload as DiagramTemplate)` (le type est compatible — même shape).

**4. Pas de changement DB ni de migration**
La fonction `createDiagram` du contexte accepte déjà un `template` avec `equipment / connections / zones / settings`. On réutilise tel quel.

**5. Petit utilitaire `src/lib/diagramImport.ts`**
- `parseImportedDiagram(raw: unknown)` → renvoie `{ ok: true, data } | { ok: false, errors: string[] }`.
- Gère la dédup des `canvasId` + remappage des connexions.

## Ce qui ne change pas
- L'import GTB (`GTBTemplateImporterDialog`) reste intact.
- Les templates utilisateurs restent intacts.
- L'éditeur, l'auto-save, le RBAC : aucun impact.

## Plan d'exécution
1. Créer `src/lib/diagramImport.ts` (parsing + validation + dédup).
2. Modifier `TemplatePickerDialog.tsx` : ajout bouton "Importer un JSON" + input file caché + prop callback.
3. Modifier `Dashboard.tsx` : nouveau state `importedPayload`, handler `handleImportJson`, branchement dans `handleCreate`.
4. Vous testez : générer un JSON via Claude.AI (ou ré-utiliser un export existant), cliquer "Nouveau" → "Importer un JSON" → vérifier que le schéma s'ouvre avec tous les équipements/connexions.

