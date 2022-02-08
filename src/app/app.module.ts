import { NgModule } from '@angular/core';
import { BrowserModule,HammerModule } from '@angular/platform-browser';
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
import { HammerGestureConfig, HAMMER_GESTURE_CONFIG  } from "@angular/platform-browser";
import * as Hammer from 'hammerjs';

export class IonicGestureConfig extends HammerGestureConfig {

  overrides = {
    'pan': {threshold:0}
  }

}

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
          BrowserModule, 
          IonicModule.forRoot(), 
          AppRoutingModule,
          RoundProgressModule,
          HammerModule
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
    {
      provide: HAMMER_GESTURE_CONFIG,
      useClass: IonicGestureConfig
    },
    BLE, Diagnostic, NativeStorage, DeviceMotion
  ], 
  bootstrap: [AppComponent]
})
export class AppModule {}
