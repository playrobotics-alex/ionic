import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DashboardPageRoutingModule } from './dashboard-routing.module';

import { DashboardPage } from './dashboard.page';

import { RoundProgressModule } from 'angular-svg-round-progressbar'; 

import {GaugesModule} from '@biacsics/ng-canvas-gauges';

import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    GaugesModule,    
    DashboardPageRoutingModule,
    RoundProgressModule
  ],
  declarations: [DashboardPage]
})
export class DashboardPageModule {}
