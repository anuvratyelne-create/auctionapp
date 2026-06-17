/**
 * Script to create the first admin user
 * Run with: npx ts-node scripts/create-admin.ts
 *
 * Environment variables needed:
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY (or SUPABASE_SERVICE_KEY)
 */

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log('\n=== Admin User Creation Script ===\n');

  // Get admin details
  const email = await question('Admin email: ');
  const name = await question('Admin name: ');
  const password = await question('Admin password (min 8 characters): ');

  if (!email || !name || !password) {
    console.error('All fields are required');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  // Check if admin already exists
  const { data: existing } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existing) {
    console.error(`\nAdmin with email ${email} already exists!`);
    process.exit(1);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create admin
  const { data: admin, error } = await supabase
    .from('admin_users')
    .insert({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name,
      status: 'active'
    })
    .select()
    .single();

  if (error) {
    console.error('\nFailed to create admin:', error.message);
    process.exit(1);
  }

  console.log('\n=== Admin Created Successfully ===');
  console.log(`ID: ${admin.id}`);
  console.log(`Email: ${admin.email}`);
  console.log(`Name: ${admin.name}`);
  console.log(`\nYou can now login at /admin/login`);

  rl.close();
}

main().catch(console.error);
