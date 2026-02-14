# Quick Start Guide - Testing Authentication

## ✅ Setup Complete!

The authentication system is fully set up and ready to test. Here's what was created:

### 📦 What's Installed
- JWT authentication with Passport
- Dynamic role-based permissions system
- Guards for route protection
- Prisma with MongoDB
- 6 pre-configured roles with permissions

### 🗄️ Database Status
✅ Schema pushed to MongoDB  
✅ 6 roles seeded with IDs:
- **SuperAdmin**: `6990a2530ea1533dee1111e7` (All permissions)
- **Mère SOS**: `6990a2530ea1533dee1111e8` (Create & read reports)
- **Psychologue**: `6990a2530ea1533dee1111e9` (DPE uploads, classifications)
- **Assistant Social**: `6990a2530ea1533dee1111ea` (Action plans, follow-ups)
- **Directeur**: `6990a2530ea1533dee1111eb` (Full report management)
- **Direction Nationale**: `6990a2530ea1533dee1111ec` (View-only access)

## 🚀 Start the Server

```bash
npm run start:dev
```

Server will run on: `http://localhost:3000`

## 🧪 Test the System

### 1️⃣ Create a SuperAdmin User

```bash
curl -X POST http://localhost:3000/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sos.tn",
    "password": "admin123456",
    "firstName": "Super",
    "lastName": "Admin",
    "roleId": "6990a2530ea1533dee1111e7"
  }'
```

### 2️⃣ Sign In

```bash
curl -X POST http://localhost:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sos.tn",
    "password": "admin123456"
  }'
```

**Response will include:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@sos.tn",
    "firstName": "Super",
    "lastName": "Admin",
    "role": "SuperAdmin",
    "permissions": ["REPORT_CREATE", "REPORT_READ", ...]
  }
}
```

Copy the `access_token` for next steps!

### 3️⃣ Test Protected Route

```bash
# Replace <TOKEN> with your access_token
curl http://localhost:3000/auth/profile \
  -H "Authorization: Bearer <TOKEN>"
```

### 4️⃣ Test Permission-Based Route

```bash
# This requires REPORT_CREATE permission (SuperAdmin has it)
curl http://localhost:3000/auth/test-permission \
  -H "Authorization: Bearer <TOKEN>"
```

### 5️⃣ Get All Roles

```bash
curl http://localhost:3000/roles \
  -H "Authorization: Bearer <TOKEN>"
```

### 6️⃣ Get Available Permissions

```bash
curl http://localhost:3000/roles/permissions/available \
  -H "Authorization: Bearer <TOKEN>"
```

### 7️⃣ Create a User with Different Role

Create a Psychologist user:

```bash
curl -X POST http://localhost:3000/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "psychologist@sos.tn",
    "password": "psych123456",
    "firstName": "Marie",
    "lastName": "Dupont",
    "roleId": "6990a2530ea1533dee1111e9",
    "villageName": "Village Gammarth"
  }'
```

### 8️⃣ Test Permission Restriction

Sign in as psychologist and try to access a SuperAdmin-only route:

```bash
# Sign in as psychologist
curl -X POST http://localhost:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "psychologist@sos.tn",
    "password": "psych123456"
  }'

# Try to access roles (requires ROLE_READ which psychologist doesn't have)
curl http://localhost:3000/roles \
  -H "Authorization: Bearer <PSYCHOLOGIST_TOKEN>"
```

**Expected:** `403 Forbidden - Missing required permissions`

## 📋 Testing Checklist

- [ ] Server starts without errors
- [ ] Can create SuperAdmin user
- [ ] Can sign in and receive JWT token
- [ ] Can access protected routes with valid token
- [ ] Permission guard blocks unauthorized access
- [ ] Can create users with different roles
- [ ] JWT contains flattened permissions array
- [ ] Can view all roles via API
- [ ] Password is not returned in responses

## 🔍 Postman Collection

For easier testing, import these requests into Postman:

1. **Sign Up** - POST `http://localhost:3000/auth/sign-up`
2. **Sign In** - POST `http://localhost:3000/auth/sign-in`
3. **Get Profile** - GET `http://localhost:3000/auth/profile` (Bearer Token)
4. **Get Roles** - GET `http://localhost:3000/roles` (Bearer Token)
5. **Get Users** - GET `http://localhost:3000/users` (Bearer Token)

## 🎯 Key Features to Demonstrate

### 1. Dynamic Role System
- SuperAdmin can create new roles without code changes
- Permissions stored in database, not hard-coded

### 2. JWT with Flattened Permissions
```json
{
  "sub": "user_id",
  "email": "user@sos.tn",
  "role": "Psychologue",
  "permissions": ["REPORT_READ", "DOC_UPLOAD_DPE", "REPORT_CLASSIFY"]
}
```

### 3. No Database Query for Permission Check
- Permissions are in the JWT token
- Guards check token permissions array
- Performance optimized ✅

### 4. Future-Proof (5 Years+)
- To add new permission: Just update role in database
- No code deployment needed
- Users get new permissions on next login

## 📖 Full Documentation

See `AUTH_DOCUMENTATION.md` for complete API reference and architecture details.

## 🐛 Common Issues

### "Role not found" Error
```bash
# Re-run the seed script
npm run prisma:seed
```

### Token Expired
Sign in again to get a new token (tokens expire after 7 days).

### 401 Unauthorized
Check your `Authorization` header:
```
Authorization: Bearer <your_token_here>
```

### 403 Forbidden
User doesn't have required permission for that route.

## 🎓 Understanding the Code

### Route Protection Example

```typescript
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  
  @Post()
  @Permissions('REPORT_CREATE') // Only users with this permission
  createReport(@CurrentUser() user: JwtPayload) {
    // user.permissions contains all user's permissions
    return 'Report created';
  }
}
```

### Creating Public Routes

```typescript
@Public() // Skip authentication
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

## 📝 Next Development Steps

1. ✅ Authentication system - DONE
2. Create Report module with workflow
3. Add Document upload functionality
4. Implement Audit logging
5. Build Dashboard with statistics
6. Create frontend integration

## 💡 Tips

- Keep your JWT_SECRET secure in production
- Rotate database password (exposed in chat)
- Use HTTPS in production
- Implement refresh tokens for better UX
- Add rate limiting to prevent abuse

---

**Built for SOS Village D'Enfants Hackathon**  
Authentication system designed to last 5+ years with zero code changes for permission updates! 🚀
