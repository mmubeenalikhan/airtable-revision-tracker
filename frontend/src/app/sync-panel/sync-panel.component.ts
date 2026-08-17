import { HttpClient } from '@angular/common/http';
import { Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../environments/environment';

interface AirtableBaseSummary {
  airtableId: string;
  name: string;
}

@Component({
  selector: 'app-sync-panel',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule], 
  templateUrl: './sync-panel.component.html',
  styleUrl: './sync-panel.component.scss',
})
export class SyncPanelComponent {
  private readonly http = inject(HttpClient);

  @Input() bases: AirtableBaseSummary[] = [];

  baseId = '';
  readonly status = signal('');

  readonly busy = signal(false);

  syncTables(): void {
    this.run('Tables', `/api/sync/tables/${this.baseId}`);
  }

  syncTickets(): void {
    this.run('Tickets', `/api/sync/tickets/${this.baseId}`);
  }

  syncUsers(): void {
    this.run('Users', `/api/sync/users/${this.baseId}`);
  }

  syncAll(): void {
    this.run('All', `/api/sync/all/${this.baseId}`);
  }

  private run(label: string, path: string): void {
    if (!this.baseId) {
      this.status.set('Pick a baseId first.');
      return;
    }

    this.busy.set(true);
    this.status.set(`Syncing ${label}..`);

    this.http.post(`${environment.apiBaseUrl}${path}`, {}).subscribe({
      next: (res) => {
        this.busy.set(false)
        this.status.set(`${label} synced: ${JSON.stringify(res)}`);
      },
      error: (err) => {
        this.busy.set(false);
        this.status.set(`${label} sync failed - ${err.error?.error ?? err.message}`);
      },
    });
  }
}
