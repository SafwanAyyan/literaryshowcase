const fs = require('fs');
const crypto = require('crypto');

// Generate a secure random secret
const generateSecret = () => crypto.randomBytes(32).toString('hex');

const envContent = `# Literary Showcase Environment Configuration
# Generated on ${new Date().toISOString()}

# OpenAI Configuration (Add your API key from https://platform.openai.com/api-keys)
OPENAI_API_KEY=your_openai_api_key_here

# Database (SQLite for local development)
DATABASE_URL="file:./dev.db"

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${generateSecret()}

# Admin Configuration
ADMIN_EMAIL=admin@literaryshowcase.com

# Environment
NODE_ENV=development
`;

// Check if .env.local already exists
if (fs.existsSync('.env.local')) {
  console.log('⚠️  .env.local already exists. Skipping creation.');
  console.log('   If you want to recreate it, delete the existing file first.');
} else {
  // Create .env.local file
  fs.writeFileSync('.env.local', envContent);
  console.log('✅ Created .env.local file with secure defaults');
  console.log('');
  console.log('🔑 IMPORTANT: Add your OpenAI API key to .env.local');
  console.log('   1. Go to https://platform.openai.com/api-keys');
  console.log('   2. Create a new API key');
  console.log('   3. Replace "your_openai_api_key_here" in .env.local');
  console.log('');
  console.log('🚀 Then run: npm run dev');
}