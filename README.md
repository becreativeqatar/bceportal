# DAMP - Digital Asset & Subscription Manager

A comprehensive web application for managing digital assets, subscriptions, and related business operations. Built with Next.js, TypeScript, Prisma, and Supabase.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Supabase account (for file storage)
- Azure AD app registration (for authentication)

### Local Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd damp
   npm install
   ```

2. **Environment configuration:**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure these required variables in `.env.local`:
   ```env
   # Database
   DATABASE_URL="postgresql://user:pass@localhost:5432/damp"
   
   # NextAuth
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Azure AD
   AZURE_AD_CLIENT_ID="your-azure-client-id"
   AZURE_AD_CLIENT_SECRET="your-azure-client-secret"
   AZURE_AD_TENANT_ID="your-azure-tenant-id"
   
   # Supabase Storage
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   
   # Optional
   RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
   RATE_LIMIT_MAX=100
   ACTIVITY_RETENTION_DAYS=365
   BACKUP_DIR="./backups"
   ```

3. **Database setup:**
   ```bash
   npm run db:generate    # Generate Prisma client
   npm run db:migrate     # Run database migrations
   npm run db:seed        # Seed with initial data (optional)
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```
   
   Access the application at `http://localhost:3000`

## 🏗️ Architecture

### Tech Stack

- **Frontend:** Next.js 15 with App Router, React 19, TypeScript
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL with Prisma migrations
- **Authentication:** NextAuth.js with Azure AD
- **File Storage:** Supabase Storage (private buckets)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Email:** Nodemailer with MailHog for local development
- **Logging:** Pino structured logging

### Key Features

- **Asset Management:** Track hardware, equipment, warranties, assignments
- **Subscription Management:** Monitor SaaS/services, renewals, costs
- **Project Organization:** Group assets/subscriptions by projects
- **User Roles:** Admin and Employee role-based access
- **File Management:** Secure invoice uploads with access control
- **Activity Logging:** Comprehensive audit trail
- **Reporting:** Excel exports, usage reports, cost analysis
- **Security:** Rate limiting, CSRF protection, input validation
- **Automation:** Cron scripts for alerts and maintenance

## 📁 Project Structure

```
damp/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Authentication pages
│   │   ├── admin/             # Admin-only pages
│   │   ├── api/               # API endpoints
│   │   └── dashboard/         # Main application pages
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui base components
│   │   └── forms/            # Form components
│   ├── lib/                   # Utilities and configurations
│   │   ├── security/         # Security middleware
│   │   ├── storage/          # File storage utilities
│   │   └── validations/      # Zod schemas
│   └── middleware.ts          # Next.js middleware
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── migrations/           # Database migrations
│   └── seed.ts               # Database seeding
├── scripts/
│   ├── backup/               # Backup utilities
│   ├── cron/                 # Scheduled tasks
│   └── ops/                  # Operational scripts
└── public/                   # Static assets
```

## 🔐 Security Features

### Built-in Security

- **Rate Limiting:** Token bucket algorithm, configurable limits
- **Security Headers:** CSP, HSTS, X-Frame-Options, etc.
- **CSRF Protection:** Signed tokens for form submissions
- **Input Validation:** Zod schemas for all API endpoints
- **File Security:** Magic number verification, MIME type checking
- **Access Control:** Role-based permissions, entity ownership verification
- **Activity Auditing:** Comprehensive logging of all user actions

### Security Configuration

Rate limiting is enabled by default but can be configured:

```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100           # 100 requests per window
```

File upload validation supports:
- PDF documents (invoices, warranties)
- PNG/JPEG images (receipts, photos)
- Magic number verification to prevent malicious files

## 🛠️ Available Scripts

### Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint code linting
npm run format       # Prettier code formatting
```

### Database Operations
```bash
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with initial data
```

### Maintenance Scripts
```bash
npm run cron:subs           # Check subscription renewals
npm run cron:warranty       # Check warranty expirations
npm run ops:purge-activity  # Clean old activity logs
```

### Backup Operations
```bash
npm run backup:db create                    # Create database backup
npm run backup:db list                      # List available backups
npm run backup:db cleanup [days]            # Delete old backups

npm run backup:files inventory              # Create file inventory
npm run backup:files list [bucket]          # List files in bucket
npm run backup:files download <pattern>     # Download files by pattern

