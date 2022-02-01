import { Component, ElementRef, AfterViewInit, NgZone, ViewChild } from '@angular/core';
import { NavController, AlertController, ToastController, GestureConfig} from '@ionic/angular';
import { ActivatedRoute} from "@angular/router";
import { Platform } from '@ionic/angular'; 
import { BLE } from '@ionic-native/ble/ngx';
import { DeviceMotion, DeviceMotionAccelerationData } from '@awesome-cordova-plugins/device-motion/ngx';

import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import { Gesture, GestureController } from '@ionic/angular';

declare const NavigationBar: any;
//NavigationBar.backgroundColorByHexString("#FF0000", true);
NavigationBar.hide();


const CUSTOM_SERVICE_UUID       = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
const LEDS_STATES_CHAR_UUID     = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';

const isLogEnabled = true

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements AfterViewInit {
  @ViewChild('gas', { static: true, read: ElementRef }) gas: ElementRef;

  //Timer Varaibles
  public timeBegan = null
  public timeStopped:any = null
  public stoppedDuration:any = 0
  public started = null
  public running = false
  public blankTime = "00.00"
  public time = "00.00"

  //Gauges variable
  
  //Slide should be at the middle
  gasLevel : number = 150;
  GasValue : number = 150;

  RPMValue : number = 0;
  TempValue  : number = 0;
  FuelValue  : number = 0;

  LapTime : number = 0;
  BestLapTime : number = 0;
  
  CompleteAnimationFlag  : number = 0;
  
  AnimationDuration : number = 700; 
  ProgressBarColor : string = "#ffffff";
  TempColor  : string = "#000";
  FuelColor  : string = "#000";


  get_duration_interval: any;

  gauge_interval: any;

  connectedDevice : any = {}; 
  
  steeringLevel : number = 0;
  private gesture;

  speed : number = 0;
  steering : number = 0;
  constructor(  private ble: BLE,
                private deviceMotion: DeviceMotion,    
                public  navCtrl: NavController,  
                private route: ActivatedRoute, 
                private alertCtrl: AlertController,      
                private toastCtrl: ToastController,
                public  platform: Platform,
                private screenOrientation: ScreenOrientation,
                private gestureCtrl: GestureController,
                private ngZone: NgZone ) 
                {
                  this.platform.ready().then(() => {
                    this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.LANDSCAPE);
                    });
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

                ngAfterViewInit(): void {
                  this.gesture = this.gestureCtrl.create({
                    gestureName: 'doubleTap',
                    el: this.gas.nativeElement,
                    threshold: 0,
                    onMove: ev => { this.onMove(ev); },
                    onStart: ev => { this.onStart(ev); },
                    onEnd: ev => { this.onEnd(ev); },
                  }, true);
                
                  this.gesture.enable();
                  
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
    onMove(ev){
      console.log(ev.currentY);
      this.gasLevel = ev.currentY;
      //this.RPMValue = 1000-ev.currentY*3;
    }
    onStart(ev){
      console.log(ev.currentY);
      this.gasLevel =  ev.currentY;
      //this.RPMValue =  1000-ev.currentY*3;
    }   
    onEnd(ev){
      console.log("00");
      this.gasLevel = 150;
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
    if(isLogEnabled) console.error('Error connecting to '+device.name+'.');
    this.showToast('Error connecting to '+device.name,'danger',2000,'bottom');
   
    if(isLogEnabled) console.info('navigating back to [scanner] page.');
    this.navCtrl.navigateBack('scanner');
  }
 
 
  sendBLE() : any
  {
              
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
    

    //====Fuel and temp managment======        
    
    if (this.RPMValue>700)
    {
      this.FuelValue = this.FuelValue - 10.5;      
      if (this.TempValue<175)
        this.TempValue = this.TempValue + 0.25;
    }  
    else
    {
      if (this.RPMValue>500)
      {
        this.FuelValue = this.FuelValue - 0.3;      
        if (this.TempValue<175)
          this.TempValue = this.TempValue + 0.1;
      }  
      else  
      {
        if (this.RPMValue<300)
        {
          this.FuelValue = this.FuelValue - 0.2;      
          if(this.TempValue>90)
            this.TempValue = this.TempValue - 0.2;
        }  
        else
        {
          if (this.RPMValue<500)
          {
            if (this.RPMValue>50)
              this.FuelValue = this.FuelValue - 0.1;      
            if (this.TempValue>90)
              this.TempValue = this.TempValue - 0.2;
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
    if ((1000 - this.gasLevel*3.3)<0)
      this.GasValue = 0;
    else
      this.GasValue =  1000 - this.gasLevel*3.3;


    //Map rpm gauge

    if (this.gasLevel<150)
    { //Forward
      this.ProgressBarColor = "#327ac0"; 
      this.RPMValue =  (500 - this.gasLevel*3.3)*2;
      //this.RPMValue = this.gasLevel;
    }  
    else  
    {  
      //Backward      
      
      if (this.gasLevel==150)
      {
        this.ProgressBarColor = "#ffffff";
        this.RPMValue = 0;        
      }  
      else
      {


        //Limit to 1000
        if (((500 - this.gasLevel*3.3)*-2)>1000)
          this.RPMValue = 1000;
        else
          this.RPMValue =   (500 - this.gasLevel*3.3)*-2
        
        //this.RPMValue = this.gasLevel;
        this.ProgressBarColor = "#FF0000";
      }
    }      

   
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

  async FuelCick()
  {
    this.CompleteAnimationFlag=0;
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
    if(this.running) return;
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
