# Corrections des deux relectures indépendantes

Le SVG est passé à400x500, avec largeur desktop bornée672px par classes statiques (les styles JSX expression sont supprimés par le moteur MDX). À390px, sa largeur réelle est342px, texte14,1075 à15,39px écran, toutes les marges réelles>=15,78px. À1440px il mesure672x840. Captures final-diagram-* inspectées dans le site réel.

La famille effectivement héritée du site est ui-sans-serif/system-ui, pas Inter : final-browser.json conserve getComputedStyle après document.fonts.ready. Aucun changement de polices globales. Le contrat de marges est mesuré dans les quatre directions en pixels écran et les getBBox SVG sont aussi archivés.

Le compte rendu client et le constat atelier sont désormais deux formulations distinctes citées, avec [named check] à compléter. Les termes works perfectly, maker-supplied et original sont identifiés comme des formulations à examiner. Aucun autre paragraphe éditorial, source, hero ou FAQ modifié.

Gates affectés : lint et build code0, logs review-fix-*.log. Recette indépendante du coordinateur sur le build final à1440/390 : aucun débordement ; une hero chargée ; BlogPosting/Breadcrumb/FAQ, quatre questions uniques ; CTA docs joué, H1 Introduction to Galileo ; aucune erreur ou avertissement console. final-browser.json et les captures finales couvrent les empreintes de tested-files.sha256. La capture de l’auteur et ses anciennes mesures sont conservées comme historiques.

Deux sièges indépendants confirment le commit final en commentaires PR ; aucun merge ni production.
