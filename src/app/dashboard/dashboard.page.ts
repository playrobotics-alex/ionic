/*
      this.storage.get("NitroMultiplier").then((value) => {
        this.NitroMultiplierStorage = value;
        this.NitroMultiplier = this.NitroMultiplierStorage/100;

    });



*/


import { Component, ElementRef, AfterViewInit, NgZone, ViewChild } from '@angular/core';
import { NavController, AlertController, ToastController} from '@ionic/angular';
import { ActivatedRoute} from "@angular/router";
import { Platform } from '@ionic/angular'; 
import { BLE } from '@ionic-native/ble/ngx';
import { DeviceMotion, DeviceMotionAccelerationData } from '@awesome-cordova-plugins/device-motion/ngx';
import { NavigationExtras } from "@angular/router";
import { Storage } from '@ionic/storage-angular';

import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import { Vibration } from '@ionic-native/vibration/ngx';
import 'hammerjs';

declare const NavigationBar: any;
//NavigationBar.backgroundColorByHexString("#FF0000", true);
NavigationBar.hide();


const CUSTOM_SERVICE_UUID       = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
const LEDS_STATES_CHAR_UUID     = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';

const TRAINER_CHAR_UUID     = '7E400002-B5A3-F393-E0A9-E50E24DCCA9E';
const TRAINER_SERVICE_UUID      = '7E400001-B5A3-F393-E0A9-E50E24DCCA9E';


