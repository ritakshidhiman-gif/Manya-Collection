CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int,
	`productName` varchar(180) NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` int NOT NULL,
	`size` varchar(20),
	`color` varchar(80),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(32) NOT NULL,
	`userId` int,
	`customerName` varchar(160) NOT NULL,
	`customerEmail` varchar(320) NOT NULL,
	`customerPhone` varchar(32),
	`addressLine1` varchar(240) NOT NULL,
	`addressLine2` varchar(240),
	`city` varchar(120) NOT NULL,
	`state` varchar(120) NOT NULL,
	`postalCode` varchar(20) NOT NULL,
	`subtotal` int NOT NULL,
	`total` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'INR',
	`status` enum('pending','paid','failed','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`provider` varchar(40) NOT NULL DEFAULT 'razorpay',
	`providerOrderId` varchar(80) NOT NULL,
	`providerPaymentId` varchar(80),
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'INR',
	`status` enum('created','authorized','captured','failed') NOT NULL DEFAULT 'created',
	`signature` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_providerOrderId_unique` UNIQUE(`providerOrderId`)
);
