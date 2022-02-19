
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#include "FastLED.h"
#define NUM_LEDS 60
#define DATA_PIN 33

#include <melody_player.h>
#include <melody_factory.h>
int buzzerPin = 14;
MelodyPlayer player(buzzerPin, HIGH);

// Define the array of leds
CRGB leds[NUM_LEDS];

int sensor_start_value;
int sensor_min_value;
bool raceIsOn = false;
int lap_counter = 0;


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
          Serial.println("Connected");
          for(int i=0;i<16;i++)
            leds[i] = CRGB::Blue;
          FastLED.show();
          deviceConnected = true;
          String notes[] = { "C2", "G5" };
          Melody melody = MelodyFactory.load("Nice Melody", 175, notes, 2);
          player.playAsync(melody);
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
        // Z -> start race
        // Y -> end race
        if (rxValue[0]=='Z')
        {          
          raceIsOn = true;
          lap_counter = 0;
          Serial.println("GOT DATA Z -> Staring race");

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
          for(int i=0;i<16;i++)
            leds[i] = CRGB::Red;
          FastLED.show();
          String notes[] = { "B4" };
          Melody melody = MelodyFactory.load("Nice Melody", 175, notes, 1);
          player.playAsync(melody);
          delay(1000);

                    
          //==3==
          String notes3[] = { "B4" };
          melody = MelodyFactory.load("Nice Melody", 175, notes3, 1);
          player.playAsync(melody);
          delay(1000);
          
          //==2==
          for(int i=0;i<16;i++)
            leds[i] = CRGB::Yellow;
          FastLED.show();
          String notes2[] = { "B4" };
          melody = MelodyFactory.load("Nice Melody", 175, notes2, 1);
          player.playAsync(melody);
          delay(1000);
          
          //==1==
          for(int i=0;i<16;i++)
            leds[i] = CRGB::Green;
          FastLED.show();
          String notes1[] = { "G5" };
          melody = MelodyFactory.load("Nice Melody", 175, notes1, 1);
          player.playAsync(melody);

          //Start the time
          startMillis = millis();   

          delay(1000);  

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
 
 

  
    }
};


// ===================BLE end


void setup() {
   Serial.begin(9600);


  
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
    Serial.println("Waiting a client");


  
    FastLED.addLeds<NEOPIXEL, DATA_PIN>(leds, NUM_LEDS);  // GRB ordering is assumed
    FastLED.setBrightness(10);
    
    String notes[] = { "B4", "G3", "B5", "A3", "G3", "SILENCE", "B3", "C4" };
    Melody melody = MelodyFactory.load("Nice Melody", 175, notes, 8);
    player.playAsync(melody);
    Serial.println("The end!");

    for(int j=0;j<3;j++)
    {
      for(int i=0;i<16;i++)
        leds[i] = CRGB::White;
      FastLED.show();
      delay(400);
      for (int i=0;i<16;i++)
        leds[i] = CRGB::Black;
      FastLED.show();
        delay(400);
    }
    
    delay(1000);
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
        
      }

      //We need to check if we had at least one second when there was no car at the sensor so we save the time sensor felt it for the last time 
      if ((sensorValue + 150 < sensor_min_value))
        CarLeaveFinishMillis = currentMillis; 

      
    }
  }
  delay(10);


}
