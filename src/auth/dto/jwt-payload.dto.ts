export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string; // Role name (e.g., "Psychologue")
  permissions: string[]; // Flattened permissions from Role
}
