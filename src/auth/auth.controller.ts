import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload } from './dto/jwt-payload.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Permissions } from './decorators/permissions.decorator';
import { PermissionsGuard } from './guards/permissions.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('sign-up')
  @ApiOperation({
    summary: 'Register new user',
    description:
      'Create a new user account with a specific role. Requires a valid roleId from the database. Use GET /roles to see available roles and their IDs.',
  })
  @ApiBody({ type: SignUpDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    schema: {
      example: {
        message: 'User created successfully',
        user: {
          id: '6990a2530ea1533dee1111ed',
          email: 'user@sos.tn',
          firstName: 'John',
          lastName: 'Doe',
          villageName: 'Village Gammarth',
          roleId: '6990a2530ea1533dee1111e7',
          role: {
            id: '6990a2530ea1533dee1111e7',
            name: 'Psychologue',
            permissions: ['REPORT_READ', 'DOC_UPLOAD_DPE'],
          },
          createdAt: '2024-01-15T10:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'User already exists or invalid roleId',
  })
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in user',
    description:
      'Authenticate user and receive JWT token with flattened permissions. Token is valid for 7 days.',
  })
  @ApiBody({ type: SignInDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '6990a2530ea1533dee1111ed',
          email: 'admin@sos.tn',
          firstName: 'Super',
          lastName: 'Admin',
          role: 'SuperAdmin',
          permissions: [
            'REPORT_CREATE',
            'REPORT_READ',
            'USER_MANAGE',
            'ROLE_UPDATE',
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve authenticated user information from JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    schema: {
      example: {
        message: 'Profile retrieved successfully',
        user: {
          sub: '6990a2530ea1533dee1111ed',
          email: 'admin@sos.tn',
          role: 'SuperAdmin',
          permissions: ['REPORT_CREATE', 'USER_MANAGE', 'ROLE_UPDATE'],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  getProfile(@CurrentUser() user: JwtPayload) {
    return {
      message: 'Profile retrieved successfully',
      user,
    };
  }

  @Get('test-permission')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('REPORT_CREATE')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Test permission system',
    description: 'Example endpoint that requires REPORT_CREATE permission',
  })
  @ApiResponse({
    status: 200,
    description: 'User has required permission',
  })
  @ApiResponse({
    status: 403,
    description: 'Missing required permissions',
  })
  testPermission(@CurrentUser() user: JwtPayload) {
    return {
      message: 'You have REPORT_CREATE permission!',
      user,
    };
  }
}
