# Réécriture par le rédacteur, 11 septembre 2026

Mandat Pierre : réécrire les passages ajoutés par Claude. Rôle worker/rédacteur, corrections locales sur les six articles. Issue : https://github.com/originlabs-app/galileo-protocol/issues/32.

Base locale avant réécriture : `273a023700018eedb217d4ef8c197e130d2d5305`.

## Passages repris

- Sauvegarde réglementaire de la dernière version distinguée des engagements de restauration négociés ; actes délégués applicables au produit rappelés.
- Annexe III(l) : donnée que les actes délégués peuvent imposer ou permettre, pas obligation universelle créée par l’annexe seule.
- Article 11(e) : disparition de l’opérateur créateur distinguée de la défaillance de son fournisseur.

## Versions relues

Relecture indépendante ciblée par `/root/verify_legal_rewrites` : PASS après clôture des retouches. Ce verdict concerne les passages modifiés.

- `website/content/blog/2026-09-11-dpp-provider-exit.mdx` : SHA-256 `99258ffb32d1cddcf232ee31b078f036ccdab85c59908d23142bf62edb8dcceb`.

## Vérifications locales

- npm run lint ; npm run build, depuis website : PASS
- Compilation et rendu explicites du MDX avec next-mdx-remote/rsc et React : PASS
- published:false vérifié inchangé

Les sources primaires et leur portée figurent au voisinage des passages dans l’article. Les rapports antérieurs restent des preuves historiques liées à leurs anciennes versions ; ils ne valent pas validation de ce nouveau texte.

Aucun push, merge, déploiement ou publication. Aucune vérification de production dans cette reprise. Les dossiers docs/missions préexistants hors périmètre ne sont ni ajoutés ni supprimés.
