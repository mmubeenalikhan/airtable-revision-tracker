import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../environments/environment';

interface StatusResponse {
  connected: boolean;
}

interface BasesResponse {
  count: number;
  bases: { airtableId: string; name: string }[];
}

@Component({
  selector: 'app-connection-status',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './connection-status.component.html',
  styleUrl: './connection-status.component.scss',
})

export class ConnectionStatusComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly loading = signal(true);
  readonly connected = signal(false);
  readonly disconnecting = signal(false);
  readonly callbackError = signal('');
  readonly loginUrl = `${environment.apiBaseUrl}/auth/airtable/login`;

  @Output() basesSynced = new EventEmitter<BasesResponse>();
  @Output() disconnected = new EventEmitter<void>();
  @Output() connectedChange = new EventEmitter<boolean>();

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) this.callbackError.set(error);

    if (params.has('error') || params.has('connected')) {
      params.delete('error');
      params.delete('connected');
      const query = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
    }

    this.http.get<StatusResponse>(`${environment.apiBaseUrl}/api/auth/status`).subscribe({
      next: (res) => {
        this.connected.set(res.connected);
        this.loading.set(false);
        this.connectedChange.emit(res.connected);
        if (res.connected) this.syncBases();
      },
      error: () => this.loading.set(false),
    });
  }

  private syncBases(): void {
    this.http.post<BasesResponse>(`${environment.apiBaseUrl}/api/sync/bases`, {}).subscribe({
      next: (res) => this.basesSynced.emit(res),
    });
  }

  disconnect(): void {
    const confirmed = window.confirm(
      'Are you sure, you wanna disconnect Airtable?'
    );
    if (!confirmed) return;

    this.disconnecting.set(true);
    this.http.post(`${environment.apiBaseUrl}/auth/airtable/disconnect`, {}).subscribe({
      next: () => {
        this.connected.set(false);
        this.disconnecting.set(false);
        this.disconnected.emit();
        this.connectedChange.emit(false);
      },
      error: () => this.disconnecting.set(false),
    });
  }
}
