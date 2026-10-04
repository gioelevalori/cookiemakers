import { AppModule } from '../app.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuadratoMakerComponent } from './quadrato-maker.component';

describe('QuadratoMakerComponent', () => {
  let component: QuadratoMakerComponent;
  let fixture: ComponentFixture<QuadratoMakerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuadratoMakerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
