import { Component, NgZone } from '@angular/core';
import { NavController, AlertController, ToastController} from '@ionic/angular';
import { ActivatedRoute} from "@angular/router";
import { Platform } from '@ionic/angular'; 
import { BLE } from '@ionic-native/ble/ngx';
import { DeviceMotion, DeviceMotionAccelerationData } from '@awesome-cordova-plugins/device-motion/ngx';

import { interval } from 'rxjs';



const CUSTOM_SERVICE_UUID       = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
const LEDS_STATES_CHAR_UUID     = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';

const isLogEnabled = true

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage  {
  get_duration_interval: any;

  connectedDevice : any = {}; 

  button1State : number = 0;
  button2State : number = 0;
  button3State : number = 0;
  button4State : number = 0;

  led3IsOn : boolean = false;
  led4IsOn : boolean = false;

  potentioLevel : number = 0;
  batteryLevel : number = 0;

  speed : number = 0;
  steering : number = 0;

  constructor(  private ble: BLE,
                private deviceMotion: DeviceMotion,    
                public  navCtrl: NavController,  
                private route: ActivatedRoute, 
                private alertCtrl: AlertController,      
                private toastCtrl: ToastController,
                public  platform: Platform,
                private ngZone: NgZone ) 
                {
                  this.speed=90;
                  this.route.queryParams.subscribe(params => {
                    let device = JSON.parse(params['device']);
    
                    if(isLogEnabled) console.log('Route navigationExtra: device = '+JSON.stringify(device)); 
    
                    this.ble.isConnected(device.id).then(
                      () => this.onConnected(device),
                      () => this.onNotConnected(device)
                    );  
                  });
                }
    getCurrentCoordinates() 
    {
        // Get the device current acceleration
        this.deviceMotion.getCurrentAcceleration().then(
          (acceleration: DeviceMotionAccelerationData) => console.log(acceleration.y),
          (error: any) => console.log(error)
        );
    
        // Watch device acceleration
        //var subscription = this.deviceMotion.watchAcceleration().subscribe((acceleration: DeviceMotionAccelerationData) => {
          //console.log(acceleration);
        //});
    
        // Stop watch
        //subscription.unsubscribe();
    }  
// on connected to a device
  onConnected(device)
  {
    

    this.ngZone.run(() => { 

      this.connectedDevice = device;
      this.get_duration_interval= setInterval(()=> { this.sendBLE() }, 50);
    });
  } 

  // on not connected to a device
  onNotConnected(device)
  {
    this.ble.connect(device.id).subscribe(
      () => this.onConnected(device),
      () => this.onErrorConneted(device) 
    );
  }  

  // on error connected
  onErrorConneted(device)
  {
    if(isLogEnabled) console.error('Error connecting to '+device.name+'.');
    this.showToast('Error connecting to '+device.name,'danger',2000,'bottom');
   
    if(isLogEnabled) console.info('navigating back to [scanner] page.');
    this.navCtrl.navigateBack('scanner');
  }
  onRangeRelease()
  {
    this.potentioLevel = 90;
  }
 
  onRangeChange(speed){
    this.potentioLevel = speed;
  }


  sendBLE() : any
  {
    // Get the device current acceleration
    this.deviceMotion.getCurrentAcceleration().then(
      (acceleration: DeviceMotionAccelerationData) => this.steering = acceleration.y,
      (error: any) => console.log(error)
    );

    let data = new Uint8Array(this.speed);
    let net_sp =  this.speed-9;
    let string = this.speed +'S' + this.steering.toFixed(2);
    let array = new Uint8Array(string.length);
    for (let i = 0, l = string.length; i < l; i ++) {
      array[i] = string.charCodeAt(i);
    }
    console.log(array.buffer);


      this.ble.writeWithoutResponse(this.connectedDevice.id, CUSTOM_SERVICE_UUID, LEDS_STATES_CHAR_UUID, array.buffer).then(
        () => {           
          if(isLogEnabled) 
            console.log(array.buffer);
        },
        error => { if(isLogEnabled) console.error('Error writing the new leds states to the BLE leds states characteristic.', error);}
      );   
  }  

  // on error disconnecting from device
  onErrorDisconnecting(device, error)
  {
    if(isLogEnabled) console.error('Error disconnecting from '+device.name+'.', error);
    if(isLogEnabled) console.info('Checking if'+device.name+' is still connected ...');

    this.ble.isConnected(device.id).then(() => 
    { 
      if(isLogEnabled) console.log(device.name+' is still connected.');
      this.showAlert('Error disconnecting ..', device.name+ 'is still connected. Please try again!');
    },
    () =>
    {
      this.onDisconnecting(device);
    });
  }
 
  // on disconnecting from device
  onDisconnecting(device)
  {
    clearInterval(this.get_duration_interval);
    if(isLogEnabled) console.log(device.name+' is disconnected.');
    if(isLogEnabled) console.info('Navigating to [scanner] page.');
    this.showToast('Disconneced from '+device.name+'.', 'danger', 2000, 'bottom');
    this.navCtrl.navigateBack('scanner');
  }

  // Function to disconnect from the device
  disconnect(device)
  {
    this.ble.disconnect(device.id).then(
      () => this.onDisconnecting(device),
      error => this.onErrorDisconnecting(device, error)
    );
  }
  
  // show toast
  async showToast(msg, clr, dur, pos) 
  {
    let toast  = await this.toastCtrl.create({
        message: msg,
        color: clr,
        duration: dur,
        position: pos,
        cssClass :'toast'
    });

    toast.present();
  }

  // show alert
  async showAlert(title, message) 
  {               
    let alert = await this.alertCtrl.create({
          header: title,
          subHeader: message,
          buttons: ['OK'],
          cssClass : 'alert'
          })         
    await alert.present()
  }    
}
