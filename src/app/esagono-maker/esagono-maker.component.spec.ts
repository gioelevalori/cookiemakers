import { AppModule } from '../app.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EsagonoMakerComponent } from './esagono-maker.component';

describe('EsagonoMakerComponent', () => {
  let component: EsagonoMakerComponent;
  let fixture: ComponentFixture<EsagonoMakerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EsagonoMakerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
