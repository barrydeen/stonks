#!/usr/bin/env node

// Test script for ticker synchronization
const { syncTickerSymbols, getAllTickerSymbols, searchTickerSymbols } = require('../src/lib/ticker-sync.ts');

async function testTickerSync() {
  console.log('🚀 Starting Ticker Synchronization Test\n');
  
  try {
    // Test 1: Check if we can connect to the API and sync symbols
    console.log('📡 Testing ticker synchronization...');
    const syncResult = await syncTickerSymbols();
    
    console.log('✅ Sync Results:');
    console.log(`   Success: ${syncResult.success}`);
    console.log(`   Total Fetched: ${syncResult.totalFetched}`);
    console.log(`   Total Saved: ${syncResult.totalSaved}`);
    console.log(`   Errors: ${syncResult.errors.length}`);
    
    if (syncResult.errors.length > 0) {
      console.log('⚠️  Errors encountered:');
      syncResult.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Check database contents
    console.log('📊 Testing database queries...');
    
    const allSymbols = await getAllTickerSymbols({ limit: 10 });
    console.log(`✅ Found ${allSymbols.total} total symbols in database`);
    console.log('📋 First 10 symbols:');
    allSymbols.symbols.forEach(symbol => {
      console.log(`   ${symbol.symbol} - ${symbol.name} (${symbol.type})`);
    });
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 3: Test search functionality
    console.log('🔍 Testing search functionality...');
    
    const searchResults = await searchTickerSymbols('AAPL');
    console.log(`✅ Search for "AAPL" returned ${searchResults.length} results:`);
    searchResults.forEach(symbol => {
      console.log(`   ${symbol.symbol} - ${symbol.name} (${symbol.exchange || 'N/A'})`);
    });
    
    // Test 4: Test filtering by type
    const stocksOnly = await getAllTickerSymbols({ type: 'stock', limit: 5 });
    console.log(`\n📈 Found ${stocksOnly.total} stocks, showing first 5:`);
    stocksOnly.symbols.forEach(symbol => {
      console.log(`   ${symbol.symbol} - ${symbol.name}`);
    });
    
    const etfsOnly = await getAllTickerSymbols({ type: 'etf', limit: 5 });
    console.log(`\n📊 Found ${etfsOnly.total} ETFs, showing first 5:`);
    etfsOnly.symbols.forEach(symbol => {
      console.log(`   ${symbol.symbol} - ${symbol.name}`);
    });
    
    console.log('\n' + '='.repeat(50) + '\n');
    console.log('✨ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testTickerSync(); 