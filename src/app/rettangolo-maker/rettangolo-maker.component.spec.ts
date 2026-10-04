import { AppModule } from '../app.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RettangoloMakerComponent } from './rettangolo-maker.component';

describe('RettangoloMakerComponent', () => {
  let component: RettangoloMakerComponent;
  let fixture: ComponentFixture<RettangoloMakerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RettangoloMakerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
