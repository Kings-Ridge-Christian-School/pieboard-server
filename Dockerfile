FROM node:14-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache ffmpeg imagemagick

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000
CMD [ "node", "app.js" ]