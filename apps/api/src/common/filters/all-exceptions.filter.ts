import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Единый формат ответа при ошибках.
 */
interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}

/**
 * Глобальный фильтр для ВСЕХ исключений — включая необработанные TypeError,
 * ошибки Prisma и прочие runtime-ошибки, которые не являются HttpException.
 *
 * Гарантирует единый формат ответа и логирование неожиданных ошибок.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = HttpStatus[statusCode] ?? 'Unknown Error';
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const body = exceptionResponse as Record<string, unknown>;
        message = (body['message'] as string | string[]) ?? exception.message;
        error =
          (body['error'] as string) ?? HttpStatus[statusCode] ?? 'Unknown Error';
      } else {
        message = exception.message;
        error = HttpStatus[statusCode] ?? 'Unknown Error';
      }
    } else {
      // Необработанное исключение — логируем полный стек, клиенту отдаём 500
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      error = 'Internal Server Error';
      message = 'Внутренняя ошибка сервера';

      this.logger.error(
        `Необработанное исключение: ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const errorBody: ErrorResponse = {
      statusCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(errorBody);
  }
}
