# PayPal

## Installation et déploiement

Appliquer `prisma/manual-migrations/20261028_add_paypal_payments.sql` à la base cible,
puis exécuter `npx prisma generate` et reconstruire/redémarrer l'application.
La migration ajoute uniquement la table de suivi des paiements PayPal.
Elle a été appliquée à la base utilisée par le serveur local lors de cette correction.

Configurer `NEXT_PUBLIC_APP_URL` avec l'origine HTTPS publique de l'application.
Ne pas enregistrer un webhook pointant vers un serveur qui n'a pas encore reçu cette version.

Dans `/fr/admin/config/payment-methods`, un administrateur peut :

1. Choisir Sandbox et saisir les identifiants de cette application PayPal.
2. Cliquer sur **Enregistrer et tester PayPal**. Le test vérifie OAuth, le taux de change,
   la création d'une commande PayPal Sandbox non approuvée et les webhooks enregistrés.
3. Après déploiement sur une URL HTTPS publique, cliquer sur **Connecter le webhook PayPal**.
   L'identifiant est enregistré séparément pour Sandbox et Live.
4. Effectuer un achat avec un compte acheteur Sandbox distinct du vendeur et vérifier
   la confirmation, `isPaid`, `paidAmount` et la réception d'un webhook signé.

`localhost` ne peut pas recevoir les notifications PayPal. Le retour navigateur fonctionne
localement pour les essais, mais ne remplace pas le test de réception du webhook.
L'enregistrement d'un webhook ne prouve pas à lui seul sa bonne réception.

`PAYPAL_WEBHOOK_ID` reste un recours pour les installations existantes. Il doit désigner
un webhook enregistré auprès de l'application et de l'environnement PayPal utilisés.

## Montants et suivi

Le catalogue reste en MAD. PayPal facture en USD après conversion avec le taux quotidien
ExchangeRate-API. Un taux indisponible ou vieux de plus de 48 heures bloque la création,
sans utiliser de taux approximatif. L'origine, le montant et l'identifiant PayPal de la
tentative sont conservés dans `paypal_payments`. Le taux n'est pas recalculé à la capture.
Le checkout affiche la devise USD et l'attribution du fournisseur ; l'acheteur voit le
montant final dans PayPal avant de l'approuver.

Les retours et webhooks vérifient la tentative, les références, la devise, le montant
et une capture intégralement `COMPLETED` avant de comptabiliser le règlement.
Les confirmations répétées ne doivent pas écraser le statut de livraison.
Les remboursements complets mettent à jour le suivi financier, sans inventer de statut
de livraison « remboursé ». Les remboursements partiels restent à rapprocher manuellement.
Une tentative expirée ou dont le total local a changé nécessite une nouvelle commande ;
elle n'est jamais réutilisée silencieusement avec un montant différent.

## Tests

Avec le serveur local démarré et PayPal activé en Sandbox :

```sh
npx tsx scripts/test-paypal-checkout.ts
```

Le script refuse le mode Live, crée une commande locale isolée, vérifie l'API PayPal
Sandbox et les routes locales, puis simule les confirmations pour tester la comptabilité.
Il supprime ses lignes de test dans un bloc `finally`. Il n'approuve ni ne capture de
paiement PayPal. Une commande PayPal Sandbox non approuvée reste chez PayPal et expire.
Un essai acheteur reste nécessaire pour valider l'encaissement complet.
