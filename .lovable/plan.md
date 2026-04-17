

## Objectif
Permettre à Claude.AI (ou n'importe qui) de créer un compte et accéder à l'app immédiatement, sans vérification d'email ni invitation préalable.

## Ce qui change

**1. Activer l'auto-confirmation des emails**
Configurer l'authentification Supabase pour que les nouveaux comptes soient confirmés automatiquement à l'inscription. Plus besoin de cliquer sur un lien dans un email — le signup connecte directement l'utilisateur.

**2. Garder le signup ouvert**
Le formulaire d'inscription dans `src/pages/Auth.tsx` est déjà ouvert à tous. Je vérifie qu'il n'y a aucun blocage côté UI (pas de liste blanche, pas de code d'invitation requis).

**3. Onboarding fluide pour le nouveau compte**
Aujourd'hui, un nouvel utilisateur atterrit dans l'organisation par défaut "Aucune" et est forcé de créer/rejoindre une org via `OnboardingFlow`. C'est OK : Claude pourra créer sa propre org en un clic et devenir `owner` de celle-ci → il aura tous les droits d'édition, library admin, gestion users, etc.

**4. (Optionnel) Bannière d'info sur la page Auth**
Ajouter une petite mention "Inscription libre — créez un compte en 10 secondes" pour que ce soit clair que rien ne bloque.

## Détails techniques

- **Supabase Auth** : passer `enable_confirmations` à `false` sur le provider email (via outil `configure_auth`).
- **Aucune migration SQL nécessaire** : le trigger `handle_new_user` crée déjà profil + assignation à l'org par défaut automatiquement.
- **RLS conservé** : chaque utilisateur reste isolé dans sa propre org. Claude ne verra pas vos données et vice-versa. C'est la bonne approche : bac à sable individuel.
- **Pas de changement de code lourd** : juste un toggle de config + éventuellement la bannière sur `Auth.tsx`.

## Ce qui ne change PAS
- Vos données existantes restent privées (RLS par org).
- Le système de rôles owner/org_admin/member reste intact.
- L'auto-save, l'éditeur, l'admin équipement, tout fonctionne pareil.

## Avertissement
Avec le signup ouvert + auto-confirm, n'importe qui sur internet peut créer un compte si l'URL fuite. Chaque nouveau compte consomme un peu de quota Lovable Cloud (DB rows, storage si export d'images). À surveiller si l'URL devient publique.

## Plan d'exécution
1. Activer l'auto-confirmation email via `configure_auth`.
2. Vérifier/ajuster `src/pages/Auth.tsx` pour clarifier le message d'inscription.
3. Vous tester le flow : créer un compte test → arrivée sur onboarding → création d'org → accès à l'éditeur.

