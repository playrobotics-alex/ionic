import { Component, ElementRef, AfterViewInit, NgZone, ViewChild } from '@angular/core';
import { NavController, AlertController, ToastController, LoadingController} from '@ionic/angular';
import { ActivatedRoute} from "@angular/router";
import { Platform } from '@ionic/angular'; 
import { BLE } from '@ionic-native/ble/ngx';
import { DeviceMotion, DeviceMotionAccelerationData } from '@awesome-cordova-plugins/device-motion/ngx';
import { NavigationExtras } from "@angular/router";
import { Diagnostic } from '@ionic-native/diagnostic/ngx';
import { Storage } from '@ionic/storage-angular';
import { NativeAudio } from '@ionic-native/native-audio/ngx';
import { AudioManagement } from '@ionic-native/audio-management/ngx';
import { GamepadService } from 'ngx-gamepad';


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


//const isLogEnabled = true;
const isLogEnabled = false;


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements AfterViewInit {
  scannedDevices: any[] = [];
  LapTimes: any[] = [];

  public alreadyConnected = false;

  //Timer Varaibles
  public timeBegan = null
  public timeStopped:any = null
  public stoppedDuration:any = 0
  public started = null
  public startedNoRace = null
  public running = false
  public nitro = false
  public blankTime = "00.00"
  public time = "LAP"
  public BestLapTimeString = "BEST"
  public BestLapTimeDragString = "BEST"
  public BestLapTimeLapString = "BEST"
  public BestLapTimeCountString = "BEST"

  public BestLapId = 1;

  public LapTimeString = ""
  public menuShow = false;
  public LapStatsShow = false;
  public alertMode = "";

  

  public RaceType = "lap";

  public SubscribedToNotifyBLE = false;
  trainID  : string;
  carID : string;

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
  AccSteeringToggle : boolean;
  SlowFuelToggle : boolean;
  SlowHeatToggle : boolean;
  TrimValue : number = 0;
  InitialMaxLapTime : number = 30;


  LapTime : number = 0;
  BestLapTime : number = 0;
  BestLapTimeDrag : number = 0;
  BestLapTimeLap : number = 0;
  LapsCount : number = 1;
  TotalLaps : number = 1;
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

  maxLapTime : number = 25;

  //Controller Global Variables
  ControllerFound : boolean;
  mappedSteeringController : number = 0;
  mappedSpeedController : number = 0;


  constructor(  private ble: BLE,
                private deviceMotion: DeviceMotion,    
                private diagnostic: Diagnostic,
                public  navCtrl: NavController,  
                private route: ActivatedRoute, 
                private alertController: AlertController,      
                private toastCtrl: ToastController,
                public  platform: Platform,
                private screenOrientation: ScreenOrientation,
                private vibration: Vibration,
                private nativeAudio: NativeAudio,
                private audio: AudioManagement,
                private storage: Storage,  
                private loadingController: LoadingController,              
                private gamepad: GamepadService,
                private ngZone: NgZone ) 
                {
                  this.platform.ready().then(() => {
                    this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.LANDSCAPE);
                    this.setRingtoneLock();  

                    });
                  this.route.paramMap.subscribe(params => {
                    let deviceCar = JSON.parse(params['car']);
                    //this.trainID = JSON.parse(params['deviceTrain']);

     
                    this.ble.isConnected(deviceCar.id).then(
                      () => this.onConnected(deviceCar),
                      () => this.onNotConnected(deviceCar)
                    );  
                  });
                  this.LapTimes = [];

                  if (this.platform.is("android"))
                  {
                    this.getAudioMode();
                  }  
                  else
                    this.alertMode = 'Ring';   

                  //this.listenToGamepad();
                }
      ngOnInit() {    
        const refreshRate = 50;
  
        setInterval( () =>
        {
          
          // Returns up to 4 gamepads.
          const gamepads = navigator.getGamepads();
          // We take the first one, for simplicity
          const gamepad = gamepads[0];
  
          // Escape if no gamepad was found
          if (!gamepad) 
          {
              if(isLogEnabled) console.log('No gamepad found.');
              this.ControllerFound = false;
              return;
          }
          else
          {
            if(isLogEnabled) console.log('FOUNDDD');
            this.ControllerFound = true;
          }  
  
          // Filter out only the buttons which are pressed
          const pressedButtons = gamepad.buttons                
              .map((button, id) => ({id, button}))
              .filter(isPressed);
  
          // Print the pressed buttons to our HTML
          for (const button of pressedButtons) {
              if(isLogEnabled) console.log(button);
              if(button.id==8)
              {
                console.log('NITRO');
                this.nitro = true;
                this.bgColor = "rgb(0, 0, 151)";
              }  
              if(button.id==9)
              {
                console.log('NO NITRO');
                this.nitro = false;
                this.bgColor = "rgb(0, 0, 0)";
              }                  
 
              //This is not working coorectly because button clicks were not handeled (double click)
              /*
              if(button.id==2)
                this.menuShow = true;
 
              if((button.id==3)&&(this.menuShow==true))
                this.start('lap');

              if((button.id==4)&&(this.menuShow==true))
                this.start('drag');          
                
              if((button.id==0)&&(this.menuShow==true))
                this.start('countdown');                 
              */


          }
          const pressedAxes = gamepad.axes;

          //map left stick to steering as we use it
          //-100 -> +100
          this.mappedSteeringController =  Math.round(pressedAxes[0]*-100);
          //0 -> 200
          this.mappedSteeringController = this.mappedSteeringController + 100;
          //0 -> 120
          this.mappedSteeringController = this.mappedSteeringController * 0.6;          
          //30 -> 150
          this.mappedSteeringController = this.mappedSteeringController + 30  - this.TrimValue;          

          //map right stick to gas as we use it
          //-100 -> +100
          this.mappedSpeedController =  pressedAxes[3]*100;
          //0 -> 200
          this.mappedSpeedController = this.mappedSpeedController + 100;
          //0 -> 180
          this.mappedSpeedController = this.mappedSpeedController * 0.9;  

          //Yes nitro -- 0 -> 180
          //No nitro -- 30 -> 150
          if (this.nitro==false)
              this.mappedSpeedController = this.mappedSpeedController * 0.5 + 45;  

          this.mappedSpeedController = Math.round(this.mappedSpeedController);


          if(isLogEnabled) console.log('steering 0: ' + this.mappedSteeringController + ' || Gas 3: ' + this.mappedSpeedController);
            //console.log('1: ' +pressedAxes[1]);
            //console.log('2: ' +pressedAxes[2]);

        }
          
          
          

          , refreshRate);
    

    
        function isPressed({button: {pressed}}) {
            return !!pressed;
        }
      }
      ngAfterViewInit(): void {        

        //Check if this is the first time we are running the app
        this.storage.get("FirstTimeApp").then((value) => {
          if ( !value ) {            
            if(isLogEnabled) console.log('App Runing for the first time, setting storage default values');
            this.storage.set('SlowHeatToggle', true); 
            this.storage.set('SlowFuelToggle', true); 
            this.storage.set('IndoorLightsToggle', true); 
            this.storage.set('AccSteeringToggle', false); 
            this.storage.set('FirstTimeApp', 'NO'); 
            this.storage.set('TrimValue', '0'); 
            this.storage.set('InitialMaxLapTime', '20'); 
            this.TrimValue = 0;
          }            
          else
            if(isLogEnabled) console.log('App NOT Runing for the first time');
        });


        this.storage.get("TrimValue").then((value) => {
          if ( !value ) {            
            if(isLogEnabled)console.log('setting trim');
            this.storage.set('TrimValue', '0'); 
            this.TrimValue = 0;
          }        
          else   
          { 
            if(isLogEnabled) 
            {
              console.log('trim set');
              console.log(value);
            }  
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
          }, 50);
          },2000);
        
        //Start ticking time  
        this.time = "00:00";
        this.timeBegan = new Date();
        this.startedNoRace = setInterval(this.clockRunningNoRace.bind(this), 1000);
        
      }       
    
      onMoveGas(ev){
        this.gasLevel = 180-(ev.center.y)/2;
        
        if(isLogEnabled) console.log(this.gasLevel/2+45);

      }
            
     onMoveSteering(ev)
     {
      //console.log("XM", ev.center.x);
      this.wheelRotate = ev.center.x-90;
      this.steering = ev.center.x;

    }
    onEndGas(ev){
      //add a small delay in case we will stil get the gas move event after the gas end event
      setTimeout(() => {
        console.log("END");
        this.gasLevel = 90;
        this.GasValue = 500;
        this.RPMValue = 0;                 
      },100);
         
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
      this.carID = device.id;
      console.info('CarID: '+this.carID);
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


  
setRingtoneLock() {
  // Preload the audio track 
  this.nativeAudio.preloadSimple('uniqueIdLock', 'assets/sounds/car-lock.mp3');
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

playSingleLock() {
  this.nativeAudio.play('uniqueIdLock').then(() => {
    console.log('Successfully played');
  }).catch((err) => {
    console.log('error', err);
  });

}




  sendBLE() : any
  {
    //Get settings from storage every 2 seconds
    this.BLEcounter++;
    if ((this.BLEcounter==1)||(this.BLEcounter%20==0))
    {
        //Test readying characteristic
        // read data from a characteristic, do something with output data
        if(isLogEnabled) console.log("trainID: "+this.trainID);
        //If trainer is connected and we are not subscrbied to notifications lets subscribe
        if (( this.trainID.length>2 )&&(this.SubscribedToNotifyBLE===false))
        {
          //this.SubscribedToNotifyBLE = true;
          if(isLogEnabled) console.log("-==subscribing==-");
          this.SubscribedToNotifyBLE = true;
          this.ble.startNotification(this.trainID, TRAINER_SERVICE_UUID, "7E400003-B5A3-F393-E0A9-E50E24DCCA9E").subscribe(
            (data) => {
              this.onNotify(data);              
            },
            (error) => console.error('Unexpected Error', 'Failed to subscribe')
          )
          
        }
        this.storage.get("IndoorLightsToggle").then((value) => {
        this.IndoorLightsToggle=value;
        if(isLogEnabled) console.log('IndoorLightsToggle: ', value);
        //Send settings to car
        let string = 'X'
        if  (this.IndoorLightsToggle)
          string = string + '1';
        else
          string = string + '0';
        if(isLogEnabled) console.log('sending settings to car',string);
    
        let array = new Uint8Array(string.length);
        for (let i = 0, l = string.length; i < l; i ++) {
          array[i] = string.charCodeAt(i);
        } 
        console.log('writeWithoutResponse');
        console.log('this.carID',this.carID);
        console.log('CUSTOM_SERVICE_UUID',CUSTOM_SERVICE_UUID);
        console.log('LEDS_STATES_CHAR_UUID',LEDS_STATES_CHAR_UUID);
        console.log('array.buffer',array.buffer);

        this.ble.writeWithoutResponse(this.carID, CUSTOM_SERVICE_UUID, LEDS_STATES_CHAR_UUID, array.buffer).then(
          () => {           
            if(isLogEnabled) console.log("sending settings to car: "+this.carID);
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
        if(isLogEnabled) console.log('SlowHeatToggle: ', value);
      });
      this.storage.get("SlowFuelToggle").then((value) => {
        this.SlowFuelToggle=value;
        if(isLogEnabled) console.log('SlowFuelToggle: ', value);
      });   
      this.storage.get("AccSteeringToggle").then((value) => {
        this.AccSteeringToggle=value;
        if(isLogEnabled) console.log('AccSteeringToggle: ', value);
      });          
      this.storage.get("TrimValue").then((value) => {
        this.TrimValue=parseInt(value);
        if(isLogEnabled) console.log('TrimValue: ', value);
      });    
      this.storage.get("InitialMaxLapTime").then((value) => {
        this.InitialMaxLapTime=parseInt(value);
        if(isLogEnabled) console.log('InitialMaxLapTime: ', value);
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
      //this.ProgressBarColor = "#3111c0"; 
      this.ProgressBarColor = "#FF0000";
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

        //this.ProgressBarColor = "#FF0000";
        this.ProgressBarColor = "#3111c0"; 
      }

    }     

    if (this.nitro==false)
      this.RPMValue =RpmToDisplay/2;
    else
      this.RPMValue =RpmToDisplay;
   
    // Get the device current acceleration
    // sreering with accelerometer
    let steeringMultiplier = 0.75; 
    if (this.AccSteeringToggle)
    {
      //Acceleromter steering
      this.deviceMotion.getCurrentAcceleration().then(
        (acceleration: DeviceMotionAccelerationData) => {          
          //convert to -90->90
          this.revSteering = Math.round(acceleration.y) * 10;          
          this.revSteering = this.revSteering * steeringMultiplier

          //convert it to 0->180
          this.revSteering = this.revSteering +90;
          //reverse steering
          this.revSteering = 180 - this.revSteering  - this.TrimValue ;
          //console.log("this.revSteering: " + this.revSteering);


        },
        (error: any) => console.log(error)
      );
    }  
    else
    {
        //Regular steering
        //mapping steering to 0->90 | 0->-90 instead of 0-180

        let netSteering = this.steering-90;


        //now back to 0-180
        netSteering = netSteering*steeringMultiplier +90;
        this.revSteering = Math.round(180-(netSteering*1));
        this.revSteering =  this.revSteering - this.TrimValue;
    } 

    let Mapped180Gas = 180-(this.gasLevel);
    let NitroGas=0;
    let currentNitroGas=0;

    if (this.nitro==true)
      NitroGas = Mapped180Gas;
    else  
      NitroGas = Mapped180Gas*0.5 + 45;
    
    //check if we have a controller connected

    let string = NitroGas +'S' + this.revSteering;
    if (this.ControllerFound == true)
    {
      string = this.mappedSpeedController +'S' + this.mappedSteeringController;
      //Display RPM
      //mappedSpeedController value is:
      // NOT NITRO 45-135 => -45 -> 45 => 0 -> 45
      // NITRO
      RpmToDisplay =  Math.abs(this.mappedSpeedController - 90);
      // to 0-1000
      this.RPMValue =RpmToDisplay*11.11;
    }  
    else
      if(isLogEnabled) console.log("(this.ControllerFound == false)");

    if(isLogEnabled) console.log("String that will be sent"+ string);
    //console.log("String that will be sent"+ string);

    let array = new Uint8Array(string.length);
    for (let i = 0, l = string.length; i < l; i ++) {
      array[i] = string.charCodeAt(i);
    }
      //console.log("before sending attemp:" + this.carID);
      this.ble.writeWithoutResponse(this.carID, CUSTOM_SERVICE_UUID, LEDS_STATES_CHAR_UUID, array.buffer).then(
        () => {           
         // console.log("sending settings to car: "+this.carID);
        },
        error => { 
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
    if (this.alertMode== 'Ring') 
      this.playSingleLock();
    else
      this.doVibrationFor(200);


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
    if ( this.trainID.length>2 )
    {
      this.ble.disconnect(this.trainID).then(
        () => console.info('Disconnect trainer success'),
        error =>  console.info('Disconnect trainer ERROR')
      );
    }

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
      this.bgColor = "rgb(0, 0, 151)";
      this.nitro=true;
    }  
  }
 
  async showAlert(title, message) 
  {               
    let alert = await this.alertController.create({
          header: title,
          subHeader: message,
          buttons: ['OK'],
          cssClass : 'alert'
          })         
    await alert.present()
  }   

  start(RaceType) 
  {        
    this.reset();
    clearInterval(this.startedNoRace);
    if ( this.trainID.length>2 )
    {
      this.RaceType = RaceType;
      if(isLogEnabled) console.log("RaceType: "+ this.RaceType);
      if (this.RaceType=="lap")
      {
        this.TotalLaps=8;
        //Restore best lap time of the same type of race
        this.BestLapTimeString = this.BestLapTimeLapString; 
        this.BestLapTime = this.BestLapTimeLap;
      }  
      else if (this.RaceType=="drag")
      {
        this.TotalLaps=1;
        //Restore best lap time of the same type of race
        this.BestLapTimeString = this.BestLapTimeDragString; 
        this.BestLapTime = this.BestLapTimeDrag;
      }  
      else if (this.RaceType=="countdown")
      {
        this.TotalLaps=16;
        //Restore best lap time of the same type of race
        this.BestLapTimeString = this.BestLapTimeCountString; 
        if(isLogEnabled) console.log("RESTORE this.BestLapTimeString: "+this.BestLapTimeString);
      }  
      this.menuShow = false;
      
      //Send start command to trainer if connected
      if ( this.trainID.length>2 )
      {
          // A -> start race LAP
          // D -> start race DRAG
          // C -> start race COUNTDOWN
          // Y -> end race
          let string = 'A';
          if (RaceType == "countdown" )
            string = 'C' + this.InitialMaxLapTime;
          if (RaceType == "drag" )
            string = 'D';
            
          let array = new Uint8Array(string.length);
          for (let i = 0, l = string.length; i < l; i ++) {
            array[i] = string.charCodeAt(i);
          } 

          this.ble.writeWithoutResponse(this.trainID, TRAINER_SERVICE_UUID, TRAINER_CHAR_UUID, array.buffer).then(
            () => {           
                //if(isLogEnabled) 
                //{
                  console.log("sending settings to trainer start function");
                  console.log(string);
                //}  
            },
            error => { 
              //if(isLogEnabled) 
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
        this.doBlinkColor("#49fe00","#000"); 
        /*
        if (this.RPMValue>0)
        {
          this.time = "DISQ";
          this.doBlinkColor("#FF0000","#000");        
        } 
        */ 
        this.reset();
        this.LapTimes = [];

        //If this is a drag race we need to start the clock right away and not wait for the car to cross the finish line
        if (this.RaceType=="drag")
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
          this.LapsCount=1;
          this.running = true;
        }
        
      },3600);      
    }
    else
    {
      //Trainer not connected
      this.showAlert("Finish Line Not Found", "In order to start a race the 'Smart Finish Line' should be connected. Turn it on and press SCAN");
    }

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
  clockRunningNoRace()
  {
    let currentTime:any = new Date()
    let timeElapsed:any = new Date(currentTime - this.timeBegan - this.stoppedDuration)

    let sec = timeElapsed.getUTCSeconds()
    let min = timeElapsed.getUTCMinutes();
    if (sec<10)
      this.time = min + ":0" +  sec;
    else
      this.time = min + ":" +  sec;
  };   

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
  
  clockRunningCountdown()
  {
    let currentTime:any = new Date()
    let timeElapsed:any = new Date(currentTime - this.timeBegan - this.stoppedDuration)

    let sec = timeElapsed.getUTCSeconds()
    sec = this.maxLapTime - sec; 
    this.time =
    this.zeroPrefix(sec, 0);

    //now we need to check if countdown race finished
    if ((sec == 0 )&&(this.running))
    {
        //Activate finish line animation
        let string = 'F';
        let array = new Uint8Array(string.length);
        for (let i = 0, l = string.length; i < l; i ++) {
          array[i] = string.charCodeAt(i);
        } 

        this.ble.writeWithoutResponse(this.trainID, TRAINER_SERVICE_UUID, TRAINER_CHAR_UUID, array.buffer).then(
          () => {          
            if(isLogEnabled) 
            { 
              console.log("sending settings to trainer clockRunningCountdown");
              console.log(this.trainID);
            }  
          },
          error => { 
            if(isLogEnabled) 
              console.error('Error sending date, disconnecting.', error);
            clearInterval(this.get_duration_interval);
            this.navCtrl.navigateBack('scanner');
            }
        );  
        
        this.reset();
        if(isLogEnabled) {
          console.log("Settings maxLapTime = this.InitialMaxLapTime");
          console.log(this.InitialMaxLapTime);
        }  

        this.maxLapTime = this.InitialMaxLapTime;
        this.BestLapTimeString=  (this.LapsCount-1).toString();
        //Save best lap time in case we switch to other race type and then go back
        this.BestLapTimeCountString = this.BestLapTimeString; 
        if(isLogEnabled) console.log(" this.BestLapTimeCountString: "+ this.BestLapTimeCountString);

        this.doBlinkColor("#FFF","#000");          
        this.LapTimeString = this.time;
        this.doVibrationFor(2000);
        this.stop();
        this.time = "FINSH";
        this.LapsCount = 1;
        this.running = false;
     
  
    }        


    

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
    if(isLogEnabled) console.log('Array we got from BLE: ',data);
    //Transfor the buff array to a 5 digit number
    
    var lapData= data[2]*256*256+data[1]*256+data[0];
   // lap-number|| lap second X 10  || lap second X 1 || lap second / 10 ||   lap second / 100 ||
    var lapBLE = Math.round(lapData/10000)
    if(isLogEnabled) console.log('Lap: ',lapBLE);
    
    var lapTimeBLE = Math.round(lapData%10000)/100;
    if(isLogEnabled) console.log('Time: ',lapTimeBLE);
    
    //In best lap and countdown races we start the clock only once the car passes the start line
    if ( (this.RaceType=='lap')||(this.RaceType=='countdown') )
    {
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
        if (this.RaceType=='countdown')
        {
          this.maxLapTime = this.InitialMaxLapTime;
          this.started = setInterval(this.clockRunningCountdown.bind(this), 108);
        }  
        else
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
        if (this.RaceType=='lap')
        {
            //Check for best lap
          if ((lapTimeBLE < this.BestLapTimeLap)||(this.BestLapTimeLap==0))
          {
            this.BestLapTime= lapTimeBLE;
            this.BestLapTimeString= lapTimeBLE.toString();
            //check if there is no decimal point
            if ( this.BestLapTimeString.indexOf('.')<1)
              this.BestLapTimeString =  this.BestLapTimeString + '.00';
            //Save best lap time in case we switch to other race type and then go back
            this.BestLapTimeLapString = this.BestLapTimeString; 
            this.BestLapTimeLap = this.BestLapTime;

            this.doVibrationFor(200);
            setTimeout(() => {
              this.doVibrationFor(200);
            },200);    
            lapType = 'B';  
            this.BestLapId = this.LapsCount - 1;
          }
          else
          {
            this.doVibrationFor(200);
            lapType = 'R';  
          }  

          //Update laps array
          var SingleLapTime = 
          { 
            id: this.LapsCount-1, 
            time: lapTimeBLE, 
            lapType: lapType
          }; 
          this.LapTimes.push(SingleLapTime);
          if(isLogEnabled) console.log("pushing lap times");
          if(isLogEnabled) console.log(this.LapTimes);


          //Send score lights command to trainer

          // Z -> start race
          // Y -> end race
          // L -> Leds command
          // F -> like L but Final lap
          let string = 'L';
          if (this.LapsCount==9)
            string = 'F'; 
          string = string +  this.LapsCount + lapType;

          let array = new Uint8Array(string.length);
          for (let i = 0, l = string.length; i < l; i ++) {
            array[i] = string.charCodeAt(i);
          } 
  
          this.ble.writeWithoutResponse(this.trainID, TRAINER_SERVICE_UUID, TRAINER_CHAR_UUID, array.buffer).then(
            () => {  
              if(isLogEnabled) {         
                console.log("sending settings to trainer");
                console.log(this.trainID);
              }  
            },
            error => { 
              if(isLogEnabled) 
                console.error('Error sending date, disconnecting.', error);
              clearInterval(this.get_duration_interval);
              this.navCtrl.navigateBack('scanner');
              }
          );   
  

          this.reset();
          //Race still on?
          if (this.LapsCount<9)
          {
            this.timeBegan = new Date();
            this.started = setInterval(this.clockRunning.bind(this), 108);
            this.running = true;
            //this.LapsCount++;
          }  
          else
          {
            //Race finished       Type: LAP
            this.doBlinkColor("#FFF","#000");          
            this.LapTimeString = this.time;
            this.doVibrationFor(2000);
            this.stop();
            this.time = "FINSH";
            this.LapsCount = 1;
            this.running = false;
            this.LapStatsShow = true;

          }
        }

        if ((this.RaceType=='countdown')&&(this.running))
        {
            this.reset();
              let string = 'L';
            //If we are on the 16 lap end the race
            if (this.LapsCount<17)
            {
              //Restart lap time
              this.maxLapTime =  this.maxLapTime - 1;
              this.timeBegan = new Date();
              this.started = setInterval(this.clockRunningCountdown.bind(this), 108);
              this.running = true;
              this.doVibrationFor(200);

            }
            else
            {
              this.maxLapTime = this.InitialMaxLapTime;
              this.BestLapTimeString= (this.LapsCount-1).toString();
              string = 'F';
              this.doBlinkColor("#FFF","#000");          
              this.LapTimeString = this.time;
              this.doVibrationFor(2000);
              this.stop();
              this.time = "FINSH";
              this.LapsCount = 1;
              this.running = false;

              //Save best lap time in case we switch to other race type and then go back
              this.BestLapTimeCountString = this.BestLapTimeString; 
              if(isLogEnabled) console.log(" this.BestLapTimeCountString: "+ this.BestLapTimeCountString);
            }
            //Send lap data to trainer
            string = string +  this.LapsCount;
            let array = new Uint8Array(string.length);
            for (let i = 0, l = string.length; i < l; i ++) {
              array[i] = string.charCodeAt(i);
            } 
    
            this.ble.writeWithoutResponse(this.trainID, TRAINER_SERVICE_UUID, TRAINER_CHAR_UUID, array.buffer).then(
              () => {           
                if(isLogEnabled) 
                {
                  console.log("sending settings to trainer");
                  console.log(this.trainID);
                }  
              },
              error => { 
                if(isLogEnabled) 
                  console.error('Error sending date, disconnecting.', error);
                clearInterval(this.get_duration_interval);
                this.navCtrl.navigateBack('scanner');
                }
            );   

        }
        return;
      }  
  }
  else
  {
    //If we are here this is a drag race, actually there is no need to check it again
    if (this.RaceType=="drag")
    {
      if(isLogEnabled) 
      {
        console.log('this.running '+this.running);
        console.log('lapBLE '+lapBLE);
        console.log('this.LapsCount '+this.LapsCount);
      }  
      if((this.running)&&(lapBLE >= this.LapsCount))
      {
        //Race finished      
        this.doBlinkColor("#FFF","#000");          
        this.LapTimeString = this.time;

        this.BestLapTime= lapTimeBLE;
        this.BestLapTimeString= lapTimeBLE.toString();
        //check if there is no decimal point
        if ( this.BestLapTimeString.indexOf('.')<1)
          this.BestLapTimeString =  this.BestLapTimeString + '.00';
        
        //Save best lap time in case we switch to drag and then go back
        this.BestLapTimeDragString = this.BestLapTimeString; 
        this.BestLapTimeDrag = this.BestLapTime;

        this.doVibrationFor(2000);
        this.stop();
        this.time = "FINSH";
        this.LapsCount = 1;
        this.running = false;


        //Send score lights command to trainer
        if ( this.trainID.length>2 )
        {
            // F -> Final lap
            let string = 'F';
            string = string +  this.LapsCount + lapType;

            let array = new Uint8Array(string.length);
            for (let i = 0, l = string.length; i < l; i ++) {
              array[i] = string.charCodeAt(i);
            } 

            this.ble.writeWithoutResponse(this.trainID, TRAINER_SERVICE_UUID, TRAINER_CHAR_UUID, array.buffer).then(
              () => {        
                if(isLogEnabled) 
                {   
                  console.log("sending settings to trainer");
                  console.log(this.trainID);
                }  
              },
              error => { 
                if(isLogEnabled) 
                  console.error('Error sending date, disconnecting.', error);
                clearInterval(this.get_duration_interval);
                this.navCtrl.navigateBack('scanner');
                }
            );   
        }    


      }
      
    }  

  }    
}


// start the BLE scan
async startBleScan()
{ 
  if (this.alreadyConnected==false)
  {
      this.loadingController.create({
        message: 'Searching for finish line....',
        duration: 6000
      }).then((response) => {
        response.present();
        response.onDidDismiss().then((response) => {
          if(isLogEnabled) console.log('Loader dismissed', response);
        });
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
                      //Dissmiss loader
                      this.loadingController.dismiss().then((response) => {
                        if(isLogEnabled) console.log('Loader closed!', response);
                      }).catch((err) => {
                        if(isLogEnabled) console.log('Error occured : ', err);
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
              //Dissmiss loader
              this.loadingController.dismiss().then((response) => {
                if(isLogEnabled) console.log('Loader closed!', response);
              }).catch((err) => {
                if(isLogEnabled) console.log('Error occured : ', err);
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
  } 

// connect to a device
connectToDevice(device) 
{    
  this.alreadyConnected=false;
  this.ble.disconnect(device.id).then(() => {
    if(isLogEnabled) console.debug("Disconnect success");
   })
.catch(error => {
  if(isLogEnabled) console.error("Disconnect  error:", error);
});

  if(isLogEnabled) console.log('connect to device to '+device.name+'.');
  this.showToast('Connecting to '+device.name+' ...', 'medium', 2000, 'bottom');
  if(isLogEnabled) console.log('this.ble now');
  setTimeout(() => {
    if(isLogEnabled) console.log('INSIDE this.ble now - attempt 1');
    this.ble.connect(device.id).subscribe(
      (success) => {
        if (device.name == "train")
        {
          this.trainID = device.id;
          if(isLogEnabled) console.log('Connected to TRAIN saving id: '+device.id+'.');
        }       
        this.alreadyConnected=true;
        //Dissmiss loader
        this.loadingController.dismiss().then((response) => {
          if(isLogEnabled) console.log('Loader closed!', response);
        }).catch((err) => {
          if(isLogEnabled) console.log('Error occured : ', err);
        });   
      },
      (error) => {
        if(isLogEnabled) console.log('INSIDE ble error ');
        this.alreadyConnected=false;
      }
    );             
  },100);

    setTimeout(() => 
    {
      if (this.alreadyConnected!=true)
      {
        if(isLogEnabled) console.log('INSIDE this.ble now - attempt 2');

        this.ble.connect(device.id).subscribe(
          (success) => {
            if (device.name == "train")
            {
              //If train save id
              this.trainID = device.id;
              if(isLogEnabled) console.log('Connected to TRAIN saving id: '+device.id+'.');
            }
            this.alreadyConnected=true;
            //Dissmiss loader
            this.loadingController.dismiss().then((response) => {
              if(isLogEnabled) console.log('Loader closed!', response);
            }).catch((err) => {
              if(isLogEnabled) console.log('Error occured : ', err);
            });               
          },
          (error) => {
            if(isLogEnabled)  console.log('INSIDE ble error ');
            this.alreadyConnected=false;
          }
        );             
      }  
    },2000);
    setTimeout(() => 
    {
      if (this.alreadyConnected!=true)
      {
        if(isLogEnabled) console.log('INSIDE this.ble now - attempt 3');
        this.ble.connect(device.id).subscribe(
          (success) => {
            if (device.name == "train")
            {
              //If train save id
              this.trainID = device.id;
              if(isLogEnabled) console.log('Connected to TRAIN saving id: '+device.id+'.');
            }
            this.alreadyConnected=true;
            //Dissmiss loader
            this.loadingController.dismiss().then((response) => {
              if(isLogEnabled) console.log('Loader closed!', response);
            }).catch((err) => {
              if(isLogEnabled) console.log('Error occured : ', err);
            });               
          },
          (error) => {
            if(isLogEnabled) console.log('INSIDE ble error ');
            this.alreadyConnected=false;
          }
        );             
      }  
    },4000);
} 




  // show the location enable alert
  async showLocationEnableAlert(title, message) 
  {
    let alert = await this.alertController.create({
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

  async showBluetoothEnableAlert(title, message) 
  {               
    let alert = await this.alertController.create({
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


  
  async checkIfGameIsRunning(gameType) {

    //Alert if a game is already running and the user clicks on start a new game
    if (this.running==false)
      this.start(gameType);
    else
    {
        const alert = await this.alertController.create({
          cssClass: 'my-custom-class',
          header: 'New Race?',
          message: 'A race is <strong>already running</strong>',
          buttons: [
            {
              text: 'Continue Race',
              role: 'cancel',
              cssClass: 'secondary',
              handler: (blah) => {
                console.log('Confirm Cancel');
                this.menuShow = false;
              },
            },
            {
              text: 'Start New',
              handler: () => {
                console.log('Confirm Okay');
                this.start(gameType);
              },
            },
          ],
        });

        await alert.present();
      }    
  }

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

      if(device.name === 'train')
      {
        //this.scannedDevices.push(scannedDevice);
        this.connectToDevice(scannedDevice)
      }
    });

    if(isLogEnabled) console.log('Scanned device  : '+ JSON.stringify(scannedDevice));  
  }

  private listenToGamepad() {
    this.gamepad.connect()
      .subscribe(() => {

        if(isLogEnabled) console.log('gamepad conencted');
        
        this.gamepad.after('button0')
          .subscribe(() => console.log('button0'));
/*
        this.gamepad.after('select')
          .subscribe(() => ...);

        this.gamepad.after('start')
          .subscribe(() => ...);

        this.gamepad.on('right')
          .pipe(bufferCount(10))
          .subscribe(() => ...);

        this.gamepad.on('right0')
          .pipe(bufferCount(10))
          .subscribe(() => ...);

        this.gamepad.on('right1')
          .pipe(bufferCount(10))
          .subscribe(() => ...);
          */
      })
  }


}
