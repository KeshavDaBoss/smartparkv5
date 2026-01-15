#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#define SPEED_OF_SOUND 0.034
#define DIST_THRESHOLD 10.0

const char* ssid = "yashjo 5G";
const char* password = "Yashjo@1129";
const char* piEndpoint = "http://192.168.29.185:8000/api/esp32/update";

const int trigPins[] = {13, 12, 14, 27};
const int echoPins[] = {33, 32, 35, 34};
const int ledPins[]  = {25, 26};

long readDistance(int trig, int echo) {
  long readings[5];

  for (int i = 0; i < 5; i++) {
    digitalWrite(trig, LOW);
    delayMicroseconds(2);
    digitalWrite(trig, HIGH);
    delayMicroseconds(10);
    digitalWrite(trig, LOW);

    long duration = pulseIn(echo, HIGH, 25000);
    readings[i] = (duration == 0) ? 999 : (duration * SPEED_OF_SOUND / 2);
    delay(10);
  }

  // sort for median
  for (int i = 0; i < 5; i++)
    for (int j = i + 1; j < 5; j++)
      if (readings[j] < readings[i]) {
        long t = readings[i];
        readings[i] = readings[j];
        readings[j] = t;
      }

  return readings[2];
}

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < 4; i++) {
    pinMode(trigPins[i], OUTPUT);
    pinMode(echoPins[i], INPUT);
  }

  for (int i = 0; i < 2; i++) {
    pinMode(ledPins[i], OUTPUT);
    digitalWrite(ledPins[i], LOW);
  }

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) return;

  StaticJsonDocument<256> doc;
  JsonObject slots = doc.createNestedObject("slots");

  for (int i = 0; i < 4; i++) {
    long d = readDistance(trigPins[i], echoPins[i]);
    bool occupied = d < DIST_THRESHOLD;
    String slotId = "M2-L1-S" + String(i + 1);
    slots[slotId] = occupied;
  }

  doc["device_id"] = "mall2-esp32";

  HTTPClient http;
  http.begin(piEndpoint);
  http.addHeader("Content-Type", "application/json");

  String payload;
  serializeJson(doc, payload);
  http.POST(payload);
  http.end();

  delay(1500);
}
