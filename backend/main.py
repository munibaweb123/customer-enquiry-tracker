from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.enquiries import router as enquiries_router
from routes.health import router as health_router

app = FastAPI(title="Customer Enquiry Tracker API")

# Allow the local Next.js frontend to call the FastAPI backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(health_router)
app.include_router(enquiries_router)


@app.get("/")
def home():
    return {"message": "Customer Enquiry Tracker API is running"}
