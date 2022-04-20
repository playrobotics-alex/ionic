
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
#define NUM_LEDS 120
#define DATA_PIN 33


// Define the array of leds
CRGB leds_array[NUM_LEDS];
CRGB leds_saving[NUM_LEDS];

int got_start= false;
int sensor_start_value;
int sensor_min_value;
bool raceIsOn = false;
int lap_counter = 0;

char RaceType = 'A';
int InitialMaxLapTime;
int LapTimeLeft;
int LapTimeLeftPreviousSecond;
std::string rxValue;
std::string testrxValue="bb";

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
   leds_array[Pixel].r = red;
   leds_array[Pixel].g = green;
   leds_array[Pixel].b = blue;
}

void setAll(byte red, byte green, byte blue) {
  //replacing NUM_LEDS with 16
  for(int i = 0; i < 16-3; i++ ) {
    setPixel(i, red, green, blue);
  }
  showStrip();
}

void theaterChase(byte red, byte green, byte blue, int SpeedDelay) {
  for (int j=0; j<10; j++) {  //do 10 cycles of chasing
    for (int q=0; q < 3; q++) {
      //replacing NUM_LEDS with 16
      for (int i=0; i < 16-3; i=i+3) {
        setPixel(i+q, red, green, blue);    //turn every third pixel on
      }
      showStrip();
     
      delay(SpeedDelay);
     //replacing NUM_LEDS with 16
      for (int i=0; i < 16-3; i=i+3) {
        setPixel(i+q, 0,0,0);        //turn every third pixel off
      }
    }
  }
}

void colorWipe(byte red, byte green, byte blue, int SpeedDelay) {
  //replacing NUM_LEDS with 16
  for(uint16_t i=0; i<16; i++) {
      setPixel(i, red, green, blue);
      showStrip();
      delay(SpeedDelay);
  }
}


void fadeToBlack(int ledNo, byte fadeValue) {
   leds_array[ledNo].fadeToBlackBy( fadeValue );

}

void rainbowCycle(int SpeedDelay) {
  byte *c;
  uint16_t i, j;

  for(j=0; j<256*1; j++) { // 5 cycles of all colors on wheel
    for(i=16; i< 65; i++) {
      c=Wheel(((i * 256 / 65) + j) & 255);
      setPixel(i, *c, *(c+1), *(c+2));
    }
    showStrip();
    delay(SpeedDelay);
  }
}

