import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../api/api.config';
import { Project, CreateProjectRequest, UpdateProjectRequest } from './projects.models';

/** Сервис для работы с проектами через REST API */
@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/projects`;

  /** GET /projects — список всех проектов текущего пользователя */
  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.baseUrl);
  }

  /** GET /projects/:slug — проект по slug */
  getProject(slug: string): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/${slug}`);
  }

  /** POST /projects — создание нового проекта */
  createProject(data: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>(this.baseUrl, data);
  }

  /** PATCH /projects/:slug — обновление проекта */
  updateProject(slug: string, data: UpdateProjectRequest): Observable<Project> {
    return this.http.patch<Project>(`${this.baseUrl}/${slug}`, data);
  }

  /** DELETE /projects/:slug — удаление проекта */
  deleteProject(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${slug}`);
  }
}
