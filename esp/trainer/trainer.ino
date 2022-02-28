
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Tone32.h>
#define BUZZER_PIN 14
#define BUZZER_CHANNEL 1

#include <TM1637TinyDisplay.h>
// Define Digital Pins
#define CLK 23
#define DIO 4
TM1637TinyDisplay display(CLK, DIO);

#include "FastLED.h"
#define NUM_LEDS 30
#define DATA_PIN 33


// Define the array of leds
CRGB leds[NUM_LEDS];
CRGB leds_saving[NUM_LEDS];

int sensor_start_value;
int sensor_min_value;
bool raceIsOn = false;
int lap_counter = 0;

char RaceType = 'A';

unsigned long startMillis;
unsigned long currentMillis;
unsigned long elapsedMillis;
unsigned long CarLeaveFinishMillis;
// ===================BLE start=================

BLECharacteristic *pCharacteristic;
bool deviceConnected = false;
uint8_t txValue = 50;

// See the following for generating UUIDs:
// https://www.uuidgenerator.net/

#define SERVICE_UUID           "7E400001-B5A3-F393-E0A9-E50E24DCCA9E" // UART service UUID
#define CHARACTERISTIC_UUID_RX "7E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_TX "7E400003-B5A3-F393-E0A9-E50E24DCCA9E"

void showStrip() {
 #ifdef ADAFRUIT_NEOPIXEL_H
   // NeoPixel
   strip.show();
 #endif
 #ifndef ADAFRUIT_NEOPIXEL_H
   // FastLED
   FastLED.show();
 #endif
}

void setPixel(int Pixel, byte red, byte green, byte blue) {
   // FastLED
   leds[Pixel].r = red;
   leds[Pixel].g = green;
   leds[Pixel].b = blue;
}

void setAll(byte red, byte green, byte blue) {
  for(int i = 0; i < NUM_LEDS-3; i++ ) {
    setPixel(i, red, green, blue);
  }
  showStrip();
}

void theaterChase(byte red, byte green, byte blue, int SpeedDelay) {
  for (int j=0; j<10; j++) {  //do 10 cycles of chasing
    for (int q=0; q < 3; q++) {
      for (int i=0; i < NUM_LEDS-3; i=i+3) {
        setPixel(i+q, red, green, blue);    //turn every third pixel on
      }
      showStrip();
     
      delay(SpeedDelay);
     
      for (int i=0; i < NUM_LEDS-3; i=i+3) {
        setPixel(i+q, 0,0,0);        //turn every third pixel off
      }
    }
  }
}
void FadeInOut(byte red, byte green, byte blue){
  float r, g, b;
     
  for(int k = 0; k < 256; k=k+1) {
    r = (k/256.0)*red;
    g = (k/256.0)*green;
    b = (k/256.0)*blue;
    setAll(r,g,b);
    showStrip();
  }
     
  for(int k = 255; k >= 0; k=k-2) {
    r = (k/256.0)*red;
    g = (k/256.0)*green;
    b = (k/256.0)*blue;
    setAll(r,g,b);
    showStrip();
  }
}

void colorWipe(byte red, byte green, byte blue, int SpeedDelay) {
  for(uint16_t i=0; i<NUM_LEDS; i++) {
      setPixel(i, red, green, blue);
      showStrip();
      delay(SpeedDelay);
  }
}

