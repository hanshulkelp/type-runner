import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../user/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    // check if email is already taken before trying to insert
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
        // sends a 409 (data is correct but conflicts with existing data) and a helpful message
      throw new ConflictException('Email already in use');
    }

    // 12 salt rounds — good balance between security and performance
    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.usersService.createUser({ ...dto, passwordHash });

    return { message: 'created' };
  }

  async login(dto: LoginDto): Promise<{ access_token: string; expires_in: number }> {
    const user = await this.usersService.findByEmail(dto.email);

    // same error for wrong email or wrong password — never reveal which one failed
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordsMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordsMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // sub = subject, the standard JWT field for the user's ID
    const token = this.jwtService.sign({ sub: user.id, username: user.username });

    return { access_token: token, expires_in: 1800 };
  }
}