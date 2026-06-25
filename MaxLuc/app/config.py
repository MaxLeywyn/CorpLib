import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:230903@localhost:5432/CorpLibrary'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False