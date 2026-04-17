
# Home View — Filtering, Sorting & Search Improvements

## 1. Filter Bar Component (`FilterBar.tsx`)
- Barre de filtres persistante sous la toolbar avec 4 dropdowns :
  - **Étiquettes** : multi-select des tags org (chips colorés)
  - **Créé par** : multi-select des créateurs (extraits des schémas existants)
  - **Modifié** : presets temporels (Aujourd'hui, Cette semaine, Ce mois-ci, Ce trimestre, Personnalisé avec date picker)
  - **Dossier** : multi-select des dossiers org + option "Sans dossier"
- Bouton "Réinitialiser" visible seulement quand un filtre est actif
- Chaque filtre actif affiche un compteur `(N)`

## 2. Active Filter Chips
- Ligne de chips sous la filter bar quand des filtres sont actifs
- Chaque chip affiche l'icône + le nom du filtre + ✕ pour suppression individuelle

## 3. URL Persistence
- Stocker l'état des filtres dans les query params (`?tags=id1,id2&createdBy=name&modified=month&folder=id`)
- Initialiser les filtres depuis l'URL au chargement
- `useSearchParams` de react-router-dom

## 4. Sortable Columns
- Headers cliquables : Nom, Éléments, Créé par, Modifié
- Indicateur flèche ↑↓ sur la colonne active
- Tri par défaut : Modifié (plus récent en premier)
- Appliquer le tri aux schémas dans chaque dossier ET aux root

## 5. Enhanced Search
- Recherche étendue : nom du schéma, nom du dossier, étiquettes, créateur
- État "Aucun résultat" amélioré avec bouton "Réinitialiser la recherche"

## Fichiers modifiés
- `src/components/Dashboard.tsx` — refactoring majeur des filtres/tri
- `src/components/FilterBar.tsx` — nouveau composant
- `src/components/ActiveFilterChips.tsx` — nouveau composant

## Ordre d'exécution
1. Créer `FilterBar.tsx` et `ActiveFilterChips.tsx`
2. Refactorer `Dashboard.tsx` : remplacer les filtres actuels, ajouter le tri, URL params
