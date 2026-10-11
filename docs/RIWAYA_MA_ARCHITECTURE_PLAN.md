# Plan d’architecture — riwaya.ma avec backend Riwaya partagé

Statut : **palier A en cours sur la branche `feat/riwaya-ma-multistore` — schéma multiboutique appliqué, code applicatif pas encore déployé**  
Dernière mise à jour : **11 octobre 2026**  
Projet actuel : **riwaya.store / Next.js 16 / Prisma / MySQL / Redis / Docker**

## 1. Objectif

Créer un frontend distinct pour `riwaya.ma` tout en conservant :

- un seul backoffice ;
- une seule base de données ;
- un catalogue et des stocks communs ;
- les mêmes intégrations de livraison, paiement, Telegram, Jumia et automatisation ;
- une attribution claire des commandes et performances à chaque boutique.

Le projet actuel doit continuer à fonctionner pendant toute la transition. Le nouveau domaine ne doit pas être un clone autonome du dépôt ni posséder une copie de la base de données.

Le positionnement retenu pour le nouveau frontend est **premium, éditorial et chaleureux**. La charte détaillée est conservée dans `docs/RIWAYA_MA_PREMIUM_BRAND.md`.

## 2. Décision d’architecture

### Architecture cible

```text
                         ┌──────────────────────────────┐
riwaya.store ───────────▶│ Frontend Riwaya Store       │
                         └──────────────┬───────────────┘
                                        │ API privée
riwaya.ma ──────────────▶│ Frontend Riwaya MA          │
                         └──────────────┬───────────────┘
                                        │
                         ┌──────────────▼───────────────┐
                         │ Backend + backoffice partagé │
                         │ Auth, commandes, stock, SEO  │
                         └──────────────┬───────────────┘
                                        │
                  ┌─────────────────────┼─────────────────────┐
                  ▼                     ▼                     ▼
                MySQL                 Redis             uploads/services
```

### Règles fondamentales

1. `riwaya.store` reste le système de production de référence pendant la migration.
2. Les deux boutiques utilisent les mêmes identifiants de produits, stocks, entrepôts et clients.
3. Toute écriture sensible passe par le backend partagé. Le frontend `riwaya.ma` ne se connecte jamais directement à MySQL ou Prisma.
4. Chaque panier, commande, paiement et événement analytique porte un canal d’origine.
5. Le déploiement de `riwaya.ma` est indépendant : une erreur sur ce frontend ne doit pas arrêter `riwaya.store` ou le backoffice.
6. Les secrets restent dans les variables d’environnement du VPS ou un gestionnaire de secrets, jamais dans Git.

## 3. Approche progressive retenue

Une conversion immédiate en monorepo complet serait risquée pour le site actuel. La migration se fera en quatre paliers.

### Palier A — rendre le backend multiboutique

Conserver l’application actuelle et ajouter la notion de boutique/canal sans modifier son comportement par défaut.

Modifications de données envisagées :

```prisma
enum SalesChannel {
  RIWAYA_STORE
  RIWAYA_MA
  ADMIN_POS
  JUMIA
  TELEGRAM
}

model Storefront {
  id          String   @id @default(uuid())
  code        String   @unique
  domain      String   @unique
  name        String
  isActive    Boolean  @default(true)
  settings    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Champs à introduire progressivement :

- `Order.salesChannel` et éventuellement `Order.storefrontId` ;
- `AbandonedCart.salesChannel` ;
- `AnalyticsEvent.salesChannel`, si ce modèle est conservé en base ;
- `Promotion.storefronts` ou une table de liaison, seulement si les promotions doivent différer ;
- paramètres de thème, navigation et SEO propres à chaque vitrine.

Migration sûre :

- champs initialement optionnels ou avec `RIWAYA_STORE` par défaut ;
- backfill des anciennes commandes vers `RIWAYA_STORE` ;
- index sur `salesChannel`, `createdAt` et `status` ;
- aucun changement du calcul de stock ;
- migration Prisma testée sur une copie de la base avant production.

### Palier B — créer une API backend stable

Créer une couche HTTP versionnée, par exemple `/api/storefront/v1`, réutilisable par les deux frontends.

Endpoints initiaux :

- `GET /catalog/books` ;
- `GET /catalog/books/:id` ;
- `GET /catalog/packs` ;
- `GET /catalog/packs/:id` ;
- `GET /categories` et `GET /collections` ;
- `POST /cart/validate` ;
- `POST /checkout` ;
- `GET /orders/:publicToken` ;
- endpoints d’authentification client si les comptes sont partagés.

Contraintes :

- validation Zod de toutes les entrées ;
- liste blanche des domaines autorisés ;
- signature serveur à serveur ou jeton de service rotatif ;
- limitation de débit sur recherche, panier et checkout ;
- clés d’idempotence pour éviter les commandes doubles ;
- jamais de prix, remise ou stock acceptés tels quels depuis le navigateur ;
- réponses publiques sans données personnelles ni champs internes Prisma ;
- versionnement de l’API avant le lancement de `riwaya.ma`.

Les Server Actions existantes restent utilisées par `riwaya.store` pendant cette phase. Elles sont remplacées ou adaptées progressivement, fonction par fonction.

### Palier C — construire le frontend riwaya.ma

Créer une application séparée dans le même dépôt, après stabilisation de l’API :

```text
apps/
  storefront-store/     # évolution future du frontend riwaya.store
  storefront-ma/        # nouveau design riwaya.ma
  backoffice/            # évolution future, pas au premier chantier
