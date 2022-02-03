#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ESP32Servo.h>
#include <FastLED.h>

// How many leds in your strip?
#define NUM_LEDS 1
#define DATA_PIN 27
CRGB leds[NUM_LEDS];

Servo servo1;
Servo servo2;
// Published values for SG90 servos; adjust if needed
int minUs = 1000;
int maxUs = 2000;
//pins
int ServoSpeed = 18;
int ServoSteering = 19;
int pos = 0;      // position in degrees
ESP32PWM pwm;

//Driving global varaibles
int speed_value=0;
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

      deviceConnected = true;
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
    }
};

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      std::string rxValue = pCharacteristic->getValue();

      if (rxValue.length() > 0) {
        counter++;
        //Serial.println("AAAA*********");
        //Serial.println(rxValue.c_str());

        String speed_string = getValue(rxValue.c_str(), 'S', 0);
        speed_value = speed_string.toInt();

        String acc_string = getValue(rxValue.c_str(), 'S', 1);
        float acc_float = acc_string.toFloat() ;
        int acc_int = acc_float*100; 
        steering_value = map(acc_int, -1000, 1000, 0, 180);
        Serial.print("speed");
        Serial.println(speed_value);
        Serial.print("Steering");
        Serial.println(steering_value);
        //Serial.println(counter);

        servo1.write(speed_value);
        servo2.write(steering_value);

      }
    }
};


void setup() {
  Serial.begin(115200);
  FastLED.addLeds<WS2812B, 27>(leds, NUM_LEDS);  // GRB ordering is assumed
  FastLED.setBrightness(50);
  leds[0] = CRGB::Blue;
  FastLED.show();
  // Create the BLE Device
  BLEDevice::init("ESP32"); // Name must not be longer than 5 chars!!!
  
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

  BLE2902 *desc = new BLE2902();
  desc->setNotifications(true);
  pCharacteristic->addDescriptor(desc);
  
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
                                         CHARACTERISTIC_UUID_RX,
                                         BLECharacteristic::PROPERTY_WRITE
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
  servo1.setPeriodHertz(50);      // Standard 50hz servo
  servo1.attach(ServoSpeed, minUs, maxUs);
  servo2.attach(ServoSteering, minUs, maxUs);
  pwm.attachPin(27, 10000);//10khz
  servo1.write(90);
  //delay(1000);
  //servo1.write(90);
  //delay(1000);
  //servo1.write(180);

  
  
}

void loop() {

  //if (deviceConnected) {}
  delay(1);
}
