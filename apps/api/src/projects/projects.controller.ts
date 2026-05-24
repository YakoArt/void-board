import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import {
  CurrentUser,
  type JwtUser,
} from '../auth/decorators/current-user.decorator.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import type { ProjectResponseDto } from './dto/project-response.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ProjectsService } from './projects.service.js';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /** POST /projects — создать проект */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: JwtUser,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(user.id, dto);
  }

  /** GET /projects — список проектов текущего пользователя */
  @Get()
  findAll(@CurrentUser() user: JwtUser): Promise<ProjectResponseDto[]> {
    return this.projectsService.findAll(user.id);
  }

  /** GET /projects/:slug — проект по slug */
  @Get(':slug')
  findBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtUser,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.findBySlug(user.id, slug);
  }

  /** PATCH /projects/:slug — обновить проект */
  @Patch(':slug')
  update(
    @Param('slug') slug: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: JwtUser,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(user.id, slug, dto);
  }

  /** DELETE /projects/:slug — удалить проект */
  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    return this.projectsService.delete(user.id, slug);
  }
}