packages/
  contracts/             # schémas Zod et types de l’API
  commerce/              # règles métier sans dépendance UI
  shared-config/         # locales, constantes, lint, TypeScript
```

Au premier lancement, seuls `apps/storefront-ma` et `packages/contracts` doivent être extraits. Le déplacement complet de l’application actuelle attendra que la nouvelle vitrine soit stable.

Le frontend `riwaya.ma` pourra avoir :

- une identité visuelle, un header et une page d’accueil propres ;
- ses propres collections éditoriales ;
- un ordre de produits différent ;
- des textes et landing pages originaux ;
- ses propres identifiants Analytics, Pixel et Search Console ;
- des promotions ciblées, si le modèle de données les autorise.

Il partagera obligatoirement :

- catalogue et disponibilité réelle ;
- règles de réservation/décrémentation de stock ;
- clients et historique, selon la politique de connexion retenue ;
- commandes, paiements et livraisons ;
- images originales ou un service média commun ;
- données du backoffice.

### Palier D — séparer proprement le backoffice

Ce palier est optionnel et intervient seulement après le lancement réussi de `riwaya.ma`.

- déplacer l’interface admin vers une application dédiée ou `admin.riwaya.store` ;
- conserver les mêmes services métier et la même base ;
- ajouter des filtres par canal aux commandes, KPI, paniers abandonnés et rapports Telegram ;
- autoriser une vue globale et une vue par boutique.

## 4. Stock, commandes et concurrence

Le stock doit rester global par entrepôt. Il ne faut pas créer un stock `riwaya.ma` indépendant sauf décision commerciale future.

Le checkout partagé doit :

1. recalculer les prix côté serveur ;
2. vérifier le stock dans une transaction ;
3. réserver ou décrémenter le stock de manière atomique ;
4. enregistrer `salesChannel` ;
5. utiliser une clé d’idempotence ;
6. déclencher Telegram, livraison et paiement après création réussie ;
7. inclure le domaine source dans les liens envoyés au client.

Les numéros publics de commande peuvent rester communs. Le backoffice doit afficher un badge `STORE`, `MA`, `JUMIA` ou `POS`.

## 5. SEO et contenu dupliqué

Les deux domaines ne doivent pas publier automatiquement les mêmes pages avec les mêmes titres et descriptions.

Avant l’ouverture à l’indexation :

- définir le positionnement éditorial propre de `riwaya.ma` ;
- rédiger des pages d’accueil, catégories, collections et guides distincts ;
- utiliser une URL canonique vers la page réellement prioritaire lorsqu’une fiche est identique ;
- ne pas canoniser toutes les pages de `riwaya.ma` vers `riwaya.store` si le nouveau domaine doit se positionner seul ;
- générer des sitemaps séparés ;
- créer une propriété Search Console et un Merchant Center/destination clairement configurés ;
- garder `noindex` sur l’environnement de préproduction ;
- utiliser des flux Merchant avec URLs, images et domaine cohérents ;
- vérifier hreflang, Open Graph, données structurées et robots pour chaque domaine.

Décision SEO à prendre avant le développement visuel :

- **marque/positionnement différent** : pages originales indexables sur les deux domaines ;
- **simple variante graphique** : domaine principal unique et canonical vers celui-ci, avec une valeur SEO limitée pour le second domaine.

## 6. Déploiement VPS cible

Le VPS peut héberger les services suivants :

```text
Nginx / reverse proxy
  riwaya.store      -> storefront actuel / port interne 3000
  riwaya.ma         -> nouveau frontend / port interne 3001
  admin...          -> backoffice partagé, ultérieurement

Docker network privé
  backend
  storefront-ma
  mysql
  redis
  n8n
