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
import { IonicStorageModule } from '@ionic/storage-angular';
import { NativeAudio } from '@ionic-native/native-audio/ngx';
import { AudioManagement } from '@ionic-native/audio-management/ngx';
import { NgxGamepadModule } from 'ngx-gamepad';



export class IonicGestureConfig extends HammerGestureConfig {

  overrides = {
    'pan': {threshold:0}
  }

}

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
          NgxGamepadModule,
          BrowserModule, 
          IonicModule.forRoot(), 
          AppRoutingModule,
          RoundProgressModule,
          HammerModule,
          IonicStorageModule.forRoot()

        ],
  providers: [
    StatusBar,
    SplashScreen,
    Vibration,
    AudioManagement,
    NativeAudio, { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
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
