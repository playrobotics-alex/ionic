import { Component, OnInit } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  public NitroMultiplier = 50;

  constructor(private storage: Storage) { }

  ngOnInit() {
    this.storage.get("NitroMultiplier").then((value) => {
      this.NitroMultiplier = value;
      console.log('NitroMultiplierStorage', this.NitroMultiplier);

  });
  }


  onNitroChange(event){
    this.storage.set('NitroMultiplier', event.target.value); 
    console.log(event.target.value);
  }
}
