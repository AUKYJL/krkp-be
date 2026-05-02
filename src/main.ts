import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory, Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { session, Telegraf } from "telegraf";
import { AppModule } from "./app.module";
import { AuthGuard } from "./auth/guards/auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import { AllExceptionsFilter } from "./shared/filters/allExceptionFilter";
import { UserService } from "./user/user.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: "*",
    // origin: ['https://127.0.0.1:5173', 'https://124f-178-185-45-73.ngrok-free.app', 'https://aa00-178-185-45-73.ngrok-free.app', 'https://meme-factory.site'],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalGuards(
    new AuthGuard(
      app.get(Reflector),
      app.get(JwtService),
      app.get(UserService),
      app.get(ConfigService),
    ),
    new RolesGuard(app.get(Reflector)),
  );
  const configService = app.get(ConfigService);
  const botToken = configService.get<string>("BOT_TOKEN")!;
  const port = configService.get<number>("PORT") ?? 3000;

  const bot = new Telegraf(botToken);
  bot.use(session());

  const config = new DocumentBuilder()
    .setTitle("title")
    .setDescription("API docs for title")
    .setVersion("1.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      "access-token",
    )

    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  await app.listen(port);
}
bootstrap();
