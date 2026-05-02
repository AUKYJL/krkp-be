// src/common/filters/http-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const type = host.getType();

    if (type === "http") {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();

      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      let message = "Internal server error";
      let error = "Internal server error";

      if (exception instanceof HttpException) {
        status = exception.getStatus();
        const responseData = exception.getResponse();

        if (typeof responseData === "string") {
          message = error = responseData;
        } else if (typeof responseData === "object" && responseData !== null) {
          const res = responseData as Record<string, any>;
          message = res.message || message;
          error = res.error || message;
        }
      } else if (exception instanceof Error) {
        message = error = exception.message;
      }

      response.status(status).json({
        statusCode: status,
        message,
        error,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    } else {
      // для тг
      console.error("Non-HTTP Exception caught:", exception);

      if (exception instanceof Error) {
        console.error("Message:", exception.message);
        console.error("Stack:", exception.stack);
      }
    }
  }
}
