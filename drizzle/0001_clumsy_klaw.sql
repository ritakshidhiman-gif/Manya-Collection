CREATE TABLE `emailOtpChallenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(160) NOT NULL,
	`codeHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailOtpChallenges_id` PRIMARY KEY(`id`)
);
