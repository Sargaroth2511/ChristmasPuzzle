import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export enum Language {
  German = 0,
  English = 1
}

export enum Salutation {
  Informal = 0,
  Formal = 1
}

export interface UserData {
  uid: string;
  firstName: string;
  lastName: string;
  language: Language;
  salutation: Salutation;
  maxPiecesAchieved: number | null;
  fastestTimeSeconds: number | null;
  totalPuzzlesCompleted: number | null;
  lastAccessedUtc: string | null;
}

export interface UpdateStatsRequest {
  piecesAchieved: number;
  completionTimeSeconds?: number;
  puzzleCompleted: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiBaseUrl = '/api/users';

  constructor(private http: HttpClient) {}

  /**
   * Validate and get user data by GUID
   * Returns 404 if user not found
   */
  getUserByGuid(uid: string): Observable<UserData> {
    return this.http.get<UserData>(`${this.apiBaseUrl}/${uid}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Update user statistics after game completion or progress
   */
  updateUserStats(uid: string, stats: UpdateStatsRequest): Observable<UserData> {
    return this.http.post<UserData>(`${this.apiBaseUrl}/${uid}/stats`, stats)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    if (error.status === 404) {
      return throwError(() => new Error('User not found. Please check your invitation link.'));
    } else if (error.status === 400) {
      return throwError(() => new Error('Invalid request. Please check your data.'));
    }
    return throwError(() => new Error('An error occurred. Please try again later.'));
  }
}
