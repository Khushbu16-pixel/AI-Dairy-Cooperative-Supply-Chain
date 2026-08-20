import os
import requests

WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID", "")
WATSONX_API_KEY = os.getenv("WATSONX_API_KEY", "")
WATSONX_URL = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")

def is_watsonx_configured():
    return bool(WATSONX_API_KEY and WATSONX_PROJECT_ID and WATSONX_API_KEY != "your-api-key-here")

def get_iam_token(api_key):
    """Retrieve IAM token from IBM Cloud."""
    url = "https://iam.cloud.ibm.com/identity/token"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = f"grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey={api_key}"
    response = requests.post(url, headers=headers, data=data, timeout=10)
    response.raise_for_status()
    return response.json().get("access_token")

def generate_watsonx_insight(prompt_text, max_tokens=150):
    """
    Generate insight using IBM Watsonx foundation model if configured.
    Falls back safely to None if not configured or in case of error.
    """
    if not is_watsonx_configured():
        return None

    try:
        token = get_iam_token(WATSONX_API_KEY)
        endpoint = f"{WATSONX_URL.rstrip('/')}/ml/v1/text/generation?version=2023-05-29"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {token}"
        }
        payload = {
            "model_id": "ibm/granite-3-8b-instruct",
            "input": prompt_text,
            "parameters": {
                "decoding_method": "greedy",
                "max_new_tokens": max_tokens,
                "temperature": 0.2
            },
            "project_id": WATSONX_PROJECT_ID
        }
        resp = requests.post(endpoint, headers=headers, json=payload, timeout=15)
        if resp.status_code == 200:
            results = resp.json().get("results", [])
            if results:
                return results[0].get("generated_text", "").strip()
    except Exception as e:
        print(f"[WARN] Watsonx API generation failed: {e}")
    return None
