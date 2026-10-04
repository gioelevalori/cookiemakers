import { ChangeDetectionStrategy, Component  } from '@angular/core';
import { EmailService } from '../email.service';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.css']
})
export class TestComponent {
  name = '';
  email = '';
  message = '';
  imageSrc = '';
  file: File | null = null;

  constructor(private emailService: EmailService) {}

  onSubmit() {
    /*this.emailService.sendEmail(this.name, this.email, this.message, this.file, this.imageSrc).subscribe(
      response => {
        console.log('Email sent successfully!');
      },
      error => {
        console.log('Error sending email:', error);
      }
    );*/
  }

  onFileSelected(event: any) {
    this.file = event.target.files[0];
  }
}
