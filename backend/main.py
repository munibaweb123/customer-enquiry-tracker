
from fastapi import FastAPI

from routes.enquiries import router as enquiries_router
from routes.health import router as health_router

app = FastAPI(title="Customer Enquiry Tracker API")

app.include_router(health_router)
app.include_router(enquiries_router)


@app.get("/")
def home():
    return {"message": "Customer Enquiry Tracker API is running"}
