import { Component, NgZone } from '@angular/core';
import { NavController, AlertController, ToastController, LoadingController } from '@ionic/angular';
import { Platform } from '@ionic/angular'; 
import { NavigationExtras } from "@angular/router";
import { BLE } from '@ionic-native/ble/ngx';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { Diagnostic } from '@ionic-native/diagnostic/ngx';
import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import { Storage } from '@ionic/storage-angular';
import { NativeAudio } from '@ionic-native/native-audio/ngx';



const isLogEnabled = true;
const defaultDeviceName =  "ESP32";

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.page.html',
  styleUrls: ['./scanner.page.scss'],
})

export class ScannerPage  {

  scannedDevices: any[] = [];
  trainID  : string = "";

  constructor(private ble: BLE,
              private diagnostic: Diagnostic,
              private nativeStorage : NativeStorage,
              public  navCtrl: NavController,   
              public  platform: Platform,        
              private toastCtrl: ToastController,  
              private alertCtrl: AlertController,
              private screenOrientation: ScreenOrientation,
              private loadingController: LoadingController,
              private storage: Storage,
              private nativeAudio: NativeAudio,
              private ngZone: NgZone ) 
              {
                this.platform.ready().then(() => {
                  this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.PORTRAIT);
                  });
              }

              ngOnInit() {
                //$("#myValues").speedometer({divFact:10,eventListenerType:'keyup'});
                this.storage.create();
              }


// start the BLE scan
async startBleScan()
{ 

  this.nativeAudio.preloadSimple('uniqueId1', 'assets/sounds/car.wav');
  this.nativeAudio.play('uniqueId1').then(() => {
    console.log('Successfully played');
  }).catch((err) => {
    console.log('error', err);
  });



  let scanSpinner = await this.loadingController.create({
      spinner : "bubbles",
      animated : true,
      message : "Scanning for cars....",
      duration : 1000,
      translucent : true
    });
  
  this.ngZone.run(()=> { 
      this.scannedDevices = [];
  });

  // is the Bluetooth enabled?
  this.ble.isEnabled().then(
    () =>
    { // Bluetooth is enabled.
      // is the location enabled?
      this.ble.isLocationEnabled().then(
        () =>
        { // location is enabled.
          scanSpinner.present().then(
            () => 
            { 
              if(isLogEnabled) console.info('Scanning ....');
              
              // start the BLE scanning.
              this.ble.scan([], 1).subscribe(
                (device) => 
                {
                  this.onDiscoveredDevice(device);
                }, 
                (error)  =>  
                {
                  if(isLogEnabled) console.error('Error scanning.', error);
                  scanSpinner.dismiss().then(() => { 
                            this.showAlert('Error scanning.', error); 
                  });
                }); 
            });
        },
        // location is not enabled.
        (error) =>
        {
          if(isLogEnabled) console.error('Error isLocationEnabled.', error);
          this.showLocationEnableAlert('Ooops!', 'The Location is Not enabled. Please enable it and try again.'); 
        });  
    },
    // Bluetooth is not enabled.
    (error) => 
    {
      if(isLogEnabled) console.error('Error isBluetoothEnabled.', error);
      this.showBluetoothEnableAlert('Ooops!', 'The Bluetooth is Not enabled. Please enable it and try again.'); 
    });
  } 

  // con discovered device
  onDiscoveredDevice(device)
  {
    var scannedDevice = 
    { 
      name: device.name, 
      id: device.id, 
      mac: this.platform.is("android") ? device.id : '', 
      rssi : device.rssi
    }; 
  
    this.ngZone.run(() => {
      if(device.name === "train")
      {
        //If we found the trainer just connect to it automatically
        this.connectToDevice(device);

      }
      if(device.name === defaultDeviceName)
      {
        this.scannedDevices.push(scannedDevice);
      }
    });

    if(isLogEnabled) console.log('Scanned device  : '+ JSON.stringify(scannedDevice));  
  }

  // connect to a device
  connectToDevice(device) 
  {    
    console.log('connect to device to '+device.name+'.');
    this.showToast('Connecting to '+device.name+' ...', 'medium', 2000, 'bottom');
    this.ble.connect(device.id).subscribe(
      () => this.onConnected(device),
      (error) => this.onErrorConecting(device, error)
    );
    setTimeout(() => {
      this.isConnected(device);
    },3000);

  } 

  isConnected(device): any {
    console.log('checking for connection on device: ' + device.id);
    //Check if this is train, if yes save the id
    if (device.name === "train")
    {
      this.trainID = device.id;
    }
    this.ble.isConnected(device.id)
      .then(function (success) {
        console.log('yes');
      }, function (error) {
        console.log(error);
        console.log('no');
      });
  }

  // on connected 
  onConnected(device)
  {
    if(isLogEnabled) console.log('Connected to '+device.name+'.');
    this.showToast('Connected to '+device.name+'.', 'success', 2000, 'bottom');
    if (device.name!="train")
    {
      this.ngZone.run(()=> {
        let navigationExtras: NavigationExtras = {
          queryParams: { 
            device: JSON.stringify(device),
            deviceTrain: JSON.stringify(this.trainID)
          }
        }; 
        if(isLogEnabled) console.info('Navigating to the [dashboard] page');
        if(isLogEnabled) console.log('Navigation extras: device = '+JSON.stringify(device));
        this.scannedDevices = [];
        this.navCtrl.navigateForward(['dashboard'], navigationExtras);
      });
    }
  }

  // on error connecting
  onErrorConecting(device, error)
  {
    if(isLogEnabled) console.info('connection error');
    //this.showToast('Unexpectedly disconnected from '+device.name+'.', 'danger', 2000, 'bottom');
    //if(isLogEnabled) console.error('Unexpectedly disconnected from '+device.name+'.', error);
    //if(isLogEnabled) console.info('navigating to the [scanner] page');
    //this.navCtrl.navigateBack(['scanner']);
  }  

  // show alert
  async showAlert(title, message) 
  {               
    let alert = await this.alertCtrl.create({
        header: title,
        subHeader: message,
        buttons: ['OK'],
        cssClass : 'alert'
    });        
    alert.present()
  }

  // show the bluetooth enable alert
  async showBluetoothEnableAlert(title, message) 
  {               
    let alert = await this.alertCtrl.create({
        header: title,
        subHeader: message,
        buttons: [
          {
            text: 'Settings',
            handler: () => {
              this.diagnostic.switchToBluetoothSettings();
            }
          },
          {
            text: 'OK',
            role: 'cancel',
          }
        ],
        cssClass: 'alert',
        backdropDismiss : false
    });        
    alert.present()
  }
  
  // show the location enable alert
  async showLocationEnableAlert(title, message) 
  {
    let alert = await this.alertCtrl.create({
        header: title,
        subHeader: message,
        buttons: [
          {
            text: 'Settings',
            handler: () => {
              this.diagnostic.switchToLocationSettings();
            }
          },
          {
            text: 'OK',
            role: 'cancel',
            cssClass: 'alert-buttons'
          }
        ],
        cssClass: 'alert',
        backdropDismiss : false
    });        
    alert.present()
  }
  
  // show toast
  async showToast(msg, clr, dur, pos) 
  {
    let toast = await this.toastCtrl.create({
        message: msg,
        color: clr,
        duration: dur,
        position: pos,
        cssClass :'toast'
    });
    toast.present();
  }  
}
