import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Project } from '../../../core/projects/projects.models';
import { ProjectsService } from '../../../core/projects/projects.service';

/** Максимальная длина описания проекта в карточке */
const DESCRIPTION_MAX_LENGTH = 100;

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [
    RouterLink,
    ButtonModule,
    CardModule,
    MessageModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.scss',
})
export class ProjectListComponent implements OnInit {
  private readonly projectsService = inject(ProjectsService);

  protected readonly projects = signal<Project[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadProjects();
  }

  protected onRetry(): void {
    this.loadProjects();
  }

  /** Обрезает описание до максимальной длины для отображения в карточке */
  protected truncateDescription(description: string | null): string {
    if (!description) {
      return '';
    }
    if (description.length <= DESCRIPTION_MAX_LENGTH) {
      return description;
    }
    return `${description.slice(0, DESCRIPTION_MAX_LENGTH)}…`;
  }

  /** Форматирует дату в читаемый вид */
  protected formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private loadProjects(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.projectsService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Не удалось загрузить проекты. Попробуйте ещё раз.');
        this.isLoading.set(false);
      },
    });
  }
}
