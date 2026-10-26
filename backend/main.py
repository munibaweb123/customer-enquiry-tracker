from fastapi import FastAPI

app = FastAPI(title="Customer Enquiry Tracker API")


@app.get("/")
def home():
    return {"message": "Customer Enquiry Tracker API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
