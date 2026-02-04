/**
 * Demo Data Seeder
 * Run this to reset and seed fresh demo data for the admin account
 * 
 * Usage: npx tsx server/seed-demo.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env files
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { db, initDatabase } from './db';
import { seedScenarios, seedUserDashboardData } from './dashboard';
import { hashPassword } from './auth';
import { randomUUID } from 'crypto';

async function seedDemoData() {
  console.log('🌱 Seeding demo data...\n');

  try {
    // Initialize database tables
    await initDatabase();
    
    // Seed scenarios
    await seedScenarios();

    // Check if admin user exists
    const adminResult = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: ['admin@axtra.local'],
    });

    let adminId: string;

    if (adminResult.rows.length === 0) {
      // Create admin user
      console.log('👤 Creating admin user...');
      adminId = randomUUID();
      const passwordHash = await hashPassword('admin123');
      const now = new Date().toISOString();

      await db.execute({
        sql: `
          INSERT INTO users (id, email, password_hash, name, initials, role, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [adminId, 'admin@axtra.local', passwordHash, 'Admin User', 'AU', 'admin', now, now],
      });

      // Create default account
      const accountId = randomUUID();
      await db.execute({
        sql: `
          INSERT INTO accounts (id, user_id, account_name, account_type, settings, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [accountId, adminId, 'Operations Console', 'business', '{}', now, now],
      });

      console.log('✅ Admin user created');
    } else {
      adminId = adminResult.rows[0].id as string;
      console.log('👤 Admin user exists, updating data...');

      // Clear existing dashboard data for fresh seed
      await db.execute({
        sql: 'DELETE FROM user_metrics WHERE user_id = ?',
        args: [adminId],
      });
      await db.execute({
        sql: 'DELETE FROM skill_velocity WHERE user_id = ?',
        args: [adminId],
      });
      await db.execute({
        sql: 'DELETE FROM qa_highlights WHERE user_id = ?',
        args: [adminId],
      });
      await db.execute({
        sql: 'DELETE FROM user_scenarios WHERE user_id = ?',
        args: [adminId],
      });

      console.log('🗑️  Cleared old dashboard data');
    }

    // Seed dashboard data for admin
    await seedUserDashboardData(adminId);

    console.log('\n✅ Demo data seeded successfully!');
    console.log('\n📧 Login credentials:');
    console.log('   Email: admin@axtra.local');
    console.log('   Password: admin123');
    console.log('\n📊 Dashboard data includes:');
    console.log('   • 5 KPI metrics');
    console.log('   • 6 training scenarios');
    console.log('   • Skill velocity (Level 8)');
    console.log('   • 3 QA highlights');

  } catch (error) {
    console.error('❌ Failed to seed demo data:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedDemoData();
