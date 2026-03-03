import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GuestService {
  private apiUrl = `${environment.apiUri}/guests`;

  constructor(private http: HttpClient) {}

  getGuests(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/${userId}`);
  }

  createGuest(guest: any): Observable<any> {
    return this.http.post(this.apiUrl, guest);
  }

  updateGuest(id: number, guest: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, guest);
  }

  deleteGuest(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  assignTicket(apostaId: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/assign-ticket/${apostaId}`, data);
  }
}
