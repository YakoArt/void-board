import { Route } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then(
        (m) => m.ProfileComponent,
      ),
  },
  {
    path: 'projects',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/projects/project-list/project-list.component').then(
        (m) => m.ProjectListComponent,
      ),
  },
  {
    // Маршрут /projects/new должен быть ПЕРЕД /projects/:slug,
    // иначе "new" будет интерпретирован как slug
    path: 'projects/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/projects/project-create/project-create.component').then(
        (m) => m.ProjectCreateComponent,
      ),
  },
  {
    path: 'projects/:slug',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/projects/project-detail/project-detail.component').then(
        (m) => m.ProjectDetailComponent,
      ),
  },
  {
    path: 'projects/:slug/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/projects/project-edit/project-edit.component').then(
        (m) => m.ProjectEditComponent,
      ),
  },
  {
    path: '',
    redirectTo: '/projects',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '/projects',
  },
];
