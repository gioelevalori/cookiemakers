import { AppModule } from '../app.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CerchioMakerComponent } from './cerchio-maker.component';

describe('CerchioMakerComponent', () => {
  let component: CerchioMakerComponent;
  let fixture: ComponentFixture<CerchioMakerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CerchioMakerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
