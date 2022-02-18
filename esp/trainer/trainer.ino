#include "FastLED.h"
#define NUM_LEDS 60
#define DATA_PIN 33

 

// Define the array of leds
CRGB leds[NUM_LEDS];

void setup() {
    FastLED.addLeds<NEOPIXEL, DATA_PIN>(leds, NUM_LEDS);  // GRB ordering is assumed
    FastLED.setBrightness(50);
}

void loop() {

leds[0] = CRGB::Blue;
leds[1] = CRGB::Blue;
leds[2] = CRGB::Blue;
leds[3] = CRGB::Blue;
leds[4] = CRGB::Blue;
leds[5] = CRGB::Blue;
leds[6] = CRGB::Blue;
leds[7] = CRGB::Blue;

leds[8] = CRGB::Black;
leds[9] = CRGB::Black;
leds[10] = CRGB::Black;
leds[11] = CRGB::Black;
leds[12] = CRGB::Black;
leds[13] = CRGB::Black;
leds[14] = CRGB::Black;
leds[15] = CRGB::Black;
// Show the leds
FastLED.show();

delay(1000);

leds[0] = CRGB::Black;
leds[1] = CRGB::Black;
leds[2] = CRGB::Black;
leds[3] = CRGB::Black;
leds[4] = CRGB::Black;
leds[5] = CRGB::Black;
leds[6] = CRGB::Black;
leds[7] = CRGB::Black;

leds[8] = CRGB::Blue;
leds[9] = CRGB::Blue;
leds[10] = CRGB::Blue;
leds[11] = CRGB::Blue;
leds[12] = CRGB::Blue;
leds[13] = CRGB::Blue;
leds[14] = CRGB::Blue;
leds[15] = CRGB::Blue;


FastLED.show();
// Wait a little bit before we loop around and do it again
delay(1000);


}
