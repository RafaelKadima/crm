
import requests
import os
import json

BASE_URL = "http://localhost:8001/api/internal"
HEADERS = {
    "X-Internal-Key": "sb-internal-secret-key-123",
    "X-Tenant-ID": "test-tenant-1",
    "Content-Type": "application/json"
}

def test_config():
    print(f"Testing Config Endpoint: {BASE_URL}/bi/config/settings")
    try:
        response = requests.get(f"{BASE_URL}/bi/config/settings", headers=HEADERS)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

def test_sdr_script_update():
    print(f"\nTesting SDR Script Update: {BASE_URL}/sdr/config/script")
    try:
        payload = {"script": "New sales script content"}
        response = requests.post(f"{BASE_URL}/sdr/config/script", headers=HEADERS, json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

def test_training_data():
    print(f"\nTesting Training Data: {BASE_URL}/bi/leads/training-data")
    try:
        response = requests.get(f"{BASE_URL}/bi/leads/training-data", headers=HEADERS, params={"limit": 5})
        print(f"Status: {response.status_code}")
        # Not printing full body as it might be large or empty, just a check
        if response.status_code == 200:
             print("Success")
        else:
             print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # test_config()
    test_sdr_script_update()
    test_training_data()
