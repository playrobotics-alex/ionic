import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ScannerPageRoutingModule } from './scanner-routing.module';

import { ScannerPage } from './scanner.page';

import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ScannerPageRoutingModule
  ],
  declarations: [ScannerPage]
})
export class ScannerPageModule {}
