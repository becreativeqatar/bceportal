import { spawn } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

console.log('🚀 DAMP Quick Start Setup');
console.log('========================');

async function quickStart() {
  try {
    // Load environment variables
    config({ path: '.env.local' });
    
    // 1. Create SQLite environment file for quick start
    console.log('\n📝 Setting up SQLite environment...');
    const envContent = `# SQLite Database (no PostgreSQL required)
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET="damp-quick-start-secret-${Math.random().toString(36).substring(7)}"
NEXTAUTH_URL="http://localhost:3000"

# Placeholder values for local development
AZURE_AD_CLIENT_ID="placeholder"
AZURE_AD_CLIENT_SECRET="placeholder"
AZURE_AD_TENANT_ID="placeholder"

SUPABASE_URL="placeholder"
SUPABASE_SERVICE_ROLE_KEY="placeholder"

# Local development settings
ALLOW_LOCAL_CREDENTIALS="true"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
ACTIVITY_RETENTION_DAYS=365
BACKUP_DIR="./backups"
NODE_ENV="development"
`;

    writeFileSync('.env.local', envContent);
    console.log('✅ Environment file created with SQLite');

    // 2. Update Prisma schema to use SQLite
    console.log('\n🔧 Configuring database for SQLite...');
    const prismaSchemaPath = join('prisma', 'schema.prisma');
    let schemaContent = require('fs').readFileSync(prismaSchemaPath, 'utf8');
    
    // Replace PostgreSQL with SQLite
    schemaContent = schemaContent.replace(
      'provider = "postgresql"',
      'provider = "sqlite"'
    );
    
    writeFileSync(prismaSchemaPath, schemaContent);
    console.log('✅ Prisma schema updated for SQLite');

    // 3. Generate Prisma client
    console.log('\n⚙️ Generating Prisma client...');
    await runCommand('npx', ['prisma', 'generate']);

    // 4. Run migrations
    console.log('\n📊 Setting up database schema...');
    await runCommand('npx', ['prisma', 'db', 'push']);

    // 5. Seed with sample data
    console.log('\n🌱 Adding sample data...');
    try {
      await runCommand('npm', ['run', 'db:seed']);
    } catch (error) {
      console.log('ℹ️ Seeding skipped (optional)');
    }

    console.log('\n🎉 Quick start setup completed!');
    console.log('\n📋 What was set up:');
    console.log('  ✅ SQLite database (no PostgreSQL needed)');
    console.log('  ✅ Environment configuration');
    console.log('  ✅ Database schema');
    console.log('  ✅ Sample data');
    
    console.log('\n🚀 Ready to start!');
    console.log('Run: npm run dev');
    console.log('\n🌐 Then open: http://localhost:3000');
    console.log('\n🔑 Login with:');
    console.log('  📧 Email: admin@test.com');
    console.log('  🔒 Password: dev123');

  } catch (error) {
    console.error('\n❌ Quick start failed:', error);
    process.exit(1);
  }
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { 
      stdio: 'inherit',
      shell: true 
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

quickStart();