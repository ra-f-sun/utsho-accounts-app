import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser') as () => ReturnType<typeof import('cookie-parser')>;
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SanitizePipe } from './common/pipes/sanitize.pipe';

const DEV_JWT_DEFAULT =
  'utsho-secret-key-development-only-change-in-production-2026';

function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return;

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_JWT_DEFAULT) {
    console.error(
      'FATAL: JWT_SECRET is not set or uses the dev default in production',
    );
    process.exit(1);
  }
  if (!process.env.FRONTEND_URL) {
    console.error('FATAL: FRONTEND_URL is not set in production');
    process.exit(1);
  }
}

async function bootstrap() {
  validateEnv();
  const app = await NestFactory.create(AppModule);

  // Enable cookie parsing (for httpOnly refresh token)
  app.use(cookieParser());

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5174',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true, // required for httpOnly cookies
  });

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Global sanitize pipe (strips HTML tags) — runs before validation
  app.useGlobalPipes(new SanitizePipe());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global response interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
}
bootstrap();
