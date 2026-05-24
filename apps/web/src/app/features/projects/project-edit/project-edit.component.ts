import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProjectsService } from '../../../core/projects/projects.service';
import { Project, UpdateProjectRequest } from '../../../core/projects/projects.models';

@Component({
  selector: 'app-project-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CardModule, ButtonModule, InputTextModule, TextareaModule, MessageModule, ProgressSpinnerModule],
  templateUrl: './project-edit.component.html',
  styleUrl: './project-edit.component.scss',
})
export class ProjectEditComponent implements OnInit {
  private readonly projectsService = inject(ProjectsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected slug = '';

  protected readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(2000)]],
  });

  private originalProject: Project | null = null;

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      void this.router.navigate(['/projects']);
      return;
    }
    this.slug = slug;
    this.loadProject(slug);
  }

  protected isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && control.touched);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const data: UpdateProjectRequest = {};
    const formValue = this.form.value as { name: string; description: string };

    // Отправляем только изменённые поля
    if (formValue.name !== this.originalProject?.name) {
      data.name = formValue.name;
    }
    if (formValue.description !== (this.originalProject?.description ?? '')) {
      data.description = formValue.description || null;
    }

    this.projectsService.updateProject(this.slug, data).subscribe({
      next: () => {
        this.isSaving.set(false);
        void this.router.navigate(['/projects', this.slug]);
      },
      error: () => {
        this.isSaving.set(false);
        this.errorMessage.set('Не удалось сохранить изменения');
      },
    });
  }

  private loadProject(slug: string): void {
    this.projectsService.getProject(slug).subscribe({
      next: (project) => {
        this.originalProject = project;
        this.form.patchValue({
          name: project.name,
          description: project.description ?? '',
        });
        this.isLoading.set(false);
      },
      error: () => {
        void this.router.navigate(['/projects']);
      },
    });
  }
}
