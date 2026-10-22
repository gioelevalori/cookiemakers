import { GalleriaComponent } from './galleria/galleria.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CerchioMakerComponent } from './cerchio-maker/cerchio-maker.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { EsagonoMakerComponent } from './esagono-maker/esagono-maker.component';
import { HomeComponent } from './home/home.component';
import { RettangoloMakerComponent } from './rettangolo-maker/rettangolo-maker.component';
import { QuadratoMakerComponent } from './quadrato-maker/quadrato-maker.component';
import { TemplatePdfComponent } from './template-pdf/template-pdf.component';
import { FaqComponent } from './faq/faq.component';
import { ChiSiamoComponent } from './chi-siamo/chi-siamo.component';
import { ContattiComponent } from './contatti/contatti.component';
import { HeartMakerComponent } from './heart-maker/heart-maker.component';
import { TestComponent } from './test/test.component';
import { environment } from './environment';
import { EventiComponent } from './eventi/eventi.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'quadrato', component: QuadratoMakerComponent },
  { path: 'rettangolo', component: RettangoloMakerComponent },
  { path: 'esagono', component: EsagonoMakerComponent },
  { path: 'cerchio', component: CerchioMakerComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'template', component: TemplatePdfComponent },
  { path: 'faq', component: FaqComponent },
  { path: 'chisiamo', component: ChiSiamoComponent },
  { path: 'contatti', component: ContattiComponent },
  { path: 'eventi', component: EventiComponent },
  { path: 'galleria', component: GalleriaComponent },
  { path: 'cuore', component: HeartMakerComponent },
  { path: 'test', component: TestComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: environment.githubPages, scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