String getValue(String data, char separator, int index)
{
    int found = 0;
    int strIndex[] = { 0, -1 };
    int maxIndex = data.length() - 1;

    for (int i = 0; i <= maxIndex && found <= index; i++) {
        if (data.charAt(i) == separator || i == maxIndex) {
            found++;
            strIndex[0] = strIndex[1] + 1;
            strIndex[1] = (i == maxIndex) ? i+1 : i;
        }
    }
    return found > index ? data.substring(strIndex[0], strIndex[1]) : "";
}

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      tone(BUZZER_PIN, NOTE_C2, 100, BUZZER_CHANNEL);
      noTone(BUZZER_PIN, BUZZER_CHANNEL);
      tone(BUZZER_PIN, NOTE_G5, 100, BUZZER_CHANNEL);
      noTone(BUZZER_PIN, BUZZER_CHANNEL);

      Serial.println("Connected");
      for(int i=0;i<16;i++)
        leds[i] = CRGB::Blue;
      FastLED.show();
      deviceConnected = true;


    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      //Turn off lights
      for(int i=0;i<16;i++)
        leds[i] = CRGB::Black;
      FastLED.show();

      delay(500); // give the bluetooth stack the chance to get things ready
      pServer->startAdvertising(); // restart advertising
      Serial.println("start advertising");
      Serial.println("Waiting a client...");
  
    }
};

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      std::string rxValue = pCharacteristic->getValue();
        Serial.println("GOT something");
          // A -> start race LAP
          // D -> start race DRAG
          // C -> start race COUNTDOWN
        // Y -> end race
        if ((rxValue[0]=='A')||(rxValue[0]=='D')||(rxValue[0]=='C'))
        {          
          RaceType = rxValue[0];
          Serial.println("Race type: ");
          Serial.print(RaceType);
          raceIsOn = true;
          lap_counter = 0;
          Serial.println("GOT DATA -> Staring race");

           CarLeaveFinishMillis=0;
          //Calibrate the sensor
          sensor_min_value = 1000;
          for (int i=0;i<10;i++)
          {
            int sensorValue = analogRead(35);
            if (sensorValue<sensor_min_value)
                sensor_min_value = sensorValue;
            delay(20);
          }
          Serial.print("Minimum sensor value: ");
          Serial.println(sensor_min_value);
          //Start sequence

          //==4==
          display.showString("-3-");
          Serial.println("-3-");
          for(int i=0;i<16;i++)
            leds[i] = CRGB::Red;
          FastLED.show();

          tone(BUZZER_PIN, NOTE_B4, 250, BUZZER_CHANNEL);
          noTone(BUZZER_PIN, BUZZER_CHANNEL);


          delay(750);

                    
          //==3==
          display.showString("-2-");
          Serial.println("-2-");
          tone(BUZZER_PIN, NOTE_B4, 250, BUZZER_CHANNEL);
          noTone(BUZZER_PIN, BUZZER_CHANNEL);
          delay(750);
          
          //==2==
          display.showString("-1-");
          Serial.println("-1-");
          for(int i=0;i<16;i++)
            leds[i] = CRGB::Yellow;
          FastLED.show();
          tone(BUZZER_PIN, NOTE_B4, 250, BUZZER_CHANNEL);
          noTone(BUZZER_PIN, BUZZER_CHANNEL);
          delay(1000);          
          //==1==
   
          tone(BUZZER_PIN, NOTE_G5, 250, BUZZER_CHANNEL);
          noTone(BUZZER_PIN, BUZZER_CHANNEL);
          
          for(int i=0;i<16;i++)
            leds[i] = CRGB::Green;
          FastLED.show();
          
          //Start the time
          startMillis = millis();
          // Demo Horizontal Level Meter
          for (int count = 0; count < 3; count++) {
            for (int x = 0; x <= 100; x = x + 10) {
              display.showLevel(x, true);
              delay(1);
            }
            for (int x = 100; x >= 0; x = x - 10) {
              display.showLevel(x, true);
              delay(1);
            }
          }


          //Lights off during the race
          for(int i=0;i<16;i++)
            leds[i] = CRGB::Black;
          FastLED.show();

        }
        else if (rxValue[0]=='L')
        {                     
          String led_string = getValue(rxValue.c_str(), 'L', 1);
          String led_string2;

          if(led_string.indexOf("B") > 0)          
            led_string2 = getValue(led_string, 'B', 0);
          else          
            led_string2 = getValue(led_string, 'R', 0);
                      
          int led_int = led_string2.toInt() -2 ;

          //We will be getting: 'L' + Lap number + lapType (B/R);
          if (rxValue[2]=='B')
          {
            leds[led_int] = CRGB::Yellow;
            leds[led_int+8] = CRGB::Yellow;            
          }
          else
          {
            leds[led_int] = CRGB::Green;
            leds[led_int+8] = CRGB::Green;           
          }                 
          FastLED.show();
        }
        else if (rxValue[0]=='F') // F -> like L but final lap
        {                     
          String led_string = getValue(rxValue.c_str(), 'F', 1);
          String led_string2;

          if(led_string.indexOf("B") > 0)          
            led_string2 = getValue(led_string, 'B', 0);
          else          
            led_string2 = getValue(led_string, 'R', 0);
                      
          int led_int = led_string2.toInt() -2 ;

          //We will be getting: 'L' OR 'F' + Lap number + lapType (B/R);
          if (rxValue[2]=='B')
          {
            leds[led_int] = CRGB::Yellow;
            leds[led_int+8] = CRGB::Yellow;            
          }
          else
          {
            leds[led_int] = CRGB::Green;
            leds[led_int+8] = CRGB::Green;           
          }                 
          FastLED.show();
          //Since this is the final lap we need to play Finish sequence


          //If this is a LAP race after the end sequence we will show again the laps colors at the end
          if (RaceType == 'A')
          {
            //Save the array
            for (int i = 0; i <= 16; i++) 
              leds_saving[i] = leds[i];

            //Play finish sequence
            theaterChase(0xff,0xff,0xff,50);
  
            //Restore the array
            for (int i = 0; i <= 16; i++) 
              leds[i] = leds_saving[i];
            delay(2000);          
            FastLED.show();              
            Serial.println("Restoring");
          }
          else
            theaterChase(0xff,0xff,0xff,50);
        }
 
 

  
    }
};


// ===================BLE end