npm run backup:full create                  # Complete backup (DB + files)
npm run backup:full status                  # Show backup history
```

## 📊 API Documentation

### Authentication

All API routes (except health checks) require authentication via NextAuth session cookies.

### Key Endpoints

- `GET /api/health` - System health check
- `GET/POST /api/assets` - Asset management
- `GET/POST /api/subscriptions` - Subscription management
- `GET/POST /api/projects` - Project management
- `POST /api/upload` - File upload
- `POST /api/invoices/signed-url` - Generate signed download URLs
- `GET/PUT /api/settings/branding` - Branding configuration (Admin only)

### Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional context",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_123456"
}
```

## 🔍 Monitoring & Observability

### Health Checks

The application includes comprehensive health monitoring:

```bash
curl http://localhost:3000/api/health
```

Response includes:
- Database connectivity and latency
- Supabase storage accessibility
- System uptime and version
- Overall health status (200 = healthy, 503 = degraded)

### Structured Logging

All operations are logged with structured data using Pino:

```javascript
logger.info({ 
  userId: 'user123', 
  assetId: 'asset456', 
  action: 'ASSET_UPDATED' 
}, 'Asset updated successfully');
```

Logs include request IDs for tracing requests across operations.

### Activity Audit Trail

Every user action is logged to the `ActivityLog` table with:
- Actor (user who performed the action)
- Action type (e.g., `ASSET_CREATED`, `SUBSCRIPTION_UPDATED`)
- Entity information (type and ID)
- Payload (relevant data)
- Timestamp

## 🎨 Customization

### Branding Settings

Admins can customize the application appearance:

1. Navigate to **Admin → Settings**
2. Configure:
   - Company name
   - Logo URL
   - Primary color (buttons, highlights)
   - Secondary color (subtle elements)

Settings are cached for performance and applied globally.

### Environment-Specific Configuration

The application adapts to different environments:

- **Development:** Relaxed CSP, detailed error messages
- **Production:** Strict security headers, minimal error exposure

## 🚨 Troubleshooting

### Common Issues

**Database Connection Issues:**
```bash
# Check connection
npx prisma db pull

# Reset database (development only)
npx prisma migrate reset
```

**Supabase Storage Issues:**
```bash
# Test storage connectivity
npm run backup:files list
```

**Authentication Issues:**
- Verify Azure AD configuration
- Check NEXTAUTH_SECRET is set
- Ensure NEXTAUTH_URL matches your domain

**File Upload Issues:**
- Check Supabase bucket permissions
- Verify file type is supported (PDF, PNG, JPEG)
- Check file size limits

### Logs and Debugging

**Development Logs:**
```bash
tail -f .next/trace    # Next.js build traces
```

**Production Logs:**
```bash
# Application logs are written to stdout
# Configure your hosting platform to capture these
```

**Health Check:**
```bash
curl -v http://localhost:3000/api/health
```

## 📈 Performance

### Optimization Features

- **Turbopack:** Fast development builds
- **Image Optimization:** Next.js automatic image optimization
- **Caching:** Branding settings cached for 5 minutes
- **Database Indexing:** Optimized queries for common operations
- **Batch Operations:** Bulk activity log cleanup

### Recommended Production Settings

```env
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
```

Ensure your hosting platform:
- Enables HTTP/2
- Configures appropriate cache headers
- Uses CDN for static assets
- Implements database connection pooling

## 🤝 Contributing

### Development Workflow

1. Create feature branch
2. Make changes
3. Run tests: `npm run typecheck && npm run lint`
4. Test locally with all features
5. Submit pull request

### Code Standards

- TypeScript strict mode enabled
- ESLint configuration enforced
- Prettier formatting required
- All API endpoints must have Zod validation
- Security middleware required for sensitive operations

### Testing Checklist

- [ ] Authentication flows work correctly
- [ ] CRUD operations function properly
- [ ] File uploads and downloads work
- [ ] Rate limiting activates appropriately
- [ ] Admin settings apply correctly
- [ ] Backup scripts run successfully
- [ ] Activity logging captures actions
- [ ] Health checks pass

## 📜 License

This project is proprietary software. All rights reserved.

---

## Quick Reference

### Essential Commands
```bash
# Start development
npm run dev

# Full backup
npm run backup:full create

# Check health
curl http://localhost:3000/api/health

# Clean old logs
npm run ops:purge-activity
```

### Important URLs
- Local: `http://localhost:3000`
- Health: `/api/health`
- Admin: `/admin`
- Settings: `/admin/settings`

For additional help, check the operational runbook and QA checklist in the documentation.