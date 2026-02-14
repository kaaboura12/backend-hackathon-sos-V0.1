import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { JwtPayload } from './dto/jwt-payload.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Sign Up: Create new user with dynamic role
   * IMPORTANT: Validates roleId exists before creating user
   */
  async signUp(signUpDto: SignUpDto) {
    // 1. Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: signUpDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // 2. Validate roleId exists in database (Dynamic Role System)
    const role = await this.prisma.role.findUnique({
      where: { id: signUpDto.roleId },
    });

    if (!role) {
      throw new NotFoundException(
        `Role with ID ${signUpDto.roleId} not found. Please use a valid roleId.`,
      );
    }

    // 3. Hash password
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const hashedPassword = (await bcrypt.hash(
      signUpDto.password,
      10,
    )) as string;

    // 4. Create user with PENDING status (must be approved by SuperAdmin to sign in)
    const user = await this.prisma.user.create({
      data: {
        email: signUpDto.email,
        password: hashedPassword,
        firstName: signUpDto.firstName,
        lastName: signUpDto.lastName,
        roleId: signUpDto.roleId,
        villageName: signUpDto.villageName,
        status: 'PENDING',
      } as { email: string; password: string; firstName: string; lastName: string; roleId: string; villageName?: string; status: 'PENDING' },
      include: {
        role: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return {
      message:
        'Registration submitted. You will be able to sign in once an administrator approves your account.',
      user: userWithoutPassword,
    };
  }

  /**
   * Sign In: Authenticate user and return JWT with flattened permissions
   * This is the CORE of the Dynamic Permission System
   */
  async signIn(signInDto: SignInDto) {
    // 1. Find user with their role and permissions
    const user = await this.prisma.user.findUnique({
      where: { email: signInDto.email },
      include: {
        role: true, // Fetch role with permissions
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const status = (user as { status?: string }).status;
    if (status === 'PENDING') {
      throw new UnauthorizedException(
        'Your account is pending approval. Please wait for an administrator to approve your registration.',
      );
    }
    if (status === 'REJECTED') {
      throw new UnauthorizedException(
        'Your registration was rejected. Contact an administrator for more information.',
      );
    }

    // 2. Verify password
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const isPasswordValid = (await bcrypt.compare(
      signInDto.password,
      user.password,
    )) as boolean;

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Create JWT payload with FLATTENED PERMISSIONS
    // This is what makes the system dynamic and future-proof
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name, // Role name for display
      permissions: user.role.permissions, // Flattened permissions array
    };

    // 4. Sign JWT token
    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        permissions: user.role.permissions,
      },
    };
  }

  /**
   * List roles for sign-up form (public).
   * Returns only id, name, description so users can choose a role when registering.
   */
  async getRolesForSignUp() {
    return this.prisma.role.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Validate user by ID (used by JWT strategy if needed)
   */
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
