import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CbtModule } from './cbt/cbt.module';
import { PrismaModule } from './prisma/prisma.module';
import { SisModule } from './sis/sis.module';

@Module({
  imports: [PrismaModule, AuthModule, SisModule, CbtModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
