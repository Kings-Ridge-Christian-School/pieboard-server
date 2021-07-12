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

The current system uses Active Directory for authentication. `AD_USERNAME` and `AD_PASSWORD` would not be the username and password of a user accessing PieBoard, but instead a username and password for PieBoard to verify logins. The `PI_AUTH_GROUP` would be the group in Active Directory that a user must have to be able to access PieBoard.

The IP will be the IP address PieBoard clients try to access, if this is not set properly, devices will get updated manifest lists but will not be able to get any slides.

PieBoard works behind a reverse proxy, but the new port will have to be defined. In order to use a reverse proxy, the `IP` will need to be set to the new url/IP, and another environment variable named `PROXY_PORT` needs to be added. This port is different from `PI_PORT` since `PI_PORT` controls what the system listens on, while PROXY_PORT is what is told to PieBoard clients.