import {
  APP_INITIALIZER,
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Lara from '@primeuix/themes/lara';
import { definePreset } from '@primeuix/themes';
import { firstValueFrom } from 'rxjs';

/** Кастомный пресет: Lara с teal primary и Inter как основной шрифт */
const VoidboardPreset = definePreset(Lara, {
  primitive: {
    fontFamily: '"Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
  },
  semantic: {
    primary: {
      50: '{teal.50}',
      100: '{teal.100}',
      200: '{teal.200}',
      300: '{teal.300}',
      400: '{teal.400}',
      500: '{teal.500}',
      600: '{teal.600}',
      700: '{teal.700}',
      800: '{teal.800}',
      900: '{teal.900}',
      950: '{teal.950}',
    },
  },
});
import { appRoutes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor]), withFetch()),
    providePrimeNG({
      theme: {
        preset: VoidboardPreset,
        options: {
          darkModeSelector: '.dark-mode',
        },
      },
    }),
    // Восстановление сессии при перезагрузке — блокирует рендеринг до завершения refresh()
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const authService = inject(AuthService);
        return () => firstValueFrom(authService.init());
      },
      multi: true,
    },
  ],
};
