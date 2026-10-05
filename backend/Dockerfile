FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .

RUN apt-get update && apt-get install -y libpq-dev gcc && \
    pip install --no-cache-dir -r requirements.txt && \
    apt-get clean

COPY . .

# Wait for DB, then migrate and run server. Normally done with wait-for-it, using simple command here for compatibility
CMD python manage.py migrate && python manage.py runserver 0.0.0.0:8080
