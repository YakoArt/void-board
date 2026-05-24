import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { ProjectsService } from '../../../core/projects/projects.service';
import { CreateProjectRequest, Project } from '../../../core/projects/projects.models';

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    InputTextModule,
    TextareaModule,
    MessageModule,
  ],
  templateUrl: './project-create.component.html',
  styleUrl: './project-create.component.scss',
})
export class ProjectCreateComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(2000)],
  });

  protected isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && control.touched);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { name, description } = this.form.value as {
      name: string;
      description: string;
    };

    const data: CreateProjectRequest = {
      name,
      ...(description?.trim() ? { description: description.trim() } : {}),
    };

    this.projectsService.createProject(data).subscribe({
      next: (project: Project) => {
        this.isLoading.set(false);
        void this.router.navigate(['/projects', project.slug]);
      },
      error: (err: { error?: { message?: string } }) => {
        this.isLoading.set(false);
        const serverMessage = err?.error?.message;
        this.errorMessage.set(
          typeof serverMessage === 'string'
            ? serverMessage
            : 'Не удалось создать проект. Попробуйте ещё раз.',
        );
      },
    });
  }
}
