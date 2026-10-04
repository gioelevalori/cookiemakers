import { ChangeDetectionStrategy, Component, inject  } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import emailjs from '@emailjs/browser';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-contatti',
  templateUrl: './contatti.component.html',
  styleUrls: ['./contatti.component.css']
})
export class ContattiComponent {
  private readonly formBuilder = inject(FormBuilder);
  readonly form = this.formBuilder.nonNullable.group({
    from_name: ['', Validators.required],
    from_email: ['', [Validators.required, Validators.email]],
    subject: ['', Validators.required],
    message: ['', Validators.required]
  });
  sending = false;
  sent = false;
  error = '';

  async send(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.sending) return;
    this.sending = true;
    this.sent = false;
    this.error = '';
    try {
      await emailjs.send('service_0a5yt6c', 'template_g57i0cv', {
        ...this.form.getRawValue(), to_name: 'Admin'
      }, { publicKey: 'kvw0ZK4-9LEmB1IRT' });
      this.form.reset();
      this.sent = true;
    } catch {
      this.error = 'Invio non riuscito. Riprova tra poco.';
    } finally {
      this.sending = false;
    }
  }
}
