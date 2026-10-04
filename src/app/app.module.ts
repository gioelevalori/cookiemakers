import { LOCALE_ID, NgModule, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import { RettangoloMakerComponent } from './rettangolo-maker/rettangolo-maker.component';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {MatInputModule} from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {MatSelectModule} from '@angular/material/select';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { ImageCropperModule } from './image-cropper/image-cropper.module';
import { MakerTextComponent } from './maker-text/maker-text.component';
import {MatListModule} from '@angular/material/list';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MakerSfondoComponent } from './maker-sfondo/maker-sfondo.component';
import { MatSliderModule } from '@angular/material/slider';
import { CheckoutComponent } from './checkout/checkout.component';
import {MatStepperModule} from '@angular/material/stepper';
import {MatChipsModule} from '@angular/material/chips';
import { EsagonoMakerComponent } from './esagono-maker/esagono-maker.component';
import { CerchioMakerComponent } from './cerchio-maker/cerchio-maker.component';
import {MatToolbarModule} from '@angular/material/toolbar';
import { HttpClientModule } from '@angular/common/http';
import { QuadratoMakerComponent } from './quadrato-maker/quadrato-maker.component';
import {MatGridListModule} from '@angular/material/grid-list';
import { TemplatePdfComponent } from './template-pdf/template-pdf.component';
import { ContattiComponent } from './contatti/contatti.component';
import { FaqComponent } from './faq/faq.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ChiSiamoComponent } from './chi-siamo/chi-siamo.component';
import {CdkAccordionModule} from '@angular/cdk/accordion';
import {MatExpansionModule} from '@angular/material/expansion';
import { MenuComponent } from './menu/menu.component';
import { HeartMakerComponent } from './heart-maker/heart-maker.component';
import { MatTableModule } from '@angular/material/table';
import { FooterComponent } from './footer/footer.component';
import { TestComponent } from './test/test.component';
import { Cookie3dComponent } from './cookie-3d.component';

registerLocaleData(localeIt);

@NgModule({
  declarations: [
    AppComponent,
    RettangoloMakerComponent,
    HomeComponent,
    MakerTextComponent,
    MakerSfondoComponent,
    CheckoutComponent,
    EsagonoMakerComponent,
    CerchioMakerComponent,
    QuadratoMakerComponent,
    TemplatePdfComponent,
    ContattiComponent,
    FaqComponent,
    ChiSiamoComponent,
    MenuComponent,
    HeartMakerComponent,
    FooterComponent,
    TestComponent,
    Cookie3dComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MatCardModule,
    MatButtonModule,
    DragDropModule,
    MatInputModule,
    FormsModule,
    MatSelectModule,
    MatIconModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    ImageCropperModule,
    MatListModule,
    MatBottomSheetModule,
    MatSliderModule,
    MatStepperModule,
    MatChipsModule,
    MatToolbarModule,
    HttpClientModule,
    MatGridListModule,
    MatSidenavModule,
    CdkAccordionModule,
    MatExpansionModule,
    MatTableModule
  ],
  exports: [RouterModule],
  providers: [provideZoneChangeDetection(), { provide: LOCALE_ID, useValue: 'it' }],
  bootstrap: [AppComponent]
})
export class AppModule { }
