import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { BLE } from '@ionic-native/ble/ngx';
import { Diagnostic } from '@ionic-native/diagnostic/ngx';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import {RoundProgressModule} from 'angular-svg-round-progressbar';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { DeviceMotion } from '@awesome-cordova-plugins/device-motion/ngx';
import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import { Vibration } from '@ionic-native/vibration/ngx';


@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
          BrowserModule, 
          IonicModule.forRoot(), 
          AppRoutingModule,
          RoundProgressModule
        ],
  providers: [
    StatusBar,
    SplashScreen,
    Vibration,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    ScreenOrientation,
    { 
      provide: RouteReuseStrategy, 
      useClass: IonicRouteStrategy 
    },    
    BLE, Diagnostic, NativeStorage, DeviceMotion
  ], 
  bootstrap: [AppComponent]
})
export class AppModule {}
