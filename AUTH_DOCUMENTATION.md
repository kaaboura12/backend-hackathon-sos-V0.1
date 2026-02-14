# SOS Village Authentication System

## 🎯 Overview

This authentication system implements a **Dynamic Role-Based Access Control (RBAC)** that is future-proof for 5+ years. Instead of hard-coded roles, permissions are stored in the database and can be modified by SuperAdmin without code changes.

## 🔑 Key Features

### 1. Dynamic Permissions System
- **No hard-coded roles** in code
- Permissions stored in database
- SuperAdmin can create/modify roles and permissions
- JWT tokens contain flattened permissions for performance
- No database query needed for every permission check

### 2. JWT-Based Authentication
- Secure token-based authentication
- Token contains: `sub`, `email`, `role`, `permissions[]`
- 7-day token expiration
- Bearer token authentication

### 3. Security Best Practices
- Passwords hashed with bcrypt
- Role validation before user creation
- Permission-based route protection
- Global authentication guard with `@Public()` decorator

## 📋 Pre-Seeded Roles

Run `npm run prisma:seed` to create these roles:

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **SuperAdmin** | Full system access | All permissions including role management |
| **Mère SOS** | SOS Mother | `REPORT_CREATE`, `REPORT_READ` |
| **Psychologue** | Psychologist | `REPORT_READ`, `DOC_UPLOAD_DPE`, `REPORT_CLASSIFY` |
| **Assistant Social** | Social Worker | `REPORT_READ`, `DOC_UPLOAD_PLAN_ACTION`, `DOC_UPLOAD_SUIVI` |
| **Directeur** | Director | Report management, assignment, oversight |
| **Direction Nationale** | National Direction | View-only access for auditing |

## 🚀 Getting Started

### 1. Push Database Schema
```bash
npx prisma db push
```

### 2. Seed Initial Roles
```bash
npm run prisma:seed
```

### 3. Start Development Server
```bash
npm run start:dev
```

## 📡 API Endpoints

### Authentication

#### Sign Up
```http
POST /auth/sign-up
Content-Type: application/json

{
  "email": "user@sos.tn",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe",
  "roleId": "role_id_from_seed", // Get from seed output or /roles endpoint
  "villageName": "Village Name" // Optional
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "user_id",
    "email": "user@sos.tn",
    "firstName": "John",
    "lastName": "Doe",
    "role": { "name": "Psychologue", "permissions": [...] }
  }
}
```

#### Sign In
```http
POST /auth/sign-in
Content-Type: application/json

{
  "email": "user@sos.tn",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@sos.tn",
    "firstName": "John",
    "lastName": "Doe",
    "role": "Psychologue",
    "permissions": ["REPORT_READ", "DOC_UPLOAD_DPE", ...]
  }
}
```

#### Get Profile
```http
GET /auth/profile
Authorization: Bearer <access_token>
```

### Role Management (SuperAdmin Only)

#### Get All Roles
```http
GET /roles
Authorization: Bearer <access_token>
```

#### Get Available Permissions
```http
GET /roles/permissions/available
Authorization: Bearer <access_token>
```

#### Create Role
```http
POST /roles
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Custom Role",
  "description": "Custom role description",
  "permissions": ["REPORT_READ", "REPORT_CREATE"]
}
```

#### Update Role Permissions
```http
PATCH /roles/:roleId
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "permissions": ["REPORT_READ", "REPORT_CREATE", "DOC_UPLOAD_DPE"]
}
```

### User Management

#### Get All Users
```http
GET /users
Authorization: Bearer <access_token>
Requires: USER_READ permission
```

#### Update User Role
```http
PATCH /users/:userId/role
Authorization: Bearer <access_token>
Requires: USER_MANAGE permission
Content-Type: application/json

{
  "roleId": "new_role_id"
}
```

## 🛡️ Using Guards and Decorators

### Protect Routes with Permissions

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { Permissions } from './auth/decorators/permissions.decorator';
import { CurrentUser } from './auth/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  
  // Only users with REPORT_CREATE permission can access
  @Post()
  @Permissions('REPORT_CREATE')
  createReport(@CurrentUser() user: JwtPayload) {
    // user contains: sub, email, role, permissions
    return `Report created by ${user.email}`;
  }

  // Multiple permissions required (user must have ALL)
  @Delete(':id')
  @Permissions('REPORT_DELETE', 'REPORT_READ')
  deleteReport(@Param('id') id: string) {
    return `Report ${id} deleted`;
  }
}
```

### Make Route Public

```typescript
import { Public } from './auth/decorators/public.decorator';

@Controller('public')
export class PublicController {
  
