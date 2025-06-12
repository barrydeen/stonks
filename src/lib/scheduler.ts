import { createPortfolioSnapshot } from './asset-pricing';
import { prisma } from './db';

/**
 * Schedule daily portfolio snapshots for all users
 * This should be called at 4 PM EST every weekday
 */
export async function scheduleDailySnapshots(): Promise<void> {
  try {
    console.log('Starting daily portfolio snapshot generation...');
    
    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true }
    });
    
    console.log(`Found ${users.length} users to process`);
    
    // Create snapshots for each user
    for (const user of users) {
      try {
        await createPortfolioSnapshot(user.id);
        console.log(`Portfolio snapshot created for user ${user.email}`);
      } catch (error) {
        console.error(`Failed to create snapshot for user ${user.email}:`, error);
      }
    }
    
    console.log('Daily portfolio snapshot generation completed');
  } catch (error) {
    console.error('Error in daily snapshot scheduler:', error);
  }
}

/**
 * Check if today is a weekday (Monday-Friday)
 */
export function isWeekday(): boolean {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
}

/**
 * Check if current time is 4 PM or later
 */
export function isMarketClosed(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 16; // 4 PM or later
}

/**
 * Main scheduler function - should be called by a cron job
 */
export async function runDailyScheduler(): Promise<void> {
  if (!isWeekday()) {
    console.log('Skipping scheduler - not a weekday');
    return;
  }
  
  if (!isMarketClosed()) {
    console.log('Skipping scheduler - market not closed yet');
    return;
  }
  
  await scheduleDailySnapshots();
} 