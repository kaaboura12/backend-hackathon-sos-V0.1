# SOS Village D'Enfants - Backend System

Backend API for the SOS Village incident reporting and child protection management system.

## 🎯 Project Overview

This system manages the complete workflow of incident reports from creation to closure, implementing a dynamic role-based permission system that's future-proof for 5+ years.

## ⚡ Quick Start

```bash
# Install dependencies
npm install

# Push schema to database
npx prisma db push

# Seed initial roles
npm run prisma:seed

# Start development server
npm run start:dev
```

Server runs at: `http://localhost:3000`

## 📚 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Test the authentication system with curl examples
- **[AUTH_DOCUMENTATION.md](./AUTH_DOCUMENTATION.md)** - Complete authentication architecture and API reference

## 🏗️ Architecture

### Tech Stack
- **Framework**: NestJS 11
- **Database**: MongoDB Atlas
- **ORM**: Prisma 6
- **Authentication**: JWT with Passport
- **Validation**: class-validator, class-transformer

### Key Features

#### ✅ Dynamic Role-Based Access Control (RBAC)
- Permissions stored in database, not hard-coded
- SuperAdmin can create/modify roles without code deployment
- JWT tokens contain flattened permissions for zero-latency checks
- **Future-proof**: Add new permissions 5 years from now without touching code

#### ✅ Complete Authentication System
- Sign-up with role validation
- Sign-in with JWT token generation
- Password hashing with bcrypt
- Global authentication guards
- Permission-based route protection

#### ✅ Pre-Configured Roles
- **SuperAdmin** - Full system access
- **Mère SOS** - Create incident reports
- **Psychologue** - DPE reports & evaluations
- **Assistant Social** - Action plans & follow-ups
- **Directeur** - Report management & oversight
- **Direction Nationale** - View-only access

## 📁 Project Structure

```
sos-backend/
├── prisma/
│   ├── schema.prisma          # Database schema with dynamic roles
│   └── seed.ts                # Initial role seeding
├── src/
│   ├── auth/                  # Authentication module
│   │   ├── decorators/        # @Permissions(), @CurrentUser(), @Public()
│   │   ├── dto/               # Sign-up, Sign-in DTOs
│   │   ├── guards/            # JWT & Permissions guards
│   │   ├── strategies/        # Passport JWT strategy
│   │   └── auth.service.ts    # Auth logic with flattened permissions
│   ├── role/                  # Role management (CRUD)
│   ├── user/                  # User management
│   ├── prisma/                # Global Prisma service
│   └── main.ts                # Bootstrap with validation
├── AUTH_DOCUMENTATION.md      # Complete auth guide
├── QUICK_START.md            # Testing guide
└── package.json
```

## 🔐 Security Features

- ✅ Passwords hashed with bcrypt (salt rounds: 10)
- ✅ JWT tokens with 7-day expiration
- ✅ Role validation before user creation
- ✅ Global authentication guard
- ✅ Permission-based authorization
- ✅ DTO validation with class-validator
- ✅ Password excluded from all responses

## 🌱 Database Schema

### Key Models
- **User** - Users with dynamic role assignments
- **Role** - Roles with permission arrays
- **Report** - Incident reports with workflow status
- **Document** - Procedure documents (DPE, Action Plans, etc.)
- **AuditLog** - Complete action tracking

## 🧪 Testing

### Run Tests
```bash
npm test
npm run test:e2e
```

### Manual Testing
See [QUICK_START.md](./QUICK_START.md) for curl examples and testing checklist.

## 📋 Available Permissions

### Report Management
`REPORT_CREATE`, `REPORT_READ`, `REPORT_UPDATE`, `REPORT_DELETE`, `REPORT_CLASSIFY`, `REPORT_ASSIGN`

### Document Management
`DOC_UPLOAD_*`, `DOC_READ`, `DOC_DELETE`

### User/Role Management
`USER_*`, `ROLE_*`, `USER_MANAGE`