  @Public() // Skip authentication
  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }
}
```

### Global Authentication

Authentication is applied globally via `APP_GUARD` in `app.module.ts`. Use `@Public()` decorator to skip authentication on specific routes (like sign-up, sign-in).

## 🔐 Available Permissions

### Report Management
- `REPORT_CREATE` - Create incident reports
- `REPORT_READ` - View reports
- `REPORT_UPDATE` - Update report details
- `REPORT_DELETE` - Delete reports
- `REPORT_CLASSIFY` - Mark reports as false/closed
- `REPORT_ASSIGN` - Assign reports to analysts

### Document Management
- `DOC_UPLOAD_FICHE_INITIAL` - Upload initial form
- `DOC_UPLOAD_DPE` - Upload DPE report
- `DOC_UPLOAD_EVALUATION` - Upload evaluation
- `DOC_UPLOAD_PLAN_ACTION` - Upload action plan
- `DOC_UPLOAD_SUIVI` - Upload follow-up report
- `DOC_UPLOAD_RAPPORT_FINAL` - Upload final report
- `DOC_UPLOAD_CLOTURE` - Upload closure document
- `DOC_READ` - View documents
- `DOC_DELETE` - Delete documents

### User Management
- `USER_READ` - View users
- `USER_CREATE` - Create users
- `USER_UPDATE` - Update user details
- `USER_DELETE` - Delete users
- `USER_MANAGE` - Change user roles

### Role Management
- `ROLE_CREATE` - Create new roles
- `ROLE_READ` - View roles
- `ROLE_UPDATE` - Update role permissions
- `ROLE_DELETE` - Delete roles

### System
- `AUDIT_READ` - View audit logs
- `STATS_VIEW` - View dashboard statistics

## 🎓 How It Works (The Magic)

### 1. Sign-Up Flow
1. User sends roleId (not role name)
2. System validates roleId exists in database
3. Password is hashed with bcrypt
4. User is created with roleId reference

### 2. Sign-In Flow (Key Part!)
1. User sends credentials
2. System validates password
3. **Fetches user WITH their role and permissions**
4. **Creates JWT with flattened permissions array**
5. Returns token + user info

### 3. Protected Route Flow
1. Request includes Bearer token
2. `JwtAuthGuard` validates token signature
3. JWT payload attached to `request.user`
4. `PermissionsGuard` checks if user has required permissions
5. No database query needed - permissions are in JWT!

### 4. Future-Proof (5+ Years)
When requirements change:
1. SuperAdmin logs in
2. Goes to `/roles/:roleId` endpoint
3. Updates permissions array
4. **No code changes needed!**
5. New users get new permissions in their JWT
6. Existing users get new permissions on next login

## 🧪 Testing the System

### 1. Get Role IDs
```bash
# After seeding, note the role IDs printed in console
# Or call the API:
curl http://localhost:3000/roles
```

### 2. Create SuperAdmin User
```bash
curl -X POST http://localhost:3000/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sos.tn",
    "password": "admin123456",
    "firstName": "Super",
    "lastName": "Admin",
    "roleId": "<superadmin_role_id_from_seed>"
  }'
```

### 3. Sign In
```bash
curl -X POST http://localhost:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sos.tn",
    "password": "admin123456"
  }'
```

### 4. Test Protected Route
```bash
# Copy the access_token from sign-in response
curl http://localhost:3000/auth/profile \
  -H "Authorization: Bearer <access_token>"
```

## 🔧 Environment Variables

```env
DATABASE_URL="mongodb+srv://..."
JWT_SECRET="your-secret-key"
PORT=3000
```

## 📦 Project Structure

```
src/
├── auth/
│   ├── decorators/
│   │   ├── current-user.decorator.ts    # Extract user from request
│   │   ├── permissions.decorator.ts     # Define required permissions
│   │   └── public.decorator.ts          # Skip authentication
│   ├── dto/
│   │   ├── sign-up.dto.ts              # Sign-up validation
│   │   ├── sign-in.dto.ts              # Sign-in validation
│   │   └── jwt-payload.dto.ts          # JWT payload interface
│   ├── guards/
│   │   ├── jwt-auth.guard.ts           # JWT validation
│   │   └── permissions.guard.ts        # Permission checking
│   ├── strategies/
│   │   └── jwt.strategy.ts             # Passport JWT strategy
│   ├── auth.controller.ts              # Auth endpoints
│   ├── auth.service.ts                 # Auth logic
│   └── auth.module.ts
├── role/
│   ├── dto/
│   │   ├── create-role.dto.ts
│   │   └── update-role.dto.ts
│   ├── role.controller.ts
│   ├── role.service.ts
│   └── role.module.ts
├── user/
│   ├── user.controller.ts
│   ├── user.service.ts
│   └── user.module.ts
├── prisma/
│   ├── prisma.service.ts               # Prisma client
│   └── prisma.module.ts
└── main.ts                              # Bootstrap with validation
```

## 🎯 Best Practices

1. **Always validate roleId** before creating users
2. **Use `@Permissions()` decorator** instead of checking role names
3. **Add new permissions** to the permissions list in `role.service.ts`
4. **Keep JWT tokens short-lived** (7 days default)
5. **Use `@Public()` sparingly** - only for sign-up, sign-in, health checks
6. **Log permission changes** for audit trail (implement in audit logs)

## 🐛 Troubleshooting

### "Role not found" during sign-up
- Run `npm run prisma:seed` to create roles
- Check roleId matches an existing role in database

### "Unauthorized" on protected routes
- Ensure token is included: `Authorization: Bearer <token>`
- Check token hasn't expired (7 days)
- Verify JWT_SECRET matches between sign-in and validation

### "Missing required permissions"
- User's role doesn't have the required permission
- Update role permissions via `/roles/:id` endpoint
- User needs to log in again to get updated permissions in JWT

## 🚀 Next Steps

1. Implement audit logging for permission changes
2. Add refresh token mechanism
3. Add password reset functionality
4. Implement rate limiting
5. Add email verification
6. Create admin dashboard for role management

---

Built with ❤️ for SOS Village D'Enfants Hackathon
