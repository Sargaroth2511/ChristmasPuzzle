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

export interface StartGameSessionRequest {
  forceRestart?: boolean;
}

export interface StartGameSessionResponse {
  success: boolean;
  sessionId?: string;
  puzzleVersion?: string;
  startedAtUtc?: string;
  totalPieces?: number;
  activeSessionId?: string;
  message?: string;
}

export interface RecordPieceSnapRequest {
  pieceId: string;
  anchorX: number;
  anchorY: number;
  clientDistance?: number;
  clientTolerance?: number;
}

export interface RecordPieceSnapResponse {
  status: string;
  distance: number;
  allowedDistance: number;
  totalPieces: number;
  placedPieces: number;
  message?: string;
}

export interface CompleteGameSessionResponse {
  sessionId?: string;
  startedAtUtc?: string;
  completedAtUtc?: string;
  durationSeconds?: number;
  totalPieces?: number;
  placedPieces?: number;
  message?: string;
  userData?: UserData;
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

  /**
   * Start a backend-validated game session to track progress.
   */
  startGameSession(uid: string, request?: StartGameSessionRequest): Observable<StartGameSessionResponse> {
    return this.http.post<StartGameSessionResponse>(`${this.apiBaseUrl}/${uid}/sessions`, request ?? {})
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Report a piece placement event so the backend can validate it.
   */
  recordPieceSnap(uid: string, sessionId: string, request: RecordPieceSnapRequest): Observable<RecordPieceSnapResponse> {
    return this.http.post<RecordPieceSnapResponse>(`${this.apiBaseUrl}/${uid}/sessions/${sessionId}/snaps`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Complete the current game session and obtain the verified stats.
   */
  completeGameSession(uid: string, sessionId: string): Observable<CompleteGameSessionResponse> {
    return this.http.post<CompleteGameSessionResponse>(`${this.apiBaseUrl}/${uid}/sessions/${sessionId}/complete`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    if (error.status === 404) {
      return throwError(() => new Error('User not found. Please check your invitation link.'));
    } else if (error.status === 400) {
      return throwError(() => new Error('Invalid request. Please check your data.'));
    } else if (error.status === 409 || error.status === 422) {
      const message = (error.error && (error.error.message || error.error.error)) || 'Request could not be processed.';
      return throwError(() => new Error(message));
    }
    return throwError(() => new Error('An error occurred. Please try again later.'));
  }
}
