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
import { AudioManagement } from '@ionic-native/audio-management/ngx';
import { Vibration } from '@ionic-native/vibration/ngx';



const isLogEnabled = true;
const defaultDeviceName =  "ESP32";



@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.page.html',
  styleUrls: ['./scanner.page.scss'],
})

export class ScannerPage   {
  scannedDevices: any[] = [];
  trainID  : string = " ";
  public alertMode = "";
  public alreadyConnected = false;
  public beepPlayed = false;
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
              private vibration: Vibration,
              private nativeAudio: NativeAudio,
              private audio: AudioManagement,
              private ngZone: NgZone ) 
              {                
                this.platform.ready().then(() => {
                  this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.PORTRAIT);
                  this.setRingtone();  
                  this.setRingtoneScan();  
                  });

              }

              ngOnInit() {                              
                this.alertMode="";
                //$("#myValues").speedometer({divFact:10,eventListenerType:'keyup'});
                this.storage.create();
                this.trainID =" ";

                //Check if intro done (intro only needed on android)
                if (this.platform.is("android"))
                {
                  this.storage.get("intro-done").then((value) => {
                    if ( !value ) {            
                      if(isLogEnabled) console.log('Intro not done yet, updating intro to done and redirecting');
                      this.storage.set('intro-done', true); 
                      this.navCtrl.navigateRoot('intro');
                    }            
                    else
                      if(isLogEnabled) console.log('App NOT Runing for the first time');
                  });
                }

              }



doVibrationFor(ms) {
  // Vibrate the device for given milliseconds
  // Duration is ignored on iOS and limited to 1 second.
  this.vibration.vibrate(ms);
}


setRingtone() {
  // Preload the audio track 
  this.nativeAudio.preloadSimple('uniqueId1', 'assets/sounds/car.mp3');
}

setRingtoneScan() {
  // Preload the audio track 
  this.nativeAudio.preloadSimple('uniqueIdScan', 'assets/sounds/beep-beep.mp3');
}

getAudioMode() {
  return new Promise(async (resolve, reject) => {
    this.audio.getAudioMode().then((value) => {
      if (value.audioMode == 0 || value.audioMode == 1) { // this will cause vibration in silent mode as well
        this.alertMode = 'Vibrate';
        resolve(false);
      } else {
        this.alertMode = 'Ring';
        resolve(true);
      }
    }).catch((error) => {
      resolve(false);
    })
  });
}             

playSingle() {
  this.nativeAudio.play('uniqueId1').then(() => {
    console.log('Successfully played');
  }).catch((err) => {
    console.log('error', err);
  });

}

playSingleScan() {
  this.nativeAudio.play('uniqueIdScan').then(() => {
    console.log('Successfully played');
  }).catch((err) => {
    console.log('error', err);
  });

}

