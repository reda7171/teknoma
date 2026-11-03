CREATE TABLE IF NOT EXISTS `paypal_payments` (
  `id` VARCHAR(36) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `mode` VARCHAR(10) NOT NULL,
  `paypalOrderId` VARCHAR(32) NULL,
  `captureId` VARCHAR(32) NULL,
  `amountMad` INTEGER NOT NULL,
  `amountUsd` INTEGER NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'CREATED',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `paypal_payments_paypalOrderId_key` (`paypalOrderId`),
  UNIQUE INDEX `paypal_payments_captureId_key` (`captureId`),
  UNIQUE INDEX `paypal_payments_orderId_mode_key` (`orderId`, `mode`),
  CONSTRAINT `paypal_payments_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