void setup() {
   Serial.begin(9600);      
    ledcAttachPin(14, 0);

  // Create the BLE Device
    BLEDevice::init("train"); // Name must not be longer than 5 chars!!!
    
    // Create the BLE Server
    BLEServer *pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());
  
    // Create the BLE Service
    BLEService *pService = pServer->createService(SERVICE_UUID);
    
    // Create a BLE Characteristic
    pCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_UUID_TX,
                        BLECharacteristic::PROPERTY_NOTIFY|BLECharacteristic::PROPERTY_READ|BLECharacteristic::PROPERTY_WRITE
                      );
   int moshe=0;  
   pCharacteristic->setValue(moshe);
    
    BLE2902 *desc = new BLE2902();
    desc->setNotifications(true);
    pCharacteristic->addDescriptor(desc);
    
    BLECharacteristic *pCharacteristic = pService->createCharacteristic(
                                           CHARACTERISTIC_UUID_RX,
                                           BLECharacteristic::PROPERTY_READ |
                                           BLECharacteristic::PROPERTY_WRITE | 
                                           BLECharacteristic::PROPERTY_NOTIFY
                                         );
 
                                         
    pCharacteristic->setReadProperty(true);
    pCharacteristic->setCallbacks(new MyCallbacks());
  
    // Start the service
    
    pService->start();
    pServer->getAdvertising()->addServiceUUID(SERVICE_UUID);
    // Start advertising
    pServer->getAdvertising()->start();
    Serial.println(pService->getUUID().toString().c_str());
    Serial.println("Waiting a client1");


  
    FastLED.addLeds<NEOPIXEL, DATA_PIN>(leds, NUM_LEDS);  // GRB ordering is assumed
    FastLED.setBrightness(20);
  
    colorWipe(0x00,0xff,0x00, 40);
    colorWipe(0x00,0x00,0x00, 40);
    
    tone(BUZZER_PIN, NOTE_B4, 100, BUZZER_CHANNEL);
    noTone(BUZZER_PIN, BUZZER_CHANNEL);

    tone(BUZZER_PIN, NOTE_G3, 100, BUZZER_CHANNEL);
    noTone(BUZZER_PIN, BUZZER_CHANNEL);

    tone(BUZZER_PIN, NOTE_B5, 100, BUZZER_CHANNEL);
    noTone(BUZZER_PIN, BUZZER_CHANNEL);

    tone(BUZZER_PIN, NOTE_A3, 100, BUZZER_CHANNEL);
    noTone(BUZZER_PIN, BUZZER_CHANNEL);

    //Startup blink animation
    display.setBrightness(BRIGHT_7);
    display.showString("HELLO PLAYROBOTICS");
    delay(1000);
    //display.clear();
    display.showString("PLAY");

}

int searchAnimationCounter =16;

void loop() {
  if (deviceConnected==false)
  {
    //Searching animation
    
    //Reset counter
    if (searchAnimationCounter==16)
    {
        searchAnimationCounter=0;
        leds[searchAnimationCounter] = CRGB::Blue;
        FastLED.show();
        delay(200);  
    }   
    //Change led to next one
    leds[searchAnimationCounter] = CRGB::Black;
    searchAnimationCounter++;
    leds[searchAnimationCounter] = CRGB::Blue;
    FastLED.show();
    delay(200);  
  }
  else
  {
    //During the race we will be chcking the sensor and updateing BLE value
  
    if (raceIsOn)
    {
      int sensorValue = analogRead(35);
      
      //Serial.println(lap_counter++);
      currentMillis = millis();      

      //Lap Time  
      elapsedMillis = (currentMillis - startMillis);

      //We need to make sure at least 1 second from the previous lap
      if ((sensorValue + 150 < sensor_min_value )&&(elapsedMillis>1000)&&((currentMillis-CarLeaveFinishMillis)>1000))
      {
        //We have a lap!
        //reset time
        startMillis = millis();   

        Serial.print("We have a lap! count: ");
        lap_counter++;
        Serial.println(lap_counter);
        //Build the BLE string we are going to send by digits 1)lap number 2) time in miliseconds (without the last digit) 

        //60 seconds is the max
        if (elapsedMillis>59999)
            elapsedMillis=59999;

        int moshe = lap_counter*10000;
        moshe = moshe + elapsedMillis/10;    
        
        pCharacteristic->setValue(moshe);
        pCharacteristic->notify();
        int elapsedSeconds = elapsedMillis/10;
        //If this is a drag race we want to show the time during the first lap as well
        if ((lap_counter>1)||(RaceType=='D'))
          display.showNumberDec(elapsedSeconds, (0x80 >> 1), false);
        
      }

      //We need to check if we had at least one second when there was no car at the sensor so we save the time sensor felt it for the last time 
      if ((sensorValue + 150 < sensor_min_value))
        CarLeaveFinishMillis = currentMillis; 

      
    }
  }
  delay(10);


}
