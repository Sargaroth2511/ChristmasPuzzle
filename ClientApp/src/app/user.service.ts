import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
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

export interface StartGameSessionResponse {
  success: boolean;
  sessionId?: string;
  puzzleVersion?: string;
  startedAtUtc?: string;
  totalPieces?: number;
  
  // Properties for existing completed session
  existingCompletedSessionId?: string;
  existingSessionStartTime?: string;
  existingSessionCompletedTime?: string;
  existingSessionDurationSeconds?: number;
  
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
  sessionCompleted: boolean; // True if this snap completed the puzzle
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
   * Always succeeds - creates a new session every time.
   */
  startGameSession(uid: string): Observable<StartGameSessionResponse> {
    return this.http.post<StartGameSessionResponse>(`${this.apiBaseUrl}/${uid}/sessions`, {})
      .pipe(catchError(this.handleError));
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

  /**
   * Discard a completed session without saving.
   */
  discardSession(uid: string, sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/${uid}/sessions/${sessionId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    // Always preserve the original HttpErrorResponse so status codes are available
    // This is critical for session error detection (404/409)
    return throwError(() => error);
  }
}
