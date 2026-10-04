import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private emailApiUrl = 'https://infinite-depths-79424-3d7a90711b08.herokuapp.com/send-email'; // usa il percorso relativo per Firebase Functions

  constructor(private http: HttpClient) { }

  sendEmail(imageData: string, selectedImage: string, message: string, selectedColor: string, selectedColorSfondo: string, selectedFont: string): Observable<any> {
    const formData = new FormData();

    formData.append('imageData', imageData);
    formData.append('selectedImage', selectedImage);
    formData.append('message', message);
    formData.append('selectedColor', selectedColor);
    formData.append('selectedColorSfondo', selectedColorSfondo);
    formData.append('selectedFont', selectedFont);

    return this.http.post(this.emailApiUrl, formData).pipe(
      catchError(error => {
        console.error('Error sending email:', error);
        return throwError('Something went wrong while sending the email. Please try again later.');
      })
    );
  }
}
