import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SystemMonitorService {
  private apiUrl = `${environment.apiUri}/system-errors`;

  constructor(private http: HttpClient) {}

  getErrors(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  resolveError(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/resolve`, {});
  }

  clearErrorHistory(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(this.apiUrl);
  }
}
