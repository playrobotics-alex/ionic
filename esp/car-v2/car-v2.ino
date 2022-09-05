#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ESP32Servo.h>
#include <FastLED.h>



// How many leds in your strip?
#define NUM_LEDS 1
#define DATA_PIN 27
#define MOTOR_SPEED 21
#define MOTOR_DIR 22
CRGB leds[NUM_LEDS];

// Setting PWM properties
const int freq = 22000;
const int pwmChannel = 14;
const int resolution = 8;
int dutyCycle = 200;


Servo servo1;
Servo servo2;
// Published values for SG90 servos; adjust if needed
int minUs = 1000;
int maxUs = 2000;
//pins
int ServoSpeed = 32;
int ServoSteering = 25;
int pos = 0;      // position in degrees
ESP32PWM pwm;

//Driving global varaibles
int speed_value=0;
int mapped_speed=0;
int steering_value=90;

int counter=0;
BLECharacteristic *pCharacteristic;
bool deviceConnected = false;
uint8_t txValue = 50;

// See the following for generating UUIDs:
// https://www.uuidgenerator.net/

#define SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E" // UART service UUID
#define CHARACTERISTIC_UUID_RX "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_TX "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

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
          leds[0] = CRGB::Blue;
          FastLED.show();
          deviceConnected = true;
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      leds[0] = CRGB::White;
      FastLED.show();
      delay(500); // give the bluetooth stack the chance to get things ready
      pServer->startAdvertising(); // restart advertising
      Serial.println("start advertising");

        // Start the service
      //pService->start();
      //pServer->getAdvertising()->addServiceUUID(SERVICE_UUID);
      // Start advertising
      //pServer->getAdvertising()->start();
      //Serial.println(pService->getUUID().toString().c_str());
      Serial.println("Waiting a client connection to not166ify...");
  
    }
};

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      std::string rxValue = pCharacteristic->getValue();

        Serial.println("AAAA*********");
        Serial.println(rxValue.c_str());
        if (rxValue[0]=='X')
        {
          //Settings transmition
          if (rxValue[1]=='1')
          {
            //Lights on
            leds[0] = CRGB::Blue;
            FastLED.show();
          }
          else
          {
            //Lights off
            leds[0] = CRGB::Black;
            FastLED.show();
          }
        }
        else
        {
          //Driving data transmition
          String speed_string = getValue(rxValue.c_str(), 'S', 0);
          speed_value = speed_string.toInt();
          Serial.print("speed: ");
          Serial.println(speed_value);
          //servo1.write(speed_value);
          if (speed_value>90)
          {
            //Reverse
            mapped_speed = map(speed_value, 90, 180, 160, 255);
            if (mapped_speed>125)
            {
              digitalWrite( MOTOR_DIR, LOW );             
              //analogWrite( MOTOR_SPEED, mapped_speed );     
              ledcWrite(pwmChannel, mapped_speed); 
            }  
            else
            {
              digitalWrite( MOTOR_DIR, LOW );              
              ledcWrite(pwmChannel, 0);    
            }
          }
          else
          {
            if (speed_value<90)
            {
              //Forward
              mapped_speed = map(speed_value, 0, 90, 255, 160);
              if (mapped_speed>125)
              {
                digitalWrite( MOTOR_DIR, HIGH );
                //analogWrite( MOTOR_SPEED, mapped_speed );                   
                ledcWrite(pwmChannel, 255-mapped_speed);     
              }
              else
              {
                digitalWrite( MOTOR_DIR, LOW );              
                ledcWrite(pwmChannel, 0);    
              }
            }
            else
            {
              //If=90 -> Stop motor
              //digitalWrite( MOTOR_DIR, HIGH );
              //digitalWrite( MOTOR_SPEED, HIGH );
              digitalWrite( MOTOR_DIR, LOW );              
              ledcWrite(pwmChannel, 0);
              //delay(100);
              //digitalWrite( MOTOR_SPEED, HIGH );                   
              Serial.print("STOP ");
            }
          }
          
          Serial.print("mapped speed: ");
          Serial.println(mapped_speed);

          String steering_string = getValue(rxValue.c_str(), 'S', 1);
          Serial.println(steering_string);
          
          int steering_int = steering_string.toInt() ;

          //maybe map steering?
          //steering_value = map(acc_int*1, -100, 100, 0, 180);

          Serial.print("Steering: ");
          Serial.println(steering_int);

          servo2.write(steering_int);
        }          

  
    }
};





void setup() {
  Serial.begin(115200);
  pinMode(MOTOR_SPEED,OUTPUT);
  pinMode(MOTOR_DIR,OUTPUT);
  
  // configure LED PWM functionalitites
  ledcSetup(pwmChannel, freq, resolution);  
  // attach the channel to the GPIO to be controlled
  ledcAttachPin(MOTOR_SPEED, pwmChannel);

  
    
  FastLED.addLeds<WS2812B, 27>(leds, NUM_LEDS);  // GRB ordering is assumed
  FastLED.setBrightness(50);
  leds[0] = CRGB::White;
  FastLED.show();
  // Create the BLE Device
  BLEDevice::init("PR*Honda Civic Type R*002"); // Name must not be longer than 5 chars!!!
  
  // Create the BLE Server
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create the BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);
  
  // Create a BLE Characteristic
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID_TX,
                      BLECharacteristic::PROPERTY_NOTIFY|BLECharacteristic::PROPERTY_READ|BLECharacteristic::PROPERTY_WRITE_NR  
                    );

  BLE2902 *desc = new BLE2902();
  desc->setNotifications(true);
  pCharacteristic->addDescriptor(desc);
  
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
                                         CHARACTERISTIC_UUID_RX,
                                         BLECharacteristic::PROPERTY_WRITE_NR
                                       );
  pCharacteristic->setReadProperty(true);
  pCharacteristic->setCallbacks(new MyCallbacks());

  // Start the service
  pService->start();
  pServer->getAdvertising()->addServiceUUID(SERVICE_UUID);
  // Start advertising
  pServer->getAdvertising()->start();
  Serial.println(pService->getUUID().toString().c_str());
  Serial.println("Waiting a client connection to not166ify...");


  //Servos 
  // Allow allocation of all timers
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  //ESP32PWM::allocateTimer(2);
  //ESP32PWM::allocateTimer(3);
  Serial.begin(115200);
  //servo1.setPeriodHertz(50);      // Standard 50hz servo
  servo2.setPeriodHertz(50);      // Standard 50hz servo
  //servo1.setPeriodHertz(50);      // Standard 50hz servo
  //servo1.attach(ServoSpeed, minUs, maxUs);
  servo2.attach(ServoSteering, minUs, maxUs);
  pwm.attachPin(27, 10000);//10khz
  //servo1.write(90);
  //Stop motor
  digitalWrite( MOTOR_DIR, LOW );
  digitalWrite( MOTOR_SPEED, LOW );
  
  //delay(1000);
  //servo1.write(90);
  //delay(1000);
  //servo1.write(180);

  
  
}

void loop() {

  //if (deviceConnected) {}
  delay(1);
}
