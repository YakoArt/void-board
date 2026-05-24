import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../../../packages/database/generated/client/index.js';
import { generateSlug } from '../common/utils/generate-slug.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateProjectDto } from './dto/create-project.dto.js';
import type { ProjectResponseDto } from './dto/project-response.dto.js';
import type { UpdateProjectDto } from './dto/update-project.dto.js';

/** Максимальное количество попыток генерации уникального slug. */
const SLUG_RETRY_LIMIT = 5;

/** Код ошибки Prisma для нарушения уникального ограничения. */
const PRISMA_UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Создаёт новый проект для указанного пользователя. */
  async create(
    userId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    let attempt = 0;

    while (attempt < SLUG_RETRY_LIMIT) {
      const slug = generateSlug(dto.name);

      try {
        const project = await this.prisma.project.create({
          data: {
            slug,
            name: dto.name,
            description: dto.description ?? null,
            ownerId: userId,
          },
        });

        return this.toResponseDto(project);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === PRISMA_UNIQUE_VIOLATION
        ) {
          attempt++;

          if (attempt >= SLUG_RETRY_LIMIT) {
            throw new ConflictException(
              'Не удалось сгенерировать уникальный slug. Попробуйте ещё раз.',
            );
          }

          continue;
        }

        throw error;
      }
    }

    // Этот код недостижим, но TypeScript требует явного return
    throw new ConflictException(
      'Не удалось создать проект. Попробуйте ещё раз.',
    );
  }

  /** Возвращает все проекты пользователя, отсортированные по дате создания (новые первые). */
  async findAll(userId: string): Promise<ProjectResponseDto[]> {
    const projects = await this.prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((project) => this.toResponseDto(project));
  }

  /** Возвращает проект по slug. Только проекты текущего пользователя. */
  async findBySlug(userId: string, slug: string): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findFirst({
      where: { slug, ownerId: userId },
    });

    if (!project) {
      throw new NotFoundException('Проект не найден');
    }

    return this.toResponseDto(project);
  }

  /** Обновляет проект. Slug не меняется при изменении name. */
  async update(
    userId: string,
    slug: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const existing = await this.prisma.project.findFirst({
      where: { slug, ownerId: userId },
    });

    if (!existing) {
      throw new NotFoundException('Проект не найден');
    }

    const project = await this.prisma.project.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    return this.toResponseDto(project);
  }

  /** Удаляет проект. Каскадное удаление issues/labels обеспечивает Prisma-схема. */
  async delete(userId: string, slug: string): Promise<void> {
    const existing = await this.prisma.project.findFirst({
      where: { slug, ownerId: userId },
    });

    if (!existing) {
      throw new NotFoundException('Проект не найден');
    }

    await this.prisma.project.delete({
      where: { id: existing.id },
    });
  }

  /** Маппит Prisma-модель проекта в DTO ответа. */
  private toResponseDto(project: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ProjectResponseDto {
    return {
      id: project.id,
      slug: project.slug,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }
}
