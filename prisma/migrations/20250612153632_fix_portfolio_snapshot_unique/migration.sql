/*
  Warnings:

  - A unique constraint covering the columns `[userId,date]` on the table `PortfolioSnapshot` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PortfolioSnapshot_date_key";

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioSnapshot_userId_date_key" ON "PortfolioSnapshot"("userId", "date");
