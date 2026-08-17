import { HttpClient } from '@angular/common/http';
import { Component, Input, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { environment } from '../../environments/environment';

interface RevisionSyncResult {
  total: number;
  completed: number;
  failed: number;
  failedTicketIds: string[];
}

@Component({
  selector: 'app-revision-sync',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './revision-sync.component.html',
  styleUrl: './revision-sync.component.scss',
})


export class RevisionSyncComponent {
  private readonly http = inject(HttpClient);

  @Input() ticketCount = 0;

  readonly busy = signal(false);
  readonly result = signal<RevisionSyncResult | null>(null);
  readonly error = signal('');

  sync(): void {
    this.busy.set(true);
    this.error.set('');
    this.result.set(null);

    this.http.post<RevisionSyncResult>(`${environment.apiBaseUrl}/api/revision/sync`, {}).subscribe({
      next: (res) => {
        this.result.set(res);
        this.busy.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error ?? err.message);
        this.busy.set(false);
      },
    });
  }
}