const isLogEnabled = true;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements AfterViewInit {

  //Timer Varaibles
  public timeBegan = null
  public timeStopped:any = null
  public stoppedDuration:any = 0
  public started = null
  public running = false
  public nitro = false
  public blankTime = "00.00"
  public time = "LAP"
  public BestLapTimeString = "BEST"
  public LapTimeString = ""

  public SubscribedToNotifyBLE = false

  trainID  : string = "";

  //Gauges variable
  
  //Slide should be at the middle
  gasLevel : number = 150;
  GasValue : number = 150;

  RPMValue : number = 0;
  TempValue  : number = 0;
  FuelValue  : number = 0;

  //Varaibles to pull the settings from storage
  BLEcounter  : number = 0;
  IndoorLightsToggle : boolean;
  SlowFuelToggle : boolean;
  SlowHeatToggle : boolean;
  TrimValue : number = 0;

  LapTime : number = 0;
  BestLapTime : number = 0;
  LapsCount : number = 1;
  wheelRotate : number = 0;

  NitroMultiplierStorage :  number = 0;  
  NitroMultiplier:number =0;
 
  CompleteAnimationFlag  : number = 0;
  
  AnimationDuration : number = 700; 
  ProgressBarColor : string = "#ffffff";
  TempColor  : string = "#000";
  FuelColor  : string = "#000";
  bgColor  : string = "#000";


  get_duration_interval: any;

  connectedDevice : any = {}; 
  
  steeringLevel : number = 0;

  steering : number = 0;
  revSteering : number = 0;
  netSteering : number = 0;
  steeringMultiplier : number = 0;

  constructor(  private ble: BLE,
                private deviceMotion: DeviceMotion,    
                public  navCtrl: NavController,  
                private route: ActivatedRoute, 
                private alertCtrl: AlertController,      
                private toastCtrl: ToastController,
                public  platform: Platform,
                private screenOrientation: ScreenOrientation,
                private vibration: Vibration,
                private storage: Storage,                
                private ngZone: NgZone ) 
                {
                  this.platform.ready().then(() => {
                    this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.LANDSCAPE);
                    });
                  this.route.queryParams.subscribe(params => {
                    let device = JSON.parse(params['device']);
                    this.trainID = JSON.parse(params['deviceTrain']);
    
                    if(isLogEnabled) console.log('Route navigationExtra: device = '+JSON.stringify(device)); 
    
                    this.ble.isConnected(device.id).then(
                      () => this.onConnected(device),
                      () => this.onNotConnected(device)
                    );  
                  });


                }

      ngAfterViewInit(): void {        

        //Check if this is the first time we are running the app
        this.storage.get("FirstTimeApp").then((value) => {
          if ( !value ) {            
            console.log('App Runing for the first time, setting storage default values');
            this.storage.set('SlowHeatToggle', true); 
            this.storage.set('SlowFuelToggle', true); 
            this.storage.set('IndoorLightsToggle', true); 
            this.storage.set('FirstTimeApp', 'NO'); 
            this.storage.set('TrimValue', '0'); 
            this.TrimValue = 0;
          }            
          else
            console.log('App NOT Runing for the first time');
        });


        this.storage.get("TrimValue").then((value) => {
          if ( !value ) {            
            console.log('setting trim');
            this.storage.set('TrimValue', '0'); 
            this.TrimValue = 0;
          }        
          else   
          { 
            console.log('trim set');
            console.log(value);
          }  
        });        

        this.gasLevel = 90;
        this.GasValue = 500;
        this.RPMValue = 0;             
        this.wheelRotate = 0;   
        this.steering = 90;              
        //Gauge needle animations
        setTimeout(() => {
          this.AnimationDuration=700;
          this.RPMValue=1000;
          this.FuelValue=1000;
          this.TempValue=180;                    
        },500);

        setTimeout(() => 
        {                
          this.RPMValue=0;
          this.FuelValue=0;
          this.TempValue=0;
        },1400);
        
        setTimeout(() => 
        {
          this.AnimationDuration=20;
          this.get_duration_interval= setInterval(()=> 
          {
              this.sendBLE(); 
          }, 100);
          },2000);
        

      }       
    
      onMoveGas(ev){
        this.gasLevel = 180-(ev.center.y)/2;
        
        console.log(this.gasLevel/2+45);

      }
            
     onMoveSteering(ev)
     {
      //console.log("XM", ev.center.x);
      this.wheelRotate = ev.center.x-90;
      this.steering = ev.center.x;

    }
    onEndGas(ev){
        //console.log("END");
        this.gasLevel = 90;
        this.GasValue = 500;
        this.RPMValue = 0;             
    } 
    
    onEndSteering(ev){    
        this.wheelRotate = 0;   
        this.steering = 90;           
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
      
      //this.get_duration_interval= setInterval(()=> { this.sendBLE() }, 50);
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
    clearInterval(this.get_duration_interval);
    if(isLogEnabled) console.error('Error connecting to '+device.name+'.');
    this.showToast('Error connecting to '+device.name,'danger',2000,'bottom');
   
    if(isLogEnabled) console.info('navigating back to [scanner] page.');
    this.navCtrl.navigateBack('scanner');
  }

  sendBLE() : any
  {
    //Get settings from storage every 2 seconds
    this.BLEcounter++;
    if ((this.BLEcounter==1)||(this.BLEcounter%20==0))
    {
        //Test readying characteristic
        // read data from a characteristic, do something with output data
        console.log("trainID");
        console.log(this.trainID);
        //If trainer is connected and we are not subscrbied to notifications lets subscribe
        if (( this.trainID.length>2 )&&(this.SubscribedToNotifyBLE==false))
        {
          console.log("-==subscribing==-");
          this.ble.startNotification(this.trainID, TRAINER_SERVICE_UUID, "7E400003-B5A3-F393-E0A9-E50E24DCCA9E").subscribe(
            data => {
              this.onNotify(data),
              this.SubscribedToNotifyBLE = true;
            },
            () => this.showAlert('Unexpected Error', 'Failed to subscribe')
          )
          
        }
        this.storage.get("IndoorLightsToggle").then((value) => {
        this.IndoorLightsToggle=value;
        console.log('IndoorLightsToggle: ', value);
        //Send settings to car
        let string = 'X'
        if  (this.IndoorLightsToggle)
          string = string + '1';
        else
          string = string + '0';
        console.log('sending settings to car',string);
    
        let array = new Uint8Array(string.length);
        for (let i = 0, l = string.length; i < l; i ++) {
          array[i] = string.charCodeAt(i);
        } 
        this.ble.writeWithoutResponse(this.connectedDevice.id, CUSTOM_SERVICE_UUID, LEDS_STATES_CHAR_UUID, array.buffer).then(
          () => {           
            //if(isLogEnabled) 
              //console.log(sending settings to car',);
          },
          error => { 
            if(isLogEnabled) 
              console.error('Error sending date, disconnecting.', error);
            clearInterval(this.get_duration_interval);
            this.navCtrl.navigateBack('scanner');
            }
        );   
      });
      this.storage.get("SlowHeatToggle").then((value) => {
        this.SlowHeatToggle=value;
        console.log('SlowHeatToggle: ', value);
      });
      this.storage.get("SlowFuelToggle").then((value) => {
        this.SlowFuelToggle=value;
        console.log('SlowFuelToggle: ', value);
      });     
      this.storage.get("TrimValue").then((value) => {
        this.TrimValue=parseInt(value);
        console.log('TrimValue: ', value);
      });                


    }


    //Init Animation
    //Fuel
    if (this.CompleteAnimationFlag==0)
    {
      if(this.FuelValue<1000)
        this.FuelValue =  this.FuelValue+20;
      else
        this.CompleteAnimationFlag=1;
    }
    //Temp
    if(this.TempValue<25)
      this.TempValue =  this.TempValue+2;
    else
      if(this.TempValue<90)
        this.TempValue = this.TempValue + 0.1;
    

    //====Fuel managment======        
    if (this.SlowFuelToggle==true)
    {
      if (this.RPMValue>700)
        this.FuelValue = this.FuelValue - 10.5;      
      else
      {
        if (this.RPMValue>500)
          this.FuelValue = this.FuelValue - 0.3;      
        else  
        {
          if (this.RPMValue < 300)
          {
            if(this.RPMValue > 0)
              this.FuelValue = this.FuelValue - 0.1;      
          }  
          else
          {
              //between 300 -> 500
              if (this.RPMValue > 50)
                this.FuelValue = this.FuelValue - 0.2;      
          }  
        }   
      }    
    }

    //====Temp managment======        

    if (this.SlowHeatToggle==true)
    {
      if (this.RPMValue>700)
      {
        if (this.TempValue<175)
          this.TempValue = this.TempValue + 0.25;
      }  
      else
      {
        if (this.RPMValue>500)
        {
          if (this.TempValue<175)
            this.TempValue = this.TempValue + 0.1;
        }  
        else  
        {
          if (this.RPMValue < 300)
          {
            if(this.TempValue>90)
              this.TempValue = this.TempValue - 0.2;
          }  
          else
          {
              //between 300 -> 500
              if (this.TempValue > 90)
                this.TempValue = this.TempValue - 0.3;
          }  
        }   
      }          
    }
    //====Alerts======

    // Overheating
    if (this.TempValue>150)
      this.TempColor = "#FF2B00";
    else
      if (this.TempValue>120)
        this.TempColor = "#FF8300";
      else
        this.TempColor = "#000";
    
    // Low fuel
    if ((this.CompleteAnimationFlag==1)&&(this.FuelValue<100))
      this.FuelColor = "#FF2B00";    
    else
    this.FuelColor = "#000";    
    
    
    
    //Map Gas slider
    
    //Limit slider only to possitive values

    if (this.gasLevel<0)
      this.GasValue = 0;
    else
      this.GasValue =  this.gasLevel*5.5;



    //Map rpm gauge
    let RpmToDisplay = 0;
    if (this.gasLevel<90)
    { //BACK
      this.ProgressBarColor = "#3111c0"; 
      //Limit to 1000
      if (180-(this.gasLevel-90)*5.5*2>1000)
        RpmToDisplay = 1000;
      else
        RpmToDisplay =  180-(this.gasLevel-90)*5.5*2;
    }  
    else  
    {  
      //FORWARD            
      if (this.gasLevel==90)
      {
        this.ProgressBarColor = "#ffffff";
          RpmToDisplay=0;
      }  
      else
      {        
        //Limit to 1000
        if ((this.gasLevel-90)*5.5*2>1000)
          RpmToDisplay = 1000;
        else
          RpmToDisplay =   (this.gasLevel-90)*5.5*2;

        this.ProgressBarColor = "#FF0000";
      }

    }     

    if (this.nitro==false)
      this.RPMValue =RpmToDisplay/2;
    else
      this.RPMValue =RpmToDisplay;
   
    // Get the device current acceleration
    // sreering with accelerometer , not used currently
    /*
    this.deviceMotion.getCurrentAcceleration().then(
      (acceleration: DeviceMotionAccelerationData) => this.steering = acceleration.y,
      (error: any) => console.log(error)
    );
    */
   //mapping steering to 0->90 | 0->-90 instead of 0-180

    let netSteering = this.steering-90;
    let steeringMultiplier = 0.75; 

    //now back to 0-180
    netSteering = netSteering*steeringMultiplier +90;
    this.revSteering = Math.round(180-(netSteering*1));
    this.revSteering =  this.revSteering + this.TrimValue;


    let Mapped180Gas = 180-(this.gasLevel);
    let NitroGas=0;

    if (this.nitro==true)
      NitroGas = Mapped180Gas;
    else  
      NitroGas = Mapped180Gas*0.5 + 45;
    
    let string = NitroGas +'S' + this.revSteering;
    console.log(string);

    let array = new Uint8Array(string.length);
    for (let i = 0, l = string.length; i < l; i ++) {
      array[i] = string.charCodeAt(i);
    }


      this.ble.writeWithoutResponse(this.connectedDevice.id, CUSTOM_SERVICE_UUID, LEDS_STATES_CHAR_UUID, array.buffer).then(
        () => {           
          //if(isLogEnabled) 
            //console.log(array.buffer);
        },
        error => { 
          if(isLogEnabled) 
            console.error('Error sending date, disconnecting.', error);
          clearInterval(this.get_duration_interval);
          this.navCtrl.navigateBack('scanner');
          }
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
  disconnect()
  {
    //Disconnect CAR
    this.ble.disconnect(this.connectedDevice.id).then(
      () => this.onDisconnecting(this.connectedDevice),
      error => this.onErrorDisconnecting(this.connectedDevice, error)
    );
    if(isLogEnabled) 
    console.info('Disconnect car success');

    console.info('Disconnecting from trainer');
    console.info(this.trainID);
    //Disconnect Trainer
    this.ble.disconnect(this.trainID).then(
      () => console.info('Disconnect trainer success'),
      error =>  console.info('Disconnect trainer ERROR')
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

  async FuelClick()
  {
    this.CompleteAnimationFlag=0;
  }

  async NitroClick()
  {
    if (this.nitro)
    {
      this.bgColor = "rgb(0, 0, 0)";
      this.nitro=false;

    }
    else
    {
      this.bgColor = "rgb(0, 0, 51)";
      this.nitro=true;
    }  
  }
 
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

  start() 
  {
    this.reset();
    //Send start command to trainer if connected
    if ( this.trainID.length>2 )
    {
        // Z -> start race
        // Y -> end race
        let string = 'Z';
    
        let array = new Uint8Array(string.length);
        for (let i = 0, l = string.length; i < l; i ++) {
          array[i] = string.charCodeAt(i);
        } 

        this.ble.writeWithoutResponse(this.trainID, TRAINER_SERVICE_UUID, TRAINER_CHAR_UUID, array.buffer).then(
          () => {           
              console.log("sending settings to trainer");
              console.log(this.trainID);
          },
          error => { 
            if(isLogEnabled) 
              console.error('Error sending date, disconnecting.', error);
            clearInterval(this.get_duration_interval);
            this.navCtrl.navigateBack('scanner');
            }
        );   
    }

    //If we are here the race is new! Lets do countdown
    //3
    this.doVibrationFor(200);
    this.time = "-3-";
    //2
    setTimeout(() => {
      this.doVibrationFor(200);
      this.time = "-2-";
    },1200);
    //1
    setTimeout(() => {
      this.doVibrationFor(200);
      this.time = "-1-";
    },2400);
    //GO!
    setTimeout(() => {
      this.doVibrationFor(400);
      if (this.RPMValue>0)
      {
        this.time = "DISQ";
        this.doBlinkColor("#FF0000","#000");        
      }  
    },3600);


  }
  zeroPrefix(num, digit) 
  {
      let zero = '';     

      let ReturnString = zero + num;

      if (digit==1)
        ReturnString = ReturnString.substring(0, ReturnString.length - 1);

      if (ReturnString.length<2)
      { 
        if(digit==1)
          ReturnString = ReturnString + '0';
        else
          ReturnString = '0' + ReturnString;
      } 

      return (ReturnString);        
  }

  stop() 
  {
      this.running = false;
      this.timeStopped = new Date();
      clearInterval(this.started);
  }
  reset() 
  {
    this.running = false;
    clearInterval(this.started);
    this.stoppedDuration = 0;
    this.timeBegan = null;
    this.timeStopped = null;
    this.time = this.blankTime;
  }
  clockRunning()
  {
    let currentTime:any = new Date()
    let timeElapsed:any = new Date(currentTime - this.timeBegan - this.stoppedDuration)

    let sec = timeElapsed.getUTCSeconds()
    let ms = timeElapsed.getUTCMilliseconds();
    this.time =
    this.zeroPrefix(sec, 0) + "." +
    this.zeroPrefix(ms, 1);
  };    

  doVibrationFor(ms) {
    // Vibrate the device for given milliseconds
    // Duration is ignored on iOS and limited to 1 second.
    this.vibration.vibrate(ms);
  }

  doBlinkColor(color1,color2){
    //Blink red color
    this.bgColor = color1;
    this.doVibrationFor(1800);
    setTimeout(() => {
      this.bgColor = color2;
    },200);
    setTimeout(() => {
      this.bgColor = color1;
    },400);  
    setTimeout(() => {
      this.bgColor = color2;
    },600);  
    setTimeout(() => {
      this.bgColor = color1;
    },800);  
    setTimeout(() => {
      this.bgColor = color2;
    },1000);   
    setTimeout(() => {
      this.bgColor = color1;
    },1200);  
    setTimeout(() => {
      this.bgColor = color2;
    },1400);  
    setTimeout(() => {
      this.bgColor = color1;
    },1600);  
    setTimeout(() => {
      this.bgColor = color2;
    },1800);                                        
  }

  goToSettings()
  {
      if(isLogEnabled) console.info('Navigating to the [settings] page');
      this.navCtrl.navigateForward(['settings']);
 
  }
  onNotify(buffer:ArrayBuffer){
    this.ble.read(this.trainID, TRAINER_SERVICE_UUID, "7E400003-B5A3-F393-E0A9-E50E24DCCA9E").then(
      data => this.ReadLapData(data),
      () => this.showAlert('Unexpected Error', 'Failed to subscribe')
    )
  }
  ReadLapData(buffer:ArrayBuffer) {
    // Temperature is a 4 byte floating point value
    var data = new Uint8Array(buffer);
    console.log('Array we got from BLE: ',data);
    //Transfor the buff array to a 5 digit number
    
    var lapData= data[2]*256*256+data[1]*256+data[0];
   // lap-number|| lap second X 10  || lap second X 1 || lap second / 10 ||   lap second / 100 ||
    var lapBLE = Math.round(lapData/10000)
    console.log('Lap: ',lapBLE);
    
    var lapTimeBLE = Math.round(lapData%10000)/100;
    console.log('Time: ',lapTimeBLE);
    //Start the clock only once the car passes the start line
    if (lapBLE==1)
    {      
      if (this.timeBegan === null) {
        this.reset();
        this.timeBegan = new Date();
      }
      if (this.timeStopped !== null) {
        let newStoppedDuration:any = (+new Date() - this.timeStopped)
        this.stoppedDuration = this.stoppedDuration + newStoppedDuration;
      }
      this.started = setInterval(this.clockRunning.bind(this), 108);
      this.running = true;
      this.LapsCount=1;
    }   
    var lapType = 'B';

    //Now we need to check best lap time and do some other things
    if((this.running)&&(lapBLE > this.LapsCount))
    {
      //There was a lap recoreded by the trainer
      this.LapsCount = lapBLE;
      //Check for best lap
      
      //if ((parseFloat(this.time) < this.BestLapTime)||(this.BestLapTime==0))
      if ((lapTimeBLE < this.BestLapTime)||(this.BestLapTime==0))
      {
        this.BestLapTime= lapTimeBLE;
        this.BestLapTimeString= lapTimeBLE.toString();
        this.doVibrationFor(200);
        setTimeout(() => {
          this.doVibrationFor(200);
        },200);    
        lapType = 'B';  
      }
      else
      {
        this.doVibrationFor(200);
        lapType = 'R';  
      }  

      //Send score lights command to trainer
      if ( this.trainID.length>2 )
      {
          // Z -> start race
          // Y -> end race
          // L -> Leds command
          let string = 'L';
          string = string +  this.LapsCount + lapType;

          let array = new Uint8Array(string.length);
          for (let i = 0, l = string.length; i < l; i ++) {
            array[i] = string.charCodeAt(i);
          } 
  
          this.ble.writeWithoutResponse(this.trainID, TRAINER_SERVICE_UUID, TRAINER_CHAR_UUID, array.buffer).then(
            () => {           
                console.log("sending settings to trainer");
                console.log(this.trainID);
            },
            error => { 
              if(isLogEnabled) 
                console.error('Error sending date, disconnecting.', error);
              clearInterval(this.get_duration_interval);
              this.navCtrl.navigateBack('scanner');
              }
          );   
      }        

      this.reset();
      //Race still on
      if (this.LapsCount<9)
      {
        this.timeBegan = new Date();
        this.started = setInterval(this.clockRunning.bind(this), 108);
        this.running = true;
        //this.LapsCount++;
      }  
      else
      {
        //Race finished      
        this.doBlinkColor("#FFF","#000");          
        this.LapTimeString = this.time;
        this.doVibrationFor(2000);
        this.stop();
        this.time = "FINSH";
        this.LapsCount = 8;
        this.running = false;

      }
      return;
    }  



  }
/*
  getCoordinates(event)
  {
      // This output's the X coord of the click
      console.log(event.clientX);

      // This output's the Y coord of the click
      console.log(event.clientY);
  }
  */
}
