# PieBoard Server

The PieBoard Server can be ran in a Docker container, an example docker-compose entry is given below:
```yaml
    pieboard:
        image: pieboard
        restart: unless-stopped
        ports:
            - "3000:3000"
        environment:
            - AD_URL=[active directory url]
            - AD_BASEDN=[active directory basedn]
            - AD_USERNAME=[pieboard active directory username]
            - AD_PASSWORD=[pieboard active directory password]
            - PI_AUTH_GROUP=[pieboard active directory group for users]
            - PI_PORT=3000 (default, not required)
            - DEFUALT_TIME=10 (default, not required)
            - IP=[pieboard server IP]
        volumes:
            - $PWD/pieboard:/usr/src/app/data
```
`PI_PORT` and `DEFAULT_TIME` will default to `3000` and `10` (seconds) respectively.