### System
`AUDIT_READ`, `STATS_VIEW`

**Total**: 26 granular permissions covering all system operations.

## 🚀 API Endpoints

### Authentication
```
POST   /auth/sign-up          Create new user
POST   /auth/sign-in          Get JWT token
GET    /auth/profile          Get current user
GET    /auth/test-permission  Test permission system
```

### Roles (SuperAdmin only)
```
GET    /roles                      List all roles
POST   /roles                      Create role
GET    /roles/:id                  Get role by ID
PATCH  /roles/:id                  Update role permissions
DELETE /roles/:id                  Delete role
GET    /roles/permissions/available List all permissions
```

### Users
```
GET    /users                 List users (USER_READ)
GET    /users/:id             Get user (USER_READ)
PATCH  /users/:id/role        Update user role (USER_MANAGE)
DELETE /users/:id             Delete user (USER_DELETE)
```

## 🔧 Environment Variables

```env
DATABASE_URL="mongodb+srv://..."
JWT_SECRET="your-secret-key"
PORT=3000
```

## 📦 Scripts

```bash
npm run start:dev       # Development with hot reload
npm run build           # Build for production
npm run start:prod      # Run production build
npm run prisma:seed     # Seed roles
npm run lint            # ESLint
npm run format          # Prettier
npm test                # Unit tests
npm run test:e2e        # E2E tests
```

## 🎓 How It Works

### Sign-In Flow
1. User sends credentials
2. System validates password
3. **Fetches user WITH role and permissions from database**
4. **Creates JWT with flattened permissions array**
5. Returns token + user info

### Protected Route Flow
1. Request includes Bearer token
2. JwtAuthGuard validates token
3. JWT payload attached to request.user
4. PermissionsGuard checks if user has required permissions
5. **No database query needed** - permissions are in JWT!

### Adding New Permission (Future)
1. SuperAdmin logs in
2. Updates role via `PATCH /roles/:id`
3. Adds new permission to array
4. **No code deployment needed!**
5. Users get new permission on next login

## 🐛 Troubleshooting

### Build Errors
```bash
npm install
npx prisma generate
npm run build
```

### Database Connection Issues
- Check `DATABASE_URL` in `.env`
- Verify MongoDB Atlas IP whitelist
- Ensure password is URL-encoded

### Authentication Issues
- Verify JWT_SECRET is set
- Check token hasn't expired (7 days)
- Ensure Authorization header format: `Bearer <token>`

## 🔄 Development Workflow

1. Make schema changes in `prisma/schema.prisma`
2. Run `npx prisma db push`
3. Run `npx prisma generate`
4. Restart dev server

## 🎯 Next Steps

- [ ] Implement Report module with full workflow
- [ ] Add Document upload with file storage
- [ ] Create Audit logging for all actions
- [ ] Build Dashboard with statistics
- [ ] Add email notifications
- [ ] Create admin panel UI
- [ ] Implement refresh tokens
- [ ] Add rate limiting
- [ ] Deploy to production

## 📝 Design Decisions

### Why Dynamic Roles?
Hard-coded roles become technical debt. In 5 years, requirements WILL change. With dynamic roles, SuperAdmin can adapt the system without developer intervention.

### Why Flatten Permissions in JWT?
Performance. Checking permissions on every request would require database queries. With permissions in the token, we get instant authorization checks with zero latency.

### Why MongoDB?
- Flexible schema for evolving requirements
- Native support for embedded documents (Attachments)
- Excellent for document-heavy workflows
- Cloud-ready with MongoDB Atlas

## 🤝 Contributing

This project was built for the SOS Village D'Enfants Hackathon with a focus on:
- Clean, maintainable code
- Best practices (SOLID, DRY)
- Comprehensive documentation
- Future-proof architecture

## 📄 License

Proprietary - SOS Village D'Enfants

---

**Built with ❤️ for the children of SOS Villages**
