import { Controller, Get } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { AuthService } from './auth.service.js';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Health endpoint for k8s probes; Better Auth routes live under /api/auth.
  @Get()
  @AllowAnonymous()
  getHello(): string {
    return this.authService.getHello();
  }
}
