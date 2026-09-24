CREATE TABLE `catalogProducts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`name` varchar(180) NOT NULL,
	`category` enum('Cotton','Festive','Designer','Winter') NOT NULL,
	`gender` enum('Women','Unisex') NOT NULL DEFAULT 'Women',
	`color` varchar(80) NOT NULL,
	`price` int NOT NULL,
	`sizes` text NOT NULL,
	`image` text NOT NULL,
	`badge` varchar(80),
	`description` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalogProducts_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalogProducts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
