import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ConnectionStatusComponent } from './connection-status/connection-status.component';
import { SyncPanelComponent } from './sync-panel/sync-panel.component';
import { RevisionAuthComponent } from './revision-auth/revision-auth.component';
import { RevisionSyncComponent } from './revision-sync/revision-sync.component';
import { DataBrowserComponent } from './data-browser/data-browser.component';
import { environment } from '../environments/environment';

interface AirtableBaseSummary {
  airtableId: string;
  name: string;
}

interface RevisionStatusResponse {
  authenticated: boolean;
  ticketCount: number;
}

@Component({
  selector: 'app-root',
  imports: [
    MatTabsModule,
    MatToolbarModule,
    MatIconModule,
    MatDividerModule,
    ConnectionStatusComponent,
    SyncPanelComponent,
    RevisionAuthComponent,
    RevisionSyncComponent,
    DataBrowserComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly bases = signal<AirtableBaseSummary[]>([]);
  readonly revisionAuthenticated = signal(false);

  readonly airtableConnected = signal(false);
  readonly ticketCount = signal(0);

  ngOnInit(): void {
    this.http.get<RevisionStatusResponse>(`${environment.apiBaseUrl}/api/revision/status`).subscribe({
      next: (res) => {
        this.revisionAuthenticated.set(res.authenticated);
        this.ticketCount.set(res.ticketCount);
      },
    });
  }

  onBasesSynced(result: { bases: AirtableBaseSummary[] }): void {
    this.bases.set(result.bases);
  }

  onDisconnected(): void {
    this.bases.set([]);
  }

  onConnectedChange(connected: boolean): void {
    this.airtableConnected.set(connected);
  }

  onRevisionAuthenticated(authenticated: boolean): void {
    this.revisionAuthenticated.set(authenticated);
  }
}