```

Règles d’exploitation :

- MySQL, Redis, n8n et phpMyAdmin ne doivent pas être publiés directement sur Internet ;
- seuls les ports HTTP/HTTPS et le port SSH choisi doivent être ouverts ;
- certificats TLS séparés ou certificat multi-domaines ;
- healthchecks et redémarrage automatique ;
- sauvegarde MySQL avant chaque migration ;
- rollback par image Docker taguée avec le SHA Git ;
- variables d’environnement distinctes pour chaque service ;
- clé `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` stable entre instances d’une même application ;
- journalisation avec `storefront`, `requestId` et version de déploiement.

Le fichier Docker Compose actuel ne sera pas modifié avant que le frontend `riwaya.ma` puisse démarrer et réussir ses healthchecks de façon autonome.

## 7. Domaine et DNS

Quand le frontend est prêt :

1. ajouter `riwaya.ma` et `www.riwaya.ma` dans le fournisseur DNS ;
2. créer les enregistrements `A` vers l’adresse publique du VPS ;
3. préparer Nginx avant de basculer le trafic ;
4. générer le certificat TLS ;
5. tester via un nom local ou un sous-domaine de préproduction ;
6. activer le domaine public seulement après les tests checkout/stock ;
7. choisir une redirection permanente entre `www` et le domaine nu ;
8. déclarer l’URL canonique correspondante.

## 8. Sécurité des accès VPS

Les identifiants ou mots de passe VPS ne doivent jamais être écrits dans ce document, `.env`, les tickets, les commits ou les workflows GitHub.

Avant toute intervention serveur :

1. changer le mot de passe communiqué en clair ;
2. générer une clé SSH dédiée au déploiement ;
3. installer uniquement sa clé publique dans `~/.ssh/authorized_keys` ;
4. tester la connexion par clé sur le port SSH configuré ;
5. désactiver ensuite l’authentification SSH par mot de passe si aucun autre processus n’en dépend ;
6. stocker la clé privée dans GitHub Actions Secrets ou dans un coffre local sécurisé ;
7. limiter les droits du compte de déploiement et conserver une procédure de récupération.

Noms de secrets recommandés, sans valeurs dans le dépôt :

- `VPS_HOST` ;
- `VPS_PORT` ;
- `VPS_USER` ;
- `VPS_SSH_PRIVATE_KEY` ;
- `RIWAYA_MA_API_TOKEN` ;
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`.

## 9. Phases de réalisation et critères de validation

### Phase 0 — préparation et sauvegarde

- [x] Valider le positionnement commercial et SEO premium de `riwaya.ma`.
- [ ] Remplacer le mot de passe VPS exposé et configurer une clé SSH.
- [ ] Documenter les services, domaines, sauvegardes et procédure de rollback actuels.
- [ ] Créer une sauvegarde MySQL restaurable et tester sa restauration hors production.
- [ ] Créer une branche dédiée à l’architecture multiboutique à partir d’un travail courant stabilisé.

**Terminé lorsque :** aucun secret n’est dans Git, la restauration est testée et le périmètre du nouveau frontend est validé.

### Phase 1 — canal de vente dans le backend

- [x] Ajouter l’énumération/canal et préparer une migration compatible avec l’existant.
- [x] Prévoir le backfill des anciennes données vers `RIWAYA_STORE` grâce à la valeur par défaut.
- [x] Capturer automatiquement le canal à la création d’une commande.
- [x] Afficher et filtrer le canal dans le backoffice.
- [x] Inclure le canal dans Telegram, exports et KPI.
- [ ] Tester panier, stock, Jumia, POS et commandes historiques.

Avancement du 11 octobre 2026 : le schéma, les créations web/POS/mobile/import, les paniers abandonnés, le filtre du backoffice, Telegram, l’export CSV et les KPI par boutique sont préparés localement. Le script `prisma/manual-migrations/20261011_add_sales_channel.sql` n’a pas été exécuté sur la production.

Validation isolée du 11 octobre 2026 :

- schéma complet appliqué avec succès à une base MySQL locale jetable `riwaya_multistore_test` ;
- valeur par défaut `RIWAYA_STORE` vérifiée sur `Order` et `AbandonedCart` ;
- écriture explicite `RIWAYA_MA` vérifiée sur les deux modèles ;
- index composites `salesChannel/createdAt` vérifiés ;
- données de test nettoyées, base jetable supprimée et conteneur MySQL de test arrêté ;
- test reproductible disponible dans `scripts/test-sales-channel-schema.cjs`, avec blocage automatique si le nom de base n’est pas exactement `riwaya_multistore_test`.

Préparation VPS du 11 octobre 2026 :

