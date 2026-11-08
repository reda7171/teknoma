# Audit de sécurité — clients et commandes

Date : 8 novembre 2026. Analyse du dépôt et tests isolés ; aucune attaque ni modification de données sur la production.

## Corrections

- Contrôles d’identité et de rôle côté serveur sur les API administratives, pages serveur et actions sensibles. Les helpers utilisés par les traitements internes ont été déplacés dans des modules `server-only` pour ne plus constituer des actions appelables publiquement.
- Les cookies de rôle et d’email ne prouvent plus une identité. Les sessions vérifient le compte actuel, son statut, son mot de passe et le contexte administrateur/communauté. Un changement de mot de passe invalide les anciennes sessions.
- Suppression du secret de signature de secours connu. En production, une clé absente ou de moins de 32 caractères bloque la signature.
- Réinitialisation de mot de passe réservée à un administrateur ou à un lien signé, limité à 24 heures et consommé par mise à jour conditionnelle du mot de passe. Les comptes vendeurs ne reçoivent plus de mot de passe prévisible.
- Connexion OAuth interne retirée de la surface des Server Actions ; vérification de l’email Google One Tap.
- Accès aux commandes par autorisation signée spécifique à la commande, par compte mobile propriétaire ou par rôle interne autorisé. Les cookies libres contenant un email ou un identifiant de commande ne donnent aucun accès.
- Historique mobile limité au `customerId` authentifié. Attribution du token de notification limitée au compte connecté. Inscription mobile empêchant la prise de possession d’un ancien client de commande par simple connaissance de son téléphone.
- Factures : liens et boutons supprimés du parcours client ; API réservée aux rôles ADMIN et MANAGER, y compris lorsque le client possède une autorisation valide sur sa commande.
- Réponses client limitées à une projection explicite : absence de hashes de mot de passe, tokens de notification, prix de revient, notes internes et URL des fichiers numériques.
- Suppression de la recherche de commandes dans le chatbot public et de l’envoi correspondant de données clients au modèle.
- Prix, coupons, promotions et offres instantanées recalculés depuis les données serveur. Paiement mobile utilisant cette même validation. Débits de crédits conditionnels et transitions d’échange protégées contre la répétition.
- Confirmations Stripe/CMI vérifiant le mode de paiement, le montant et la devise avant confirmation ; mises à jour conditionnelles empêchant un ancien événement de réactiver une commande annulée. Montant Stripe basé sur le total serveur après réduction.
- Paramètres privés et secrets réservés à l’administration ; lectures internes séparées des actions publiques.
- Documents de listes scolaires conservés hors du répertoire public et téléchargés par une route administrative ; accès historiques redirigés vers cette route. Volume Docker ajouté pour leur conservation.
- Proxy d’images protégé : validation DNS, refus des réseaux privés, adresse vérifiée fixée pour la connexion, contrôle des redirections, taille et délai limités, réencodage des images. Accès local désactivé dans l’optimiseur Next.
- Webhook WhatsApp exigeant un secret ; suppression des identifiants WAHA de secours dans le service d’envoi.
- Ports Docker MySQL, Redis, phpMyAdmin et WAHA limités à l’interface locale de l’hôte ; secrets WAHA exigés dans l’environnement du compose.
- Abonnements push : restriction des destinations et suppression par correspondance exacte.
- Nettoyage du HTML riche par une bibliothèque spécialisée ; validation et limitation de plusieurs corps de requête.
- Mise à jour des dépendances d’exécution concernées par les alertes npm ; passage à Node 22 pour les versions corrigées.

## Vérifications

`npm run test:security` : 16 scénarios réussis, dont l’exécution de 89 handlers administratifs réels sans identité authentifiée, le refus de facture avec une autorisation client valide, le rejet des cookies falsifiés, la révocation des sessions, les liens de mot de passe à usage unique, les prix falsifiés et la répétition d’un crédit d’échange. Base, cookies et services externes remplacés par des fixtures ; ces tests ne constituent pas un test de pénétration de la production.

Compilation Next.js réussie ; validation syntaxique de 549 fichiers JSX/TSX et parité de 2 110 clés de traduction réussies. Le projet désactive la vérification des types dans son build : `tsc --noEmit` signale encore des erreurs préexistantes, notamment des signatures de routes et des types métier. Le build seul ne garantit donc pas l’absence d’erreurs de typage.

`npm audit --omit=dev` : 0 vulnérabilité connue signalée lors de cette vérification. Les dépendances de développement sont distinctes et ne sont pas couvertes par cette affirmation.

## Mise en service et limites

Ces changements doivent être déployés pour protéger le site en ligne. Avant déploiement : utiliser Node >=22.12, une valeur `JWT_SECRET` aléatoire propre au service et un `WHATSAPP_WEBHOOK_SECRET` identique sur le producteur du webhook et sur le site. Ne pas utiliser les exemples comme secrets. Configurer les identifiants WAHA explicitement. Préserver les volumes des anciens documents et du nouveau répertoire privé.

Les anciennes sessions et anciens tokens mobiles deviennent invalides : les utilisateurs devront se reconnecter. Les anciennes commandes ne sont plus retrouvées par un simple cookie d’email ; le parcours de suivi vérifie une référence et les coordonnées du client. La récupération d’un compte mobile correspondant à un ancien client sans mot de passe exige une vérification d’identité ; l’inscription publique ne peut plus revendiquer ce compte.

Les tests n’utilisent pas les services réels Stripe, CMI, WhatsApp ou push. Leur configuration et leur fonctionnement après déploiement restent à vérifier dans les environnements de test de ces services. L’audit de code n’établit ni l’existence ni l’absence d’une fuite passée. Les journaux de production, les droits de la base, les sauvegardes et la configuration effective du VPS nécessitent une vérification séparée. Aucun engagement de « zéro faille » ne peut être déduit de ces résultats.
