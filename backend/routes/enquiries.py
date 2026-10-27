
import os
from contextlib import contextmanager
from uuid import UUID, uuid4

import psycopg
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field
from psycopg.rows import dict_row

from services.categorization import categorize_enquiry

load_dotenv()

router = APIRouter(prefix="/api/enquiries", tags=["Enquiries"])

VALID_STATUSES = {"New", "In Progress", "Resolved"}


@contextmanager
def get_db():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise HTTPException(
            status_code=500,
            detail="DATABASE_URL is not configured",
        )

    try:
        with psycopg.connect(
            database_url,
            connect_timeout=5,
            row_factory=dict_row,
        ) as connection:
            yield connection
    except psycopg.Error:
        raise HTTPException(
            status_code=503,
            detail="Database operation failed. Check backend configuration.",
        )


class EnquiryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    message: str = Field(min_length=1, max_length=10000)


class EnquiryUpdate(BaseModel):
    status: str


def clean_text(value: str) -> str:
    return value.strip()


def get_enquiry(enquiry_id: str):
    with get_db() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM public.enquiries WHERE id = %s",
                (enquiry_id,),
            )
            return cursor.fetchone()


def run_categorization(enquiry_id: str, message: str):
    category, state = categorize_enquiry(enquiry_id, message)

    with get_db() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE public.enquiries
                SET category = %s, categorization_state = %s
                WHERE id = %s
                """,
                (category, state, enquiry_id),
            )


@router.post("", status_code=201)
def create_enquiry(payload: EnquiryCreate):
    name = clean_text(payload.name)
    email = str(payload.email).strip()
    message = clean_text(payload.message)

    if not name or not email or not message:
        raise HTTPException(
            status_code=422,
            detail="Name, email, and message cannot be blank",
        )

    enquiry_id = str(uuid4())

    # Save the enquiry before calling the mock AI service.
    with get_db() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO public.enquiries
                    (id, name, email, message, status, category,
                     categorization_state)
                VALUES (%s, %s, %s, %s, 'New', NULL, 'Pending')
                """,
                (enquiry_id, name, email, message),
            )

    # If AI fails, keep the saved enquiry and mark categorization Failed.
    run_categorization(enquiry_id, message)

    return get_enquiry(enquiry_id)


@router.get("")
def list_enquiries(
    status: str | None = Query(default=None),
):
    if status is not None and status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Status must be New, In Progress, or Resolved",
        )

    with get_db() as connection:
        with connection.cursor() as cursor:
            if status:
                cursor.execute(
                    """
                    SELECT * FROM public.enquiries
                    WHERE status = %s
                    ORDER BY created_at DESC
                    """,
                    (status,),
                )
            else:
                cursor.execute(
                    """
                    SELECT * FROM public.enquiries
                    ORDER BY created_at DESC
                    """
                )

            return cursor.fetchall()


@router.patch("/{enquiry_id}")
def update_enquiry(enquiry_id: UUID, payload: EnquiryUpdate):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Status must be New, In Progress, or Resolved",
        )

    with get_db() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE public.enquiries
                SET status = %s
                WHERE id = %s
                RETURNING *
                """,
                (payload.status, str(enquiry_id)),
            )
            enquiry = cursor.fetchone()

    if enquiry is None:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    return enquiry


@router.post("/{enquiry_id}/retry")
def retry_categorization(enquiry_id: UUID):
    enquiry = get_enquiry(str(enquiry_id))

    if enquiry is None:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    if enquiry["categorization_state"] == "Completed":
        raise HTTPException(
            status_code=409,
            detail="Categorization has already completed",
        )

    run_categorization(str(enquiry_id), enquiry["message"])
    return get_enquiry(str(enquiry_id))
