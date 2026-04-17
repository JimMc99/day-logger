# Day Logger

## To get up and running

Before all, you will need a .env file with the following:
POSTGRES_USER=someuser
POSTGRES_PASSWORD=somepassword
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=somedb
Of course, change the user, password and db to whatever you want.

First time to generate the initial (empty) volume:
docker volume rm day_logger_postgres_data
docker volume create day_logger_postgres_data

To run:
docker compose up --build

To stop:
docker compose down -v

If you need to directly enter the database:
docker exec -it day_logger-db-1 psql -U someuser -d somedb
(with someuser and somedb whatever you have in your .env)

## Every once in a while (with caution)...

First make sure you are running all containers and things you want to keep (otherwise the next step will nuke it).

Then clear out unused cache with:
docker system prune -a --volumes

And then check with:
docker system df
