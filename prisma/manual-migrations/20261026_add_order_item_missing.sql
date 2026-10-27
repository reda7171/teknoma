-- Permet de signaler un article manquant dans une commande.
-- A executer une seule fois apres sauvegarde verifiee de la base de production.

ALTER TABLE `order_items`
    ADD COLUMN `isMissing` BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX `order_items_isMissing_idx`
    ON `order_items` (`isMissing`);

-- Controle attendu :
-- SELECT COUNT(*) FROM order_items WHERE isMissing = TRUE;
