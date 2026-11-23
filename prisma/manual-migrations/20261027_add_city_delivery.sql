-- Création de la table city_delivery pour stocker les villes et leurs frais de livraison
CREATE TABLE IF NOT EXISTS `city_delivery` (
    `id` VARCHAR(191) NOT NULL,
    `city` VARCHAR(150) NOT NULL,
    `price` DOUBLE NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT TRUE,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `city_delivery_city_key`(`city`),
    INDEX `city_delivery_city_idx`(`city`),
    INDEX `city_delivery_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
