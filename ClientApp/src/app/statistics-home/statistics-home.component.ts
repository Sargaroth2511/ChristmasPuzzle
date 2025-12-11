import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ModalComponent } from '../shared/modal.component';

@Component({
  selector: 'app-statistics-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './statistics-home.component.html',
  styleUrls: ['./statistics-home.component.scss']
})
export class StatisticsHomeComponent implements OnInit {
  showKeyPrompt = true;
  accessKey = '';
  errorMessage = '';
  isLoading = false;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Check if key is already stored
    const storedKey = sessionStorage.getItem('stats-access-key');
    if (storedKey) {
      this.accessKey = storedKey;
      this.showKeyPrompt = false;
    }
  }

  submitKey(): void {
    if (!this.accessKey.trim()) {
      this.errorMessage = 'Please enter an access key';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Validate key by trying to fetch overview
    const headers = new HttpHeaders({
      'X-Stats-Key': this.accessKey.trim()
    });

    this.http.get('/api/statistics/overview', { headers }).subscribe({
      next: () => {
        // Store the valid key (valid until browser tab closes)
        sessionStorage.setItem('stats-access-key', this.accessKey.trim());
        this.showKeyPrompt = false;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.errorMessage = 'Invalid access key. Please try again.';
        } else {
          this.errorMessage = 'Error validating access key. Please try again.';
        }
      }
    });
  }

  navigateTo(section: string): void {
    this.router.navigate([`/statistics/${section}`]);
  }

  logout(): void {
    sessionStorage.removeItem('stats-access-key');
    this.showKeyPrompt = true;
    this.accessKey = '';
  }
}
