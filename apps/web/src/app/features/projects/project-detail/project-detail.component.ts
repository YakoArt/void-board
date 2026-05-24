import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ProjectsService } from '../../../core/projects/projects.service';
import { Project } from '../../../core/projects/projects.models';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [RouterLink, CardModule, ButtonModule, ConfirmDialogModule, ProgressSpinnerModule, MessageModule, ToastModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss',
})
export class ProjectDetailComponent implements OnInit {
  private readonly projectsService = inject(ProjectsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  protected readonly project = signal<Project | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      void this.router.navigate(['/projects']);
      return;
    }
    this.loadProject(slug);
  }

  protected formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  protected onDelete(): void {
    const project = this.project();
    if (!project) return;

    this.confirmationService.confirm({
      message: 'Все issues и метки проекта будут удалены безвозвратно. Продолжить?',
      header: 'Удаление проекта',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Удалить',
      rejectLabel: 'Отмена',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.projectsService.deleteProject(project.slug).subscribe({
          next: () => {
            void this.router.navigate(['/projects']);
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Ошибка',
              detail: 'Не удалось удалить проект',
            });
          },
        });
      },
    });
  }

  private loadProject(slug: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.projectsService.getProject(slug).subscribe({
      next: (project) => {
        this.project.set(project);
        this.isLoading.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: 'Проект не найден',
        });
        void this.router.navigate(['/projects']);
      },
    });
  }
}