// start the BLE scan
async startBleScan()
{ 
  this.beepPlayed = false;
  if (this.platform.is("android"))
    this.getAudioMode();
  else
    this.alertMode = 'Ring';  
  let scanSpinner = await this.loadingController.create({
      message : "Scanning for cars....",
      duration : 2000,
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
      if (this.platform.is("android"))
      {  
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
      }
      else
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
      }



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
      rssi : device.rssi,
      mapped_name: "11",
      mapped_id: 12,
      mapped_icon: 1,
      year:1
    }; 
  
    this.ngZone.run(() => {
      /*
      if(device.name === "train")
      {
        //If we found the trainer just connect to it automatically
        //this.connectToDevice(device);
        console.log('Connected to TRAIN saving id: '+device.id+'.');
        this.ble.connect(device.id).subscribe
        (
          (success) => {
                console.log('trainer success');
                //If train save id
                this.trainID = device.id;
          },
          (error) => {
            console.log('trainer error');
          }      
        )
      }
      */

      if (device.name)
      {
        console.log('lookings');
        if(device.name.indexOf("PR-Civic")==0)
          device.name= "PR*Honda Civic Type R*001";
        if(device.name.indexOf("PR*")==0)
        {
          const deviceNameSplitArray =  device.name.split("*");
          scannedDevice.mapped_name = deviceNameSplitArray[1];
          console.log('deviceNameSplitArray[1]');
          console.log(deviceNameSplitArray[1]);
          scannedDevice.mapped_id = deviceNameSplitArray[2];
          if(scannedDevice.mapped_name=="Honda Civic Type R")
          {
            scannedDevice.mapped_icon=1;
            scannedDevice.year=1999;
          }  
          this.scannedDevices.push(scannedDevice);
          //We only want to beep on first car
          if (this.beepPlayed == false)
          {
            if (this.alertMode== 'Ring') 
            {
              this.beepPlayed = true;
              this.playSingleScan();
            }  
            else
              this.doVibrationFor(200);
          }
          
          


        }  
      } 
    });

    if(isLogEnabled) console.log('Scanned device  : '+ JSON.stringify(scannedDevice));  
  }

  // connect to a device
  connectToDevice(device) 
  {    
    this.alreadyConnected=false;
    this.ble.disconnect(device.id).then(() => {
      console.debug("Disconnect success");
     })
  .catch(error => {
      console.error("Disconnect  error:", error);
  });
  
  
  this.loadingController.create({
    message: 'Connecting to CAR',
    duration: 6000
  }).then((response) => {
    response.present();
    response.onDidDismiss().then((response) => {
      console.log('Loader dismissed', response);
    });
  });

    console.log('connect to device to '+device.name+'.');
    //this.showToast('Connecting to car', 'medium', 2000, 'bottom');
    console.log('this.ble now');
    setTimeout(() => {
      console.log('INSIDE this.ble now - attempt 1');
      this.ble.connect(device.id).subscribe(
        (success) => {
          if (this.alertMode== 'Ring') 
            this.playSingle();
          else
            this.doVibrationFor(200);
    
          console.log('before ng-zone');
          if (this.platform.is("android"))
          {
            this.ngZone.run(()=> {
              let navigationExtras: NavigationExtras = {
                queryParams: { 
                  device: JSON.stringify(device),
                  deviceTrain: JSON.stringify(this.trainID)
                }
              }; 
              if(isLogEnabled) console.info('Navigating to the [dashboard] page');
              if(isLogEnabled) console.log('Navigation extras: device train = '+this.trainID);
              this.scannedDevices = [];
              this.navCtrl.navigateForward(['dashboard'], navigationExtras);
              
            });
          }
          else
          {
            let navigationExtras: NavigationExtras = {
              queryParams: { 
                device: JSON.stringify(device),
                deviceTrain: JSON.stringify(this.trainID)
              }
            }; 
            if(isLogEnabled) console.info('Navigating to the [dashboard] page');
            if(isLogEnabled) console.log('Navigation extras: device train = '+this.trainID);
            this.scannedDevices = [];
            this.navCtrl.navigateForward(['dashboard'], navigationExtras);

          }
          this.alreadyConnected=true;

          //Dissmiss loader
          this.loadingController.dismiss().then((response) => {
            console.log('Loader closed!', response);
          }).catch((err) => {
              console.log('Error occured : ', err);
          });
        },
        (error) => {
          console.log('INSIDE ble error ');
          this.onErrorConecting(device, error)
          this.alreadyConnected=false;

        }
      );             
    },100);


    
      setTimeout(() => 
      {
        if (this.alreadyConnected!=true)
        {
          console.log('INSIDE this.ble now - attempt 2');

          this.ble.connect(device.id).subscribe(
            (success) => {              
              if (this.alertMode== 'Ring') 
                this.playSingle();
              else
                this.doVibrationFor(200);
              if (this.platform.is("android"))
              {
                this.ngZone.run(()=> {
                  let navigationExtras: NavigationExtras = {
                    queryParams: { 
                      device: JSON.stringify(device),
                      deviceTrain: JSON.stringify(this.trainID)
                    }
                  }; 
                  if(isLogEnabled) console.info('Navigating to the [dashboard] page');
                  if(isLogEnabled) console.log('Navigation extras: device train = '+this.trainID);
                  this.scannedDevices = [];
                  this.navCtrl.navigateForward(['dashboard'], navigationExtras);
                  
                });
              }
              else
              {
                let navigationExtras: NavigationExtras = {
                  queryParams: { 
                    device: JSON.stringify(device),
                    deviceTrain: JSON.stringify(this.trainID)
                  }
                }; 
                if(isLogEnabled) console.info('Navigating to the [dashboard] page');
                if(isLogEnabled) console.log('Navigation extras: device train = '+this.trainID);
                this.scannedDevices = [];
                this.navCtrl.navigateForward(['dashboard'], navigationExtras);
              }

              this.alreadyConnected=true;
              //Dissmiss loader
              this.loadingController.dismiss().then((response) => {
                console.log('Loader closed!', response);
              }).catch((err) => {
                  console.log('Error occured : ', err);
              });              
            },
            (error) => {
              console.log('INSIDE ble error ');
              this.onErrorConecting(device, error)
              this.alreadyConnected=false;
            }
          );             
        }  
      },2000);
      setTimeout(() => 
      {
        if (this.alreadyConnected!=true)
        {
          console.log('INSIDE this.ble now - attempt 3');
          this.ble.connect(device.id).subscribe(
            (success) => {
              if (this.alertMode== 'Ring') 
                this.playSingle();
              else
                this.doVibrationFor(200);
        
              console.log('before ng-zone');
              if (this.platform.is("android"))
              {
                this.ngZone.run(()=> {
                  let navigationExtras: NavigationExtras = {
                    queryParams: { 
                      device: JSON.stringify(device),
                      deviceTrain: JSON.stringify(this.trainID)
                    }
                  }; 
                  if(isLogEnabled) console.info('Navigating to the [dashboard] page');
                  if(isLogEnabled) console.log('Navigation extras: device train = '+this.trainID);
                  this.scannedDevices = [];
                  this.navCtrl.navigateForward(['dashboard'], navigationExtras);
                  
                });
              }
              else
              {
                let navigationExtras: NavigationExtras = {
                  queryParams: { 
                    device: JSON.stringify(device),
                    deviceTrain: JSON.stringify(this.trainID)
                  }
                }; 
                if(isLogEnabled) console.info('Navigating to the [dashboard] page');
                if(isLogEnabled) console.log('Navigation extras: device train = '+this.trainID);
                this.scannedDevices = [];
                this.navCtrl.navigateForward(['dashboard'], navigationExtras);
                
              }
              this.alreadyConnected=true;
              //Dissmiss loader
              this.loadingController.dismiss().then((response) => {
                console.log('Loader closed!', response);
              }).catch((err) => {
                  console.log('Error occured : ', err);
              });              
            },
            (error) => {
              console.log('INSIDE ble error ');
              this.onErrorConecting(device, error)
              this.alreadyConnected=false;

            }
          );             
        }  
      },4000);
  } 



  isConnected(device,trainID): any {
    console.log('checking for connection on device: ' + device.id);
    //Check if this is train, if yes save the id
    if (device.name == "train")
    {
      this.trainID = device.id;
      console.log('Connected to TRAINID: '+device.id+'.');
    }
    else
    {
      this.ble.isConnected(device.id).then(
      (success) =>
      {
        console.log('YES already conencted, redirecting');

        if(isLogEnabled) 
          console.log('Connected to '+device.name+'.');

        if (device.name!="train")
        {  

            let navigationExtras: NavigationExtras = {
              queryParams: { 
                device: JSON.stringify(device),
                deviceTrain: JSON.stringify(trainID)
              }
            }; 
            if(isLogEnabled) console.info('Navigating to the [dashboard] page');
            if(isLogEnabled) console.log('Navigation extras: device = '+JSON.stringify(device));
            //this.scannedDevices = [];
            //this.navCtrl.navigateForward(['dashboard'], navigationExtras);
            this.navCtrl.navigateRoot('dashboard');
        }
      }, 
      (error) => {
        console.log(error);
        console.log('NOT connected to car yet');
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
