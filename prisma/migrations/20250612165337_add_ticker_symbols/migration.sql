-- CreateTable
CREATE TABLE "TickerSymbol" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exchange" TEXT,
    "type" TEXT,
    "currency" TEXT,
    "country" TEXT,
    "sector" TEXT,
    "industry" TEXT,
    "marketCap" BIGINT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TickerSymbol_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TickerSymbol_symbol_key" ON "TickerSymbol"("symbol");

-- CreateIndex
CREATE INDEX "TickerSymbol_symbol_idx" ON "TickerSymbol"("symbol");

-- CreateIndex
CREATE INDEX "TickerSymbol_exchange_idx" ON "TickerSymbol"("exchange");

-- CreateIndex
CREATE INDEX "TickerSymbol_type_idx" ON "TickerSymbol"("type");

-- CreateIndex
CREATE INDEX "TickerSymbol_isActive_idx" ON "TickerSymbol"("isActive");