- audit en lecture seule effectué avant migration ;
- MySQL et le conteneur applicatif étaient actifs ;
- les sauvegardes automatiques précédentes étaient vides, car le script ciblait l’ancien conteneur `riwaya_mysql` au lieu de `riwaya_db` ;
- `scripts/backup-db.sh` corrigé pour utiliser les variables internes du conteneur, une écriture atomique, `--single-transaction`, `--no-tablespaces` et une validation gzip ;
- nouvelle sauvegarde de production créée et vérifiée : environ 5,59 Mo ;
- restauration réelle réussie dans une base temporaire : 70 tables et 322 commandes ;
- base de restauration supprimée automatiquement après le contrôle ;
- migration multiboutique appliquée à la production après restauration validée ;
- 322 commandes historiques classées automatiquement `RIWAYA_STORE` ;
- colonnes et index vérifiés sur `orders` et `abandoned_carts` ;
- application historique restée disponible et contrôlée en HTTP 200 après la migration.

**Terminé lorsque :** le site actuel se comporte comme avant et chaque nouvelle commande possède un canal fiable.

### Phase 2 — API storefront

- [ ] Définir les contrats Zod versionnés.
- [ ] Exposer le catalogue public nécessaire.
- [ ] Exposer validation panier et checkout sécurisé.
- [ ] Ajouter idempotence, rate limiting, logs et tests d’intégration.
- [ ] Tester les cas de stock concurrent et de double clic.

**Terminé lorsque :** un client de test peut parcourir le catalogue et créer une commande sans accès direct à la base.

### Phase 3 — frontend riwaya.ma

- [ ] Créer l’application isolée et son design system.
- [ ] Implémenter accueil, recherche, catégories, fiches, panier et checkout.
- [ ] Ajouter SEO, données structurées, sitemap, robots et analytics propres.
- [ ] Utiliser des contenus différenciés.
- [ ] Maintenir `noindex` en préproduction.
- [ ] Effectuer des tests mobiles, accessibilité, performance et conversion.

**Terminé lorsque :** les parcours critiques fonctionnent et une panne du frontend MA n’affecte pas Store/Admin.

### Phase 4 — infrastructure et lancement

- [ ] Ajouter le service Docker sans modifier les services actuels.
- [ ] Ajouter Nginx/TLS et effectuer un test de routage.
- [ ] Vérifier sauvegarde et rollback.
- [ ] Tester commandes réelles à faible montant, stock et notifications.
- [ ] Ouvrir progressivement le trafic puis l’indexation.
- [ ] Surveiller erreurs, disponibilité, vitesse, commandes et stock pendant 72 heures.

**Terminé lorsque :** le domaine est stable, les commandes sont attribuées correctement et aucun impact n’est observé sur `riwaya.store`.

## 10. Tests obligatoires avant lancement

- catalogue identique côté données, même si l’affichage diffère ;
- prix et remises recalculés par le backend ;
- stock cohérent après deux commandes simultanées sur les deux domaines ;
- panier expiré et article devenu indisponible ;
- commande invitée et commande client connecté ;
- paiement accepté, refusé et webhook répété ;
- notification Telegram avec canal et lien du bon domaine ;
- création et synchronisation livraison ;
- annulation/retour et restitution du stock ;
- filtres et KPI par canal dans le backoffice ;
- canonical, sitemap, robots et données structurées ;
- cache sans fuite de données entre domaines ;
- rollback de l’application et restauration de base documentés.

## 11. Ce qu’il ne faut pas faire

- ne pas copier le dépôt dans un second projet qui divergera ;
- ne pas dupliquer MySQL pour le nouveau domaine ;
- ne pas autoriser le frontend à appeler Prisma directement ;
- ne pas lancer une migration de schéma sans sauvegarde et rollback ;
- ne pas réutiliser aveuglément tous les textes SEO ;
- ne pas mélanger les cookies de session entre domaines sans conception explicite ;
- ne pas exposer les ports MySQL, Redis, n8n ou phpMyAdmin publiquement ;
- ne pas enregistrer de mot de passe ou clé privée dans Git.

## 12. Ordre recommandé pour les prochaines sessions

À chaque reprise du chantier, commencer par ce document et choisir la première case non cochée. L’ordre conseillé est :

1. sécurité VPS et sauvegardes ;
2. décision de positionnement SEO ;
3. modèle `SalesChannel` compatible ;
4. filtres backoffice et attribution des commandes ;
5. contrats et API storefront ;
6. squelette du frontend `riwaya.ma` ;
7. design et contenu ;
8. préproduction ;
9. DNS/TLS ;
10. lancement progressif.

Toute évolution doit rester livrable par petits commits réversibles. Une phase ne doit pas modifier le trafic ou les données de production avant validation de ses critères de sortie.
