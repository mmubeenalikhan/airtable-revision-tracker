import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AllCommunityModule, ColDef, GridApi, GridReadyEvent, ModuleRegistry } from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular';
import { environment } from '../../environments/environment';

ModuleRegistry.registerModules([AllCommunityModule]);

interface BrowseEntitySummary {
  id: string;
  label: string;
}

interface BrowseColumn {
  field: string;
  headerName: string;
  airtableType?: string;
}

interface BrowseRecordsResponse {
  columns: BrowseColumn[];
  rows: Record<string, unknown>[];
}

@Component({
  selector: 'app-data-browser',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, AgGridAngular],
  templateUrl: './data-browser.component.html',
  styleUrl: './data-browser.component.scss',
})
export class DataBrowserComponent implements OnInit {
  private readonly http = inject(HttpClient);
 
  private gridApi?: GridApi;

  readonly entities = signal<BrowseEntitySummary[]>([]);
  readonly selectedEntity = signal<string>('');
  readonly rowData = signal<Record<string, unknown>[]>([]);
  readonly columnDefs = signal<ColDef[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  searchText = '';

  readonly defaultColDef: ColDef = {
    filter: true,
    sortable: true,
    resizable: true,
  };

  ngOnInit(): void {
    this.http.get<BrowseEntitySummary[]>(`${environment.apiBaseUrl}/api/browse/entities`).subscribe({
      next: (entities) => {
        this.entities.set(entities);

        if (entities.length) {
          this.selectedEntity.set(entities[0].id);
          this.loadRecords(entities[0].id);
        }
      },
    });
  }

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
  }

  onEntityChange(entityId: string): void {
    this.selectedEntity.set(entityId);
    this.loadRecords(entityId);
  }

  onSearchChange(value: string): void {
    this.gridApi?.setGridOption('quickFilterText', value);
  }

  private loadRecords(entityId: string): void {
    this.loading.set(true);
    this.error.set('');

    this.http.get<BrowseRecordsResponse>(`${environment.apiBaseUrl}/api/browse/${entityId}/records`).subscribe({
      next: (res) => {
        console.log('res:', res);
        this.columnDefs.set(res.columns.map((c) => ({ field: c.field, headerName: c.headerName })));
        this.rowData.set(res.rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(`Failed to load ${entityId}: ${err.error?.error ?? err.message}`);
      },
    });
  }
}
