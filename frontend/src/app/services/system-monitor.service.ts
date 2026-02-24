import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SystemMonitorService {
  private apiUrl = 'http://localhost:3005/api/system-errors';

  constructor(private http: HttpClient) {}

  getErrors(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  resolveError(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/resolve`, {});
  }
}
