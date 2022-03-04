import { Component, OnInit } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  public NitroMultiplier = 50;
  public IndoorLightsToggle = true;
  public SlowHeatToggle = true;
  public SlowFuelToggle = true;
  public AccSteeringToggle = false;

  public TrimValue = 0;
  public InitialMaxLapTime = 20;


  constructor(private storage: Storage) { }

  ngOnInit() {
    this.storage.get("IndoorLightsToggle").then((value) => {
      this.IndoorLightsToggle = value;
      console.log('IndoorLightsToggle', this.IndoorLightsToggle);

    });
    this.storage.get("AccSteeringToggle").then((value) => {
      this.AccSteeringToggle = value;
      console.log('AccSteeringToggle', this.AccSteeringToggle);

    });    
    this.storage.get("SlowFuelToggle").then((value) => {
      this.SlowFuelToggle = value;
      console.log('SlowFuelToggle', this.SlowFuelToggle);

    });
    this.storage.get("SlowHeatToggle").then((value) => {
      this.SlowHeatToggle = value;
      console.log('SlowHeatToggle', this.SlowHeatToggle);

    });  
    this.storage.get("TrimValue").then((value) => {
      this.TrimValue = value;
      console.log('TrimValue', this.TrimValue);
    });      
    this.storage.get("InitialMaxLapTime").then((value) => {
      this.InitialMaxLapTime = value;
      console.log('InitialMaxLapTime', this.InitialMaxLapTime);
    });      
  }

  onRangeChange(event:any){
    console.log('TrimValue changed: ', event.detail.value);
    this.storage.set('TrimValue', event.detail.value); 
    this.TrimValue = event.detail.value;
  }

  onRangeChangeCountdown(event:any){
    console.log('InitialMaxLapTime changed: ', event.detail.value);
    this.storage.set('InitialMaxLapTime', event.detail.value); 
    this.InitialMaxLapTime = event.detail.value;
  }  
  OnIndoorLightsToggleChange(event,toggleValue){
    console.log('IndoorLightsToggle toggleValue._value: ', toggleValue);
    let i=true;
    if(toggleValue==true){
      i=true;
    }else if(toggleValue==false){
      i=false;
    }
    this.storage.set('IndoorLightsToggle', i); 
  }

  OnAccSteeringToggleChange(event,toggleValue){
    console.log('AccSteeringToggle toggleValue._value: ', toggleValue);
    let i=true;
    if(toggleValue==true){
      i=true;
    }else if(toggleValue==false){
      i=false;
    }
    this.storage.set('AccSteeringToggle', i); 
  }  

  OnSlowFuelToggleChange(event,toggleValue){
    console.log('SlowFuelToggle toggleValue._value: ', toggleValue);
    let i=true;
    if(toggleValue==true){
      i=true;
    }else if(toggleValue==false){
      i=false;
    }
    this.storage.set('SlowFuelToggle', i);     
  }
  
  OnSlowHeatToggleChange(event,toggleValue){
      console.log('SlowHeatToggle toggleValue._value: ', toggleValue);
    let i=true;
    if(toggleValue==true){
      i=true;
    }else if(toggleValue==false){
      i=false;
    }
    this.storage.set('SlowHeatToggle', i);         
  }  
}
