CREATE TABLE IF NOT EXISTS `pack_extra_products` (
    `id` VARCHAR(191) NOT NULL,
    `packId` VARCHAR(191) NOT NULL,
    `extraProductId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `pack_extra_products_packId_extraProductId_key` (`packId`, `extraProductId`),
    INDEX `pack_extra_products_packId_idx` (`packId`),
    INDEX `pack_extra_products_extraProductId_idx` (`extraProductId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `pack_extra_products_packId_fkey`
        FOREIGN KEY (`packId`) REFERENCES `packs` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `pack_extra_products_extraProductId_fkey`
        FOREIGN KEY (`extraProductId`) REFERENCES `extra_products` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
