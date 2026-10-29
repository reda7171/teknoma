-- Palier A multiboutique : attribution du canal de vente.
-- À exécuter une seule fois, après sauvegarde vérifiée de la base de production.
-- Ne pas exécuter automatiquement depuis le démarrage de l'application.

ALTER TABLE `orders`
    ADD COLUMN `salesChannel` ENUM(
        'PETSUNIVERS_STORE',
        'PETSUNIVERS_MA',
        'ADMIN_POS',
        'MOBILE_APP',
        'ADMIN_IMPORT'
    ) NOT NULL DEFAULT 'PETSUNIVERS_STORE';

CREATE INDEX `orders_salesChannel_createdAt_idx`
    ON `orders` (`salesChannel`, `createdAt`);

ALTER TABLE `abandoned_carts`
    ADD COLUMN `salesChannel` ENUM(
        'PETSUNIVERS_STORE',
        'PETSUNIVERS_MA',
        'ADMIN_POS',
        'MOBILE_APP',
        'ADMIN_IMPORT'
    ) NOT NULL DEFAULT 'PETSUNIVERS_STORE';

CREATE INDEX `abandoned_carts_salesChannel_createdAt_idx`
    ON `abandoned_carts` (`salesChannel`, `createdAt`);

-- Contrôles attendus après exécution :
-- SELECT salesChannel, COUNT(*) FROM orders GROUP BY salesChannel;
-- SELECT salesChannel, COUNT(*) FROM abandoned_carts GROUP BY salesChannel;
