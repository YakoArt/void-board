import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { AvatarModule } from 'primeng/avatar';
import { AuthService } from '../../core/auth/auth.service';
import { ChangePasswordRequest, UpdateProfileRequest } from '../../core/auth/auth.models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    AvatarModule,
    ButtonModule,
    CardModule,
    DividerModule,
    InputTextModule,
    MessageModule,
    PasswordModule,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly profileLoading = signal(false);
  protected readonly profileSuccess = signal(false);
  protected readonly profileError = signal<string | null>(null);

  protected readonly passwordLoading = signal(false);
  protected readonly passwordSuccess = signal(false);
  protected readonly passwordError = signal<string | null>(null);

  protected readonly profileForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    avatarUrl: [''],
  });

  protected readonly passwordForm: FormGroup = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected avatarLabel = signal('?');

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.profileForm.patchValue({
        name: user.name,
        avatarUrl: user.avatarUrl ?? '',
      });
      this.avatarLabel.set(user.name.charAt(0).toUpperCase());
    }
  }

  protected isProfileFieldInvalid(field: string): boolean {
    const control = this.profileForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  protected isPasswordFieldInvalid(field: string): boolean {
    const control = this.passwordForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  protected onUpdateProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.profileLoading.set(true);
    this.profileSuccess.set(false);
    this.profileError.set(null);

    const data = this.profileForm.value as UpdateProfileRequest;

    this.authService.updateProfile(data).subscribe({
      next: () => {
        this.profileLoading.set(false);
        this.profileSuccess.set(true);
        setTimeout(() => this.profileSuccess.set(false), 3000);
      },
      error: () => {
        this.profileLoading.set(false);
        this.profileError.set('Не удалось обновить профиль');
      },
    });
  }

  protected onChangePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.passwordLoading.set(true);
    this.passwordSuccess.set(false);
    this.passwordError.set(null);

    const data = this.passwordForm.value as ChangePasswordRequest;

    this.authService.changePassword(data).subscribe({
      next: () => {
        this.passwordLoading.set(false);
        this.passwordSuccess.set(true);
        this.passwordForm.reset();
        setTimeout(() => this.passwordSuccess.set(false), 3000);
      },
      error: () => {
        this.passwordLoading.set(false);
        this.passwordError.set('Неверный текущий пароль');
      },
    });
  }
}
