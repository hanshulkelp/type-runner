import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { dbConfig } from '../config/db.config';
import { UsersModule } from './modules/user/users.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // isGlobal=true means ConfigModule is available everywhere
    // without needing to import it in every sub-module
    ConfigModule.forRoot({ isGlobal: true }),

    // connects to Postgres using values from .env
    SequelizeModule.forRootAsync(dbConfig),

    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}