byte * Wheel(byte WheelPos) {
  static byte c[3];
 
  if(WheelPos < 85) {
   c[0]=WheelPos * 3;
   c[1]=255 - WheelPos * 3;
   c[2]=0;
  } else if(WheelPos < 170) {
   WheelPos -= 85;
   c[0]=255 - WheelPos * 3;
   c[1]=0;
   c[2]=WheelPos * 3;
  } else {
   WheelPos -= 170;
   c[0]=0;
   c[1]=WheelPos * 3;
   c[2]=255 - WheelPos * 3;
  }

  return c;
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
        leds_array[i] = CRGB::Blue;
      FastLED.show();
      deviceConnected = true;


    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      //Turn off lights
      for(int i=0;i<16;i++)
        leds_array[i] = CRGB::Black;
      FastLED.show();

      delay(500); // give the bluetooth stack the chance to get things ready
      pServer->startAdvertising(); // restart advertising
      Serial.println("start advertising");
      Serial.println("Waiting a client...");
  
    }
};

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      rxValue = pCharacteristic->getValue();
        Serial.println("GOT something");
          // A -> start race LAP
          // D -> start race DRAG
          // C -> start race COUNTDOWN
        // Y -> end race
        if ((rxValue[0]=='A')||(rxValue[0]=='D')||(rxValue[0]=='C'))
        {
          got_start=true;
          RaceType = rxValue[0];
          Serial.println("START RACE");
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
                        BLECharacteristic::PROPERTY_NOTIFY|BLECharacteristic::PROPERTY_READ|BLECharacteristic::PROPERTY_WRITE_NR|BLECharacteristic::PROPERTY_WRITE
                      );
   int moshe=0;  
   pCharacteristic->setValue("aaa");
    
    BLE2902 *desc = new BLE2902();
    desc->setNotifications(true);
    pCharacteristic->addDescriptor(desc);
    
    BLECharacteristic *pCharacteristic = pService->createCharacteristic(
                                           CHARACTERISTIC_UUID_RX,
                                           BLECharacteristic::PROPERTY_READ |
                                           BLECharacteristic::PROPERTY_WRITE_NR | 
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


  
    FastLED.addLeds<NEOPIXEL, DATA_PIN>(leds_array, NUM_LEDS);  // GRB ordering is assumed
    FastLED.setBrightness(20);



    //Blink Led sttrip during setup
    for (int i = 16; i <= 118; i++) 
      leds_array[i] = CRGB::Green;     
    FastLED.show();  
                  
    colorWipe(0x00,0xff,0x00, 40);    
    colorWipe(0x00,0x00,0x00, 40);
    
    for (int i = 16; i <= 118; i++) 
      leds_array[i] = CRGB::Black;     
    FastLED.show();  
        
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
  if (got_start==false)
  {
    if (deviceConnected==false)
    {
      //Searching animation
      
      //Reset counter
      if (searchAnimationCounter==16)
      {
          searchAnimationCounter=0;
          leds_array[searchAnimationCounter] = CRGB::Blue;
          FastLED.show();
          delay(200);  
      }   
      //Change led to next one
      leds_array[searchAnimationCounter] = CRGB::Black;
      searchAnimationCounter++;
      leds_array[searchAnimationCounter] = CRGB::Blue;
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
        if ((RaceType=='C')&&(lap_counter>0))
        {
           LapTimeLeft = InitialMaxLapTime - elapsedMillis/1000;
           if (lap_counter==1)
            LapTimeLeft = LapTimeLeft + 1;
           Serial.print("LapTimeLeft: ");
           Serial.println(LapTimeLeft);
      
           if (LapTimeLeftPreviousSecond > LapTimeLeft)
           {
               display.showNumber(LapTimeLeft,false, 2, 1);
               LapTimeLeftPreviousSecond = LapTimeLeft; 
               if ( LapTimeLeft < 4)
                  tone(BUZZER_PIN, NOTE_C2, 100, BUZZER_CHANNEL);
               
           }    
           if ((LapTimeLeft < 1) || (lap_counter>16))
               raceIsOn = false;
  
          if (lap_counter>16)
             display.showString("HOHO");
  
  
        }   
           
        //We need to make sure at least 1 second from the previous lap
        if (
              (sensorValue + 150 < sensor_min_value )
              &&
              (
                (elapsedMillis>1000)&&((currentMillis-CarLeaveFinishMillis)>1000) 
                ||
                (lap_counter==0)
              ) 
            )
        {
          //We have a lap!
          //reset time
          startMillis = millis();   
          Serial.print("We have a lap! count: ");
          lap_counter++;
          Serial.println(lap_counter);
          if (RaceType=='C')
            LapTimeLeftPreviousSecond = InitialMaxLapTime;
          if ((lap_counter==1)&&(RaceType!='D'))
          {
            display.showString("----");
  
            //Blink white
            for (int i = 0; i <= 16; i++) 
              leds_array[i] = CRGB::White;       
            FastLED.show();   
            delay(300);          
            for (int i = 0; i <= 16; i++) 
              leds_array[i] = CRGB::Black;       
            FastLED.show();               
            delay(300);  
              
  
            //Lights off during the race
            for(int i=0;i<16;i++)
              leds_array[i] = CRGB::Black;
            FastLED.show();
            
          }
          //Build the BLE string we are going to send by digits 1)lap number 2) time in miliseconds (without the last digit) 
  
          //60 seconds is the max
          if (elapsedMillis>59999)
              elapsedMillis=59999;
  
          int moshe = lap_counter*10000;
          moshe = moshe + elapsedMillis/10;    
          
          //pCharacteristic->setValue(testrxValue);
          char txString[4]="bbb";
          pCharacteristic->setValue("alex");

          pCharacteristic->notify();
          Serial.println("MOSHE NOTIFY");
          int elapsedSeconds = elapsedMillis/10;
          //If this is a drag race we want to show the time during the first lap as well
          if ((lap_counter>1)||(RaceType=='D'))
          {
            //in countdown we don't show lap times, the loop will take care of this
            if (RaceType=='C')
              InitialMaxLapTime = InitialMaxLapTime - 1;
            else  
              display.showNumberDec(elapsedSeconds, (0x80 >> 1), false);
            if (RaceType=='D')            
            {
              //If we are here drag race is over!
              raceIsOn = false;
            }
  
          }  
          
        }
  
        //We need to check if we had at least one second when there was no car at the sensor so we save the time sensor felt it for the last time 
        if ((sensorValue + 150 < sensor_min_value))
          CarLeaveFinishMillis = currentMillis; 
  
        
      }
    }
  }
  else
  {
      //We need to start a race!  
      got_start=false;  
      //int peleg = 999;     
      //pCharacteristic->setValue(peleg);
      //pCharacteristic->notify();   
      //Serial.println("PELEG NOTIFY");  
             
      if (RaceType=='C')
      {
         char bufferLap[2];
         bufferLap[0] = rxValue[1];
         bufferLap[1] = rxValue[2];
         InitialMaxLapTime = atoi(bufferLap);
         LapTimeLeftPreviousSecond = InitialMaxLapTime;
         Serial.println("InitialMaxLapTime: ");
         Serial.print(InitialMaxLapTime);
      }   
      Serial.println("Race type: ");
      Serial.print(RaceType);

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
      for(int i=0;i<118;i++)
        leds_array[i] = CRGB::Red;
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
      for(int i=0;i<118;i++)
        leds_array[i] = CRGB::Yellow;
      FastLED.show();
      tone(BUZZER_PIN, NOTE_B4, 250, BUZZER_CHANNEL);
      noTone(BUZZER_PIN, BUZZER_CHANNEL);
      delay(1000);          
      //==1==
      display.showString("RACE");
      tone(BUZZER_PIN, NOTE_G5, 250, BUZZER_CHANNEL);
      noTone(BUZZER_PIN, BUZZER_CHANNEL);
      
      for(int i=0;i<118;i++)
        leds_array[i] = CRGB::Green;
      FastLED.show();         
      
      //Start the time
      startMillis = millis();
      raceIsOn = true;

     if (rxValue[0]=='L')
    {                     
      String led_string = getValue(rxValue.c_str(), 'L', 1);
      String led_string2;

      if(led_string.indexOf("B") > 0)          
        led_string2 = getValue(led_string, 'B', 0);
      else          
        led_string2 = getValue(led_string, 'R', 0);
                  
      int led_int = led_string2.toInt() -2 ;

      //We will be getting: 'L' + Lap number + lapType (B/R);
      if (RaceType=='C')
      {
        //Save the array
        for (int i = 0; i <= 16; i++) 
          leds_saving[i] = leds_array[i];
          
        //Blink white
        for (int i = 0; i <= 16; i++) 
          leds_array[i] = CRGB::White;       
        FastLED.show();   
        delay(300);          
        for (int i = 0; i <= 16; i++) 
          leds_array[i] = CRGB::Black;       
        FastLED.show();               
        delay(300);         


        //Restore the array
        for (int i = 0; i <= 16; i++) 
          leds_array[i] = leds_saving[i];
          
        //countdown should only display one led not two
        leds_array[led_int] = CRGB::Purple;

        FastLED.show();                 
      }
      else
      {
        if (rxValue[2]=='B')
        {
          //Save the array
          for (int i = 0; i <= 16; i++) 
            leds_saving[i] = leds_array[i];
          
          //Blink Yellow
          for (int i = 0; i <= 16; i++) 
            leds_array[i] = CRGB::Yellow;       
          FastLED.show();   
          delay(300);          
          for (int i = 0; i <= 16; i++) 
            leds_array[i] = CRGB::Yellow;      
          FastLED.show();   
          
          delay(300);  

          //Restore the array
          for (int i = 0; i <= 16; i++) 
            leds_array[i] = leds_saving[i];
            
          leds_array[led_int] = CRGB::Yellow;
          leds_array[led_int+8] = CRGB::Yellow;                
          FastLED.show();   
        }
        else
        {
          //Save the array
          for (int i = 0; i <= 16; i++) 
            leds_saving[i] = leds_array[i];
                          
          //Blink Green
          for (int i = 0; i <= 16; i++) 
            leds_array[i] = CRGB::Green;       
          FastLED.show();   
          delay(300);          
          for (int i = 0; i <= 16; i++) 
            leds_array[i] = CRGB::Green;      
          FastLED.show();   

          //Restore the array
          for (int i = 0; i <= 16; i++) 
            leds_array[i] = leds_saving[i];              
          delay(300);                
          leds_array[led_int] = CRGB::Green;
          leds_array[led_int+8] = CRGB::Green;           
          FastLED.show();
        }                 
      }  



    }
    else if (rxValue[0]=='F') // F -> like L but final lap
    {             
      raceIsOn = false;
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
        leds_array[led_int] = CRGB::Yellow;
        leds_array[led_int+8] = CRGB::Yellow;            
      }
      else
      {
        leds_array[led_int] = CRGB::Green;
        leds_array[led_int+8] = CRGB::Green;           
      }                 
      FastLED.show();
      //Since this is the final lap we need to play Finish sequence

      //If this is a LAP race after the end sequence we will show again the laps colors at the end
      if (RaceType == 'A')
      {
        //Save the array
        for (int i = 0; i <= 16; i++) 
          leds_saving[i] = leds_array[i];

        //Clear Leds
        for (int i = 0; i <= 16; i++) 
          leds_array[i] = CRGB::Black;       
        FastLED.show();   
        //Play finish sequence
        theaterChase(0xff,0xff,0xff,50);

        //LED Strip finish sequence                        
        //TODO
        
        //Restore the array
        for (int i = 0; i <= 16; i++) 
          leds_array[i] = leds_saving[i];
        delay(2000);          
        FastLED.show();              
        Serial.println("Restoring");
      }
      else
        //Clear Leds
        for (int i = 0; i <= 16; i++) 
          leds_array[i] = CRGB::Black;       
        FastLED.show();  
        theaterChase(0xff,0xff,0xff,50);
        //LED Strip finish sequence                        
        rainbowCycle(20);            
    }  
  }
  delay(5);


}
