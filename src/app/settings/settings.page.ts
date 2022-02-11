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


  constructor(private storage: Storage) { }

  ngOnInit() {
    this.storage.get("IndoorLightsToggle").then((value) => {
      this.IndoorLightsToggle = value;
      console.log('IndoorLightsToggle', this.IndoorLightsToggle);

    });
    this.storage.get("SlowFuelToggle").then((value) => {
      this.SlowFuelToggle = value;
      console.log('SlowFuelToggle', this.SlowFuelToggle);

    });
    this.storage.get("SlowHeatToggle").then((value) => {
      this.SlowHeatToggle = value;
      console.log('SlowHeatToggle', this.SlowHeatToggle);

    });  
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
