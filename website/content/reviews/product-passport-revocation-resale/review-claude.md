**VERDICT : PASS** — SHA `02c7db1`

Périmètre : Galileo uniquement. Le worktree ne contient aucun contenu Kepler (pas de variantes fr/en/de, pas de mention EASA ni 2025/111), cette partie de la consigne est sans objet ici.

**Vérifications sources primaires (live, 5 septembre 2026)**

| Source | Affirmation de l'article | Résultat |
|---|---|---|
| W3C Bitstring Status List v1.0, §1.1 | Citation « Status information is about the verifiable credential », Recommendation 15 May 2025, exemple du diplôme et de la clé compromise | Conforme mot à mot. C'est le titre d'une Note de la section 1.1, la phrase de corps développe la même idée. |
| W3C Bitstring, Privacy Considerations | Listes partagées et cache réduisent la corrélation ; acteurs malveillants peuvent contourner | Conforme (§6.3 caching, §6.4 CDN, §6.6 malicious issuers/verifiers). |
| GS1 Digital Signatures Guideline | Janvier 2026, page imprimée 35, cache du DigSig Certificate en connectivité contrainte, « Note that revocation checks should be done online. » | Conforme. PDF « Release 1.1.0, Ratified, Jan 2026 », phrase exacte page 35 de 98 après la Figure 3-7. |
| W3C VC Data Model 2.0 | Modèle pour claims, validité, statut ; le vérificateur décide de faire confiance à l'émetteur | Conforme (Recommendation 15 May 2025, validFrom/validUntil, credentialStatus, « Verifiers trust certain issuers for certain claims »). |
| RFC 9111 | Freshness, age, validation | Conforme (§4.2, §4.2.3, §4.3, §5.1). |

**Points exigés pour Galileo**
- Statut du credential distinct de l'objet physique : explicite en lignes 23, 43-51 et FAQ ligne 14.
- Cache et statut indisponible : traité lignes 84-96, cas travaillé ligne 102, FAQ lignes 16 et 18. Aucun seuil inventé, le texte dit que les sources ne fournissent pas de délai universel.
- Choix revendeur : politique présentée comme illustrative et non légale (ligne 100), décision laissée au manager (ligne 108).
- Aucun produit promis : disclaimers lignes 27 et 134 excluent toute fonctionnalité Galileo déployée.
- Aucune généralisation réglementaire : l'article ne cite ni ESPR ni obligation nouvelle.

**Métadonnées, maillage, gates**
- Titre 51 caractères, description 147, `date` = préfixe fichier, `modified` = `date`, tags en minuscules déjà utilisés dans le corpus.
- FAQ corps identique au frontmatter mot à mot (4 entrées).
- Liens internes `/blog/2026-09-02-chanel-serial-code-not-identity`, `/blog/2026-08-30-fpjourne-secondary-market-portable-proof` et `/docs` existent dans le build.
- Réponse directe dans les deux premières phrases, avant le premier H2. CTA final vers `/docs`.
- Axe éditorial 3 (authentification/provenance), précédent article 03/09 sur l'axe 2 : règle d'alternance respectée.
- build.log vert, aucune alerte « sentence > 30 words » sur ce fichier, lint.log vide. Cover présente, gate de poids 150 KB enforcée au build. Image sans texte incrusté, alt cohérent avec le visuel.
- SVG : captures desktop et 390 px sans débordement, lignes courtes, marges suffisantes.
- Langue : anglais uniquement, cohérent avec le site.

**Findings**
- Low, `website/content/blog/2026-09-05-product-passport-revocation-resale.mdx:43` : la citation est le titre d'une Note W3C, pas une phrase de corps. Formulation « W3C makes the boundary explicit » reste juste, mais « in a note titled » serait plus précis. Non bloquant.
- Low, `website/content/reviews/product-passport-revocation-resale/` : nom de dossier sans préfixe date alors que le README dit « slug » et que le dossier du 31/08 utilise le slug complet. Incohérence de convention préexistante (le dossier MiCA fait pareil). Non bloquant.

**Limites**
- Les ancres `#conceptual-framework` et `#privacy-considerations` n'ont pas pu être validées par fetch (conversion markdown sans ids). Les sections cibles existent aux numéros indiqués.
- Captures desktop.png et mobile-390.png lues comme preuves de rendu, pas certifiées UAT.
- Aucun edit, push ni commentaire GitHub effectué.