import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject  } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ImageService } from '../image.service';
import { ColorService } from '../color.service';
import { StripeService } from '../stripe.service';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly imageService = inject(ImageService);
  private readonly colorService = inject(ColorService);
  private readonly destroyRef = inject(DestroyRef);
  readonly stripeService = inject(StripeService);

  imageData = '';
  selectedColor = '';
  selectedColorSfondo = '';
  selectedFont = '';
  message = '';
  selectedImage = '';
  selectedShape = '';
  readonly shipping = 6;
  isPaying = false;
  paymentError = '';

  readonly firstFormGroup = this.formBuilder.nonNullable.group({
    firstCtrl: [10, [Validators.required, Validators.min(10), Validators.pattern(/^[0-9]+$/)]]
  });

  get countBiscuits(): number { return this.firstFormGroup.controls.firstCtrl.value; }
  get counter(): number { return 15 + Math.max(0, this.countBiscuits - 10) * 5; }

  ngOnInit(): void {
    this.colorService.selectedShape.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.selectedShape = value);
    this.imageService.currentImage.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.imageData = value);
    this.colorService.selectedColor.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.selectedColor = value);
    this.colorService.selectedColorSfondo.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.selectedColorSfondo = value);
    this.colorService.selectedFont.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.selectedFont = value);
    this.colorService.selectedImage.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.selectedImage = value);
    this.colorService.message.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.message = value);
  }

  increment(): void { this.firstFormGroup.controls.firstCtrl.setValue(Math.max(10, Number(this.countBiscuits) || 10) + 1); }
  decrement(): void { this.firstFormGroup.controls.firstCtrl.setValue(Math.max(10, (Number(this.countBiscuits) || 10) - 1)); }

  async makePayment(): Promise<void> {
    if (this.isPaying || this.firstFormGroup.invalid || !this.imageData || !this.stripeService.configured) return;
    this.isPaying = true;
    this.paymentError = '';
    try {
      const url = await this.stripeService.createCheckoutSession({
        quantity: this.countBiscuits,
        shape: this.selectedShape,
        preview: this.imageData,
        message: this.message,
        textColor: this.selectedColor,
        backgroundColor: this.selectedColorSfondo,
        font: this.selectedFont,
        image: this.selectedImage
      });
      window.location.assign(url);
    } catch {
      this.paymentError = 'Impossibile avviare il pagamento. Riprova tra poco.';
    } finally {
      this.isPaying = false;
    }
  }
}
