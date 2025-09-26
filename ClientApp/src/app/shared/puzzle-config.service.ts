import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PuzzleConfig } from './puzzle-config.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PuzzleConfigService {
  constructor(private readonly http: HttpClient) {}

  loadConfig(): Observable<PuzzleConfig> {
    return this.http.get<PuzzleConfig>(`${environment.apiBaseUrl}/puzzle`);
  }
}
