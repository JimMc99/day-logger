# Baby Logger

## Prerequisites

You will need `docker` installed for this project to work.

## To get up and running

Before all, you will need to create a `.env` file with the following:
```
POSTGRES_USER=someuser
POSTGRES_PASSWORD=somepassword
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=somedb
```
Of course, change the user, password and db to whatever you want.

To run:
`docker compose up --build`

To stop:
`docker compose down`

If you need to directly enter the database:
`docker compose exec db psql -U someuser -d somedb`
(with someuser and somedb whatever you have in your .env)

## Every once in a while (with caution)...

First make sure you are running all containers and things you want to keep (otherwise the next step will nuke it).

Then clear out unused cache with:
`docker system prune -a --volumes`

And then check with:
`docker system df`
