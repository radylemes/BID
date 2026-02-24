import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private apiUrl = 'http://localhost:3005/api/audits';

  constructor(private http: HttpClient) {}

  getLogs(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
