import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../shared/modal.component';

@Component({
  selector: 'app-statistics-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './statistics-viewer.component.html',
  styleUrls: ['./statistics-viewer.component.scss']
})
export class StatisticsViewerComponent implements OnInit {
  showKeyPrompt = true;
  accessKey = '';
  errorMessage = '';
  isLoading = false;

  // Statistics data
  statisticsType: 'overview' | 'leaderboard' | 'users' = 'overview';
  data: any = null;

  // URL parameters
  leaderboardType = 'fastest';
  leaderboardLimit = 10;
  usersFilter = 'all';
  usersSortBy = 'name';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Try to load stored access key
    const storedKey = sessionStorage.getItem('stats-access-key');
    if (storedKey) {
      this.accessKey = storedKey;
      this.showKeyPrompt = false;
      
      // Load data automatically if key exists
      this.loadInitialData();
    }

    // Parse the URL to determine what statistics to fetch
    this.route.url.subscribe(urlSegments => {
      const path = urlSegments.map(segment => segment.path).join('/');
      
      if (path.includes('leaderboard')) {
        this.statisticsType = 'leaderboard';
      } else if (path.includes('users')) {
        this.statisticsType = 'users';
      } else {
        this.statisticsType = 'overview';
      }
      
      // Reload data if key already exists
      if (this.accessKey && !this.showKeyPrompt) {
        this.loadInitialData();
      }
    });

    // Get query parameters
    this.route.queryParams.subscribe(params => {
      if (params['type']) this.leaderboardType = params['type'];
      if (params['limit']) this.leaderboardLimit = parseInt(params['limit'], 10);
      if (params['filter']) this.usersFilter = params['filter'];
      if (params['sortBy']) this.usersSortBy = params['sortBy'];
      
      // Reload data if key already exists
      if (this.accessKey && !this.showKeyPrompt) {
        this.loadInitialData();
      }
    });
  }

  submitKey(): void {
    if (!this.accessKey.trim()) {
      this.errorMessage = 'Please enter an access key';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Build the API URL
    let apiUrl = '/api/statistics/';
    let params = '';

    switch (this.statisticsType) {
      case 'overview':
        apiUrl += 'overview';
        break;
      case 'leaderboard':
        apiUrl += `leaderboard?type=${this.leaderboardType}&limit=${this.leaderboardLimit}`;
        break;
      case 'users':
        apiUrl += `users?filter=${this.usersFilter}&sortBy=${this.usersSortBy}`;
        break;
    }

    const headers = new HttpHeaders({
      'X-Stats-Key': this.accessKey.trim()
    });

    this.http.get(apiUrl, { headers }).subscribe({
      next: (response) => {
        this.data = response;
        this.showKeyPrompt = false;
        this.isLoading = false;
        // Store the valid key in session storage (valid until browser tab closes)
        sessionStorage.setItem('stats-access-key', this.accessKey.trim());
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.errorMessage = 'Invalid access key. Please try again.';
        } else if (error.status === 500) {
          this.errorMessage = 'Server error. Please try again later.';
        } else {
          this.errorMessage = 'An error occurred. Please try again.';
        }
      }
    });
  }

  formatTime(seconds: number | null): string {
    if (seconds === null || seconds === undefined) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatCurrency(amount: number | null): string {
    if (amount === null || amount === undefined) return '€0.00';
    return `€${amount.toFixed(2)}`;
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  getLanguageName(code: number): string {
    return code === 0 ? 'German' : 'English';
  }

  getSalutationName(code: number): string {
    return code === 0 ? 'Informal (Du)' : 'Formal (Sie)';
  }

  getUserFullName(user: any): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.name || 'N/A';
  }

  getFilterDisplayName(filter: string): string {
    const filterMap: { [key: string]: string } = {
      'All': 'All Users',
      'Played': 'Users Who Played',
      'Completed': 'Users Who Completed',
      'NotPlayed': 'Users Who Never Played'
    };
    return filterMap[filter] || filter;
  }

  loadInitialData(): void {
    this.submitKey();
  }

  refreshData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    let apiUrl = '/api/statistics/';

    switch (this.statisticsType) {
      case 'overview':
        apiUrl += 'overview';
        break;
      case 'leaderboard':
        apiUrl += `leaderboard?type=${this.leaderboardType}&limit=${this.leaderboardLimit}`;
        break;
      case 'users':
        apiUrl += `users?filter=${this.usersFilter}&sortBy=${this.usersSortBy}`;
        break;
    }

    const headers = new HttpHeaders({
      'X-Stats-Key': this.accessKey.trim()
    });

    this.http.get(apiUrl, { headers }).subscribe({
      next: (response) => {
        this.data = response;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          // Key is invalid, clear stored key and show prompt
          this.clearStoredKey();
          this.errorMessage = 'Session expired. Please enter your access key again.';
        } else {
          this.errorMessage = 'Error refreshing data';
        }
        console.error('Error refreshing data:', error);
      }
    });
  }

  clearStoredKey(): void {
    sessionStorage.removeItem('stats-access-key');
    this.showKeyPrompt = true;
    this.accessKey = '';
    this.data = null;
  }

  goBack(): void {
    window.history.back();
  }
}
