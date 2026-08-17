import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../environments/environment';

type AuthStage = 'idle' | 'awaiting-mfa' | 'authenticated';

@Component({
  selector: 'app-revision-auth',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  templateUrl: './revision-auth.component.html',
  styleUrl: './revision-auth.component.scss',
})
export class RevisionAuthComponent implements OnInit {
  private readonly http = inject(HttpClient);

  @Input() initialAuthenticated = false;
  @Output() authenticatedChange = new EventEmitter<boolean>();

  readonly stage = signal<AuthStage>('idle');
  readonly busy = signal(false);
  readonly error = signal('');

  mfaCode = '';
  private sessionId = '';

  ngOnInit(): void {
    if (this.initialAuthenticated) this.stage.set('authenticated');
  }

  authenticate(): void {
    this.busy.set(true);
    this.error.set('');

    this.http.post<{ sessionId: string }>(`${environment.apiBaseUrl}/api/revision/auth/start`, {}).subscribe({
      next: (res) => {
        this.sessionId = res.sessionId;
        this.stage.set('awaiting-mfa');
        this.busy.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error ?? err.message);
        this.busy.set(false);
      },
    });
  }

  submitMfa(): void {
    this.busy.set(true);
    this.error.set('');

    this.http
      .post(`${environment.apiBaseUrl}/api/revision/auth/mfa`, { sessionId: this.sessionId, code: this.mfaCode })
      .subscribe({
        next: () => {
          this.stage.set('authenticated');
          this.busy.set(false);
          this.authenticatedChange.emit(true);
        },
        error: (err) => {
          this.error.set(err.error?.error ?? err.message);
          this.busy.set(false);
        },
      });
  }

  forgetSession(): void {
    this.busy.set(true);
    this.error.set('');

    this.http.post(`${environment.apiBaseUrl}/api/revision/auth/disconnect`, {}).subscribe({
      next: () => {
        this.stage.set('idle');
        this.busy.set(false);
        this.authenticatedChange.emit(false);
      },
      error: (err) => {
        this.error.set(err.error?.error ?? err.message);
        this.busy.set(false);
      },
    });
  }
